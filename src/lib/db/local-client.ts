import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export { SESSION_COOKIE_NAME };

/**
 * Shim compatível com a API encadeável do cliente Supabase (.from().select()
 * .eq()...), mas executando contra SQLite local via better-sqlite3. Existe
 * para que os ~30 `actions.ts` e `page.tsx` do app não precisem mudar quando
 * rodando em modo desktop (APP_MODE=desktop) — só a implementação por trás
 * de `createClient()` muda. Ver local-db/migrations/0001_desktop_init.sql
 * para o schema espelhado e a convenção de tradução Postgres -> SQLite.
 */

// Colunas que guardam JSON serializado como TEXT (jsonb no Postgres).
const JSON_COLUMNS: Record<string, string[]> = {
  residents: ["residences", "family_contacts"],
  recurring_authorizations: ["weekday_schedule"],
  audit_logs: ["details"],
  access_logs: ["exit_photos"],
  correspondences: ["entry_photos"],
};

// Tabelas que só existem no app desktop — não entram na fila de sincronização.
const DESKTOP_ONLY_TABLES = new Set([
  "install_config",
  "outbox",
  "media_uploads",
  "sync_meta",
  "schema_version",
  "sessions",
  "pending_credentials",
]);

// Relacionamentos usados pelos `.select("*, alias:table(*)")` embutidos do
// app (equivalente a embedded resources do PostgREST). Cobre só o que
// realmente aparece no código: visitantes/prestadores -> morador responsável
// (hasOne) e access_logs -> destinos (hasMany). Filtros aninhados do tipo
// `.eq("destinations.resident_id", x)` (usados só no Portal do Morador,
// cloud-only) não são resolvidos aqui — fora do escopo do app desktop.
type Relationship =
  | { kind: "hasOne"; foreignKey: string; table: string }
  | { kind: "hasMany"; table: string; foreignKey: string };

const RELATIONSHIPS: Record<string, Record<string, Relationship>> = {
  visitors: { resident: { kind: "hasOne", foreignKey: "resident_id", table: "residents" } },
  service_providers: { resident: { kind: "hasOne", foreignKey: "resident_id", table: "residents" } },
  access_logs: { destinations: { kind: "hasMany", table: "access_log_destinations", foreignKey: "access_log_id" } },
};

interface SelectSpec {
  plainCols: string[] | "*";
  embeds: { alias: string; table: string; inner: boolean }[];
}

function parseSelectSpec(selectCols: string): SelectSpec {
  if (selectCols === "*") return { plainCols: "*", embeds: [] };

  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of selectCols) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());

  const plainCols: string[] = [];
  const embeds: SelectSpec["embeds"] = [];
  for (const part of parts) {
    const embedMatch = part.match(/^(\w+):(\w+)(!inner)?\(/);
    if (embedMatch) {
      embeds.push({ alias: embedMatch[1], table: embedMatch[2], inner: Boolean(embedMatch[3]) });
    } else if (part !== "*") {
      plainCols.push(part);
    }
  }
  return { plainCols: plainCols.length ? plainCols : "*", embeds };
}

// Tabelas com colunas created_at/updated_at (para preenchimento automático).
const TIMESTAMP_COLUMNS: Record<string, { created?: boolean; updated?: boolean }> = {
  companies: { created: true, updated: true },
  profiles: { created: true, updated: true },
  residents: { created: true, updated: true },
  visitors: { created: true, updated: true },
  service_providers: { created: true, updated: true },
  access_logs: { created: true },
  audit_logs: { created: true },
  notifications: { created: true },
  correspondences: { created: true, updated: true },
  recurring_authorizations: { created: true, updated: true },
  access_log_destinations: { created: true },
};

type Row = Record<string, unknown>;

interface PostgrestError {
  message: string;
  code: string;
  details?: string;
}

interface SelectOptions {
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
}

interface Cond {
  col: string;
  op: string;
  val: string;
  negate?: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseJsonColumns(table: string, row: Row): Row {
  const cols = JSON_COLUMNS[table];
  if (!cols) return row;
  const out = { ...row };
  for (const c of cols) {
    if (typeof out[c] === "string") {
      try {
        out[c] = JSON.parse(out[c] as string);
      } catch {
        // deixa como string se não for JSON válido
      }
    }
  }
  return out;
}

function stringifyJsonColumns(table: string, row: Row): Row {
  const cols = JSON_COLUMNS[table];
  if (!cols) return row;
  const out = { ...row };
  for (const c of cols) {
    if (c in out && typeof out[c] !== "string") {
      out[c] = JSON.stringify(out[c]);
    }
  }
  return out;
}

function likeToRegex(pattern: string, caseInsensitive: boolean): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, caseInsensitive ? "i" : "");
}

function applyCond(row: Row, c: Cond): boolean {
  const result = evalCond(row, c);
  return c.negate ? !result : result;
}

function evalCond(row: Row, c: Cond): boolean {
  const field = row[c.col];
  switch (c.op) {
    case "eq":
      return String(field ?? "") === c.val;
    case "neq":
      return String(field ?? "") !== c.val;
    case "gt":
      return field != null && field > c.val;
    case "gte":
      return field != null && field >= c.val;
    case "lt":
      return field != null && field < c.val;
    case "lte":
      return field != null && field <= c.val;
    case "is":
      return c.val === "null" ? field == null : String(field) === c.val;
    case "in": {
      const vals = c.val.replace(/^\(|\)$/g, "").split(",");
      return vals.includes(String(field ?? ""));
    }
    case "ilike":
      return likeToRegex(c.val, true).test(String(field ?? ""));
    case "like":
      return likeToRegex(c.val, false).test(String(field ?? ""));
    default:
      return true;
  }
}

/** Parser mínimo do formato de filtro `.or("a.eq.1,b.ilike.%x%")` do PostgREST. */
function parseOrExpr(expr: string): Cond[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of expr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);

  return parts.map((part) => {
    const firstDot = part.indexOf(".");
    const secondDot = part.indexOf(".", firstDot + 1);
    const col = part.slice(0, firstDot);
    const op = part.slice(firstDot + 1, secondDot);
    const val = part.slice(secondDot + 1);
    return { col, op, val };
  });
}

function toUniqueConstraintError(err: unknown): PostgrestError {
  const message = err instanceof Error ? err.message : String(err);
  if (/UNIQUE constraint failed/i.test(message)) {
    return { message, code: "23505", details: message };
  }
  if (/FOREIGN KEY constraint failed/i.test(message)) {
    return { message, code: "23503", details: message };
  }
  if (/CHECK constraint failed/i.test(message)) {
    return { message, code: "23514", details: message };
  }
  return { message, code: "500", details: message };
}

function insertOutbox(db: Database.Database, table: string, recordId: string, operation: "insert" | "update" | "delete", payload: Row) {
  if (DESKTOP_ONLY_TABLES.has(table)) return;
  db.prepare(
    `INSERT INTO outbox (id, table_name, record_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), table, recordId, operation, JSON.stringify(payload), nowIso());
}

type QueryResult<T> = { data: T | T[] | null; error: PostgrestError | null; count: number | null };

class LocalQueryBuilder<T = Row> implements PromiseLike<QueryResult<T>> {
  private filters: Cond[] = [];
  private orFilters: Cond[][] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private selectCols = "*";
  private selectOpts: SelectOptions = {};
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row | Row[] | null = null;
  private wantSingle: "single" | "maybeSingle" | null = null;

  constructor(
    private table: string,
    private db: Database.Database
  ) {}

  select(cols = "*", opts: SelectOptions = {}) {
    this.selectCols = cols;
    this.selectOpts = opts;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  upsert(payload: Row | Row[]) {
    this.mode = "upsert";
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "eq", val: String(val) });
    return this;
  }
  neq(col: string, val: unknown) {
    this.filters.push({ col, op: "neq", val: String(val) });
    return this;
  }
  gt(col: string, val: unknown) {
    this.filters.push({ col, op: "gt", val: String(val) });
    return this;
  }
  gte(col: string, val: unknown) {
    this.filters.push({ col, op: "gte", val: String(val) });
    return this;
  }
  lt(col: string, val: unknown) {
    this.filters.push({ col, op: "lt", val: String(val) });
    return this;
  }
  lte(col: string, val: unknown) {
    this.filters.push({ col, op: "lte", val: String(val) });
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push({ col, op: "in", val: `(${vals.map(String).join(",")})` });
    return this;
  }
  is(col: string, val: null | boolean) {
    this.filters.push({ col, op: "is", val: val === null ? "null" : String(val) });
    return this;
  }
  not(col: string, op: string, val: unknown) {
    this.filters.push({ col, op, val: val === null ? "null" : String(val), negate: true });
    return this;
  }
  ilike(col: string, pattern: string) {
    this.filters.push({ col, op: "ilike", val: pattern });
    return this;
  }
  like(col: string, pattern: string) {
    this.filters.push({ col, op: "like", val: pattern });
    return this;
  }
  or(expr: string) {
    this.orFilters.push(parseOrExpr(expr));
    return this;
  }

  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orderCol = col;
    this.orderAsc = opts.ascending !== false;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single() {
    this.wantSingle = "single";
    return this;
  }
  maybeSingle() {
    this.wantSingle = "maybeSingle";
    return this;
  }

  private matchesRow(row: Row): boolean {
    if (!this.filters.every((c) => applyCond(row, c))) return false;
    if (this.orFilters.length && !this.orFilters.every((group) => group.some((c) => applyCond(row, c)))) return false;
    return true;
  }

  private fetchAll(): Row[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.table}`).all() as Row[];
    return rows.map((r) => parseJsonColumns(this.table, r));
  }

private resolveEmbed(row: Row, embed: SelectSpec["embeds"][number]): unknown {
    const rel = RELATIONSHIPS[this.table]?.[embed.alias];
    if (!rel) return embed.inner ? [] : null;

    if (rel.kind === "hasOne") {
      const fkValue = row[rel.foreignKey];
      if (fkValue == null) return null;
      const found = this.db.prepare(`SELECT * FROM ${rel.table} WHERE id = ?`).get(fkValue as string) as Row | undefined;
      return found ? parseJsonColumns(rel.table, found) : null;
    }

    const children = this.db
      .prepare(`SELECT * FROM ${rel.table} WHERE ${rel.foreignKey} = ?`)
      .all(row.id as string) as Row[];
    return children.map((c) => parseJsonColumns(rel.table, c));
  }

  private project(rows: Row[]): Row[] {
    const spec = parseSelectSpec(this.selectCols);
    let out = rows.map((r) => {
      const base: Row = spec.plainCols === "*" ? { ...r } : {};
      if (spec.plainCols !== "*") {
        for (const c of spec.plainCols) base[c] = r[c];
      }
      for (const embed of spec.embeds) {
        base[embed.alias] = this.resolveEmbed(r, embed);
      }
      return base;
    });

    // `!inner` (PostgREST) descarta a linha se o relacionamento não bateu.
    const innerEmbeds = spec.embeds.filter((e) => e.inner);
    if (innerEmbeds.length) {
      out = out.filter((r) => innerEmbeds.every((e) => { const v = r[e.alias]; return Array.isArray(v) ? v.length > 0 : v != null; }));
    }
    return out;
  }

  private runSelect() {
    let rows = this.fetchAll().filter((r) => this.matchesRow(r));
    const count = this.selectOpts.count ? rows.length : null;

    if (this.orderCol) {
      const col = this.orderCol;
      rows = rows.sort((a, b) => {
        const av = a[col] as string | number | null;
        const bv = b[col] as string | number | null;
        if (av == null && bv == null) return 0;
        if (av == null) return this.orderAsc ? -1 : 1;
        if (bv == null) return this.orderAsc ? 1 : -1;
        if (av < bv) return this.orderAsc ? -1 : 1;
        if (av > bv) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    if (this.rangeFrom != null && this.rangeTo != null) {
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
    } else if (this.limitN != null) {
      rows = rows.slice(0, this.limitN);
    }

    const data = this.selectOpts.head ? null : this.project(rows);
    return { data, error: null, count };
  }

  private runInsert() {
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
    const ts = TIMESTAMP_COLUMNS[this.table] ?? {};
    const inserted: Row[] = [];
    try {
      for (const raw of rows) {
        const row: Row = { ...raw };
        if (!row.id) row.id = crypto.randomUUID();
        const now = nowIso();
        if (ts.created && !row.created_at) row.created_at = now;
        if (ts.updated && !row.updated_at) row.updated_at = now;

        // profiles criados via admin.auth.admin.createUser() chegam sem
        // password_hash (ver LocalAdminClient) — resgata o hash que ficou
        // pendente pelo mesmo id, reproduzindo o fluxo de duas chamadas do
        // Supabase Admin API real (createUser -> insert profile).
        if (this.table === "profiles" && !row.password_hash) {
          const pending = this.db
            .prepare(`SELECT password_hash FROM pending_credentials WHERE profile_id = ?`)
            .get(row.id as string) as { password_hash: string } | undefined;
          if (pending) {
            row.password_hash = pending.password_hash;
            this.db.prepare(`DELETE FROM pending_credentials WHERE profile_id = ?`).run(row.id as string);
          }
        }

        const stringified = stringifyJsonColumns(this.table, row);

        const cols = Object.keys(stringified);
        const placeholders = cols.map(() => "?").join(", ");
        this.db
          .prepare(`INSERT INTO ${this.table} (${cols.join(", ")}) VALUES (${placeholders})`)
          .run(...cols.map((c) => stringified[c] as never));

        insertOutbox(this.db, this.table, row.id as string, "insert", stringified);
        inserted.push(row);
      }
    } catch (err) {
      return { data: null, error: toUniqueConstraintError(err), count: null };
    }

    const data = this.wantSingle ? this.project(inserted)[0] ?? null : this.project(inserted);
    return { data, error: null, count: null };
  }

  private runUpdate() {
    const matching = this.fetchAll().filter((r) => this.matchesRow(r));
    if (matching.length === 0) return { data: this.wantSingle ? null : [], error: null, count: null };

    const ts = TIMESTAMP_COLUMNS[this.table] ?? {};
    const patch: Row = { ...this.payload };
    if (ts.updated) patch.updated_at = nowIso();
    const stringifiedPatch = stringifyJsonColumns(this.table, patch);
    const cols = Object.keys(stringifiedPatch);
    const setClause = cols.map((c) => `${c} = ?`).join(", ");

    try {
      const updated: Row[] = [];
      for (const row of matching) {
        this.db
          .prepare(`UPDATE ${this.table} SET ${setClause} WHERE id = ?`)
          .run(...cols.map((c) => stringifiedPatch[c] as never), row.id as string);
        const merged = { ...row, ...patch };
        insertOutbox(this.db, this.table, row.id as string, "update", stringifyJsonColumns(this.table, merged));
        updated.push(merged);
      }
      const data = this.wantSingle ? this.project(updated)[0] ?? null : this.project(updated);
      return { data, error: null, count: null };
    } catch (err) {
      return { data: null, error: toUniqueConstraintError(err), count: null };
    }
  }

  private runUpsert() {
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
    const results: Row[] = [];
    for (const row of rows) {
      if (row.id) {
        const existing = this.db.prepare(`SELECT id FROM ${this.table} WHERE id = ?`).get(row.id);
        if (existing) {
          const qb = new LocalQueryBuilder(this.table, this.db);
          qb.update(row).eq("id", row.id as string);
          const res = qb["runUpdate"]();
          if (res.error) return { data: null, error: res.error, count: null };
          results.push(...(Array.isArray(res.data) ? res.data : res.data ? [res.data] : []));
          continue;
        }
      }
      const qb = new LocalQueryBuilder(this.table, this.db);
      qb.insert(row);
      const res = qb["runInsert"]();
      if (res.error) return { data: null, error: res.error, count: null };
      results.push(...(Array.isArray(res.data) ? res.data : res.data ? [res.data] : []));
    }
    const data = this.wantSingle ? results[0] ?? null : results;
    return { data, error: null, count: null };
  }

  private runDelete() {
    const matching = this.fetchAll().filter((r) => this.matchesRow(r));
    for (const row of matching) {
      this.db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).run(row.id as string);
      insertOutbox(this.db, this.table, row.id as string, "delete", { id: row.id });
    }
    const data = this.wantSingle ? null : matching;
    return { data, error: null, count: null };
  }

  private execute() {
    switch (this.mode) {
      case "select":
        return this.runSelect();
      case "insert":
        return this.runInsert();
      case "update":
        return this.runUpdate();
      case "upsert":
        return this.runUpsert();
      case "delete":
        return this.runDelete();
    }
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    let result: QueryResult<T>;
    try {
      result = this.execute() as QueryResult<T>;
      if (this.mode === "select" && this.wantSingle) {
        const rows = (result.data as Row[]) ?? [];
        if (this.wantSingle === "single" && rows.length === 0) {
          result = { data: null, error: { message: "Registro não encontrado.", code: "PGRST116" }, count: null };
        } else {
          result = { data: (rows[0] ?? null) as T | null, error: null, count: result.count };
        }
      }
    } catch (err) {
      result = { data: null, error: toUniqueConstraintError(err), count: null };
    }
    return Promise.resolve(result).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

export class LocalSupabaseClient {
  constructor(private db: Database.Database) {}

  from<T = Row>(table: string) {
    return new LocalQueryBuilder<T>(table, this.db);
  }

  rawDb() {
    return this.db;
  }

  /**
   * Substitui `supabase.auth.getUser()` — lê o token do cookie httpOnly de
   * sessão local, valida contra a tabela `sessions` e devolve o mesmo
   * formato `{ data: { user }, error }` que `getSession()` em
   * src/lib/auth.ts já espera, sem precisar mudar essa função.
   */
  auth = {
    getUser: async (): Promise<{ data: { user: { id: string; email: string } | null }; error: null }> => {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      if (!token) return { data: { user: null }, error: null };

      const session = this.db
        .prepare(`SELECT profile_id, expires_at FROM sessions WHERE token = ?`)
        .get(token) as { profile_id: string; expires_at: string } | undefined;
      if (!session || new Date(session.expires_at) < new Date()) {
        return { data: { user: null }, error: null };
      }

      const profile = this.db
        .prepare(`SELECT id, email FROM profiles WHERE id = ?`)
        .get(session.profile_id) as { id: string; email: string } | undefined;
      if (!profile) return { data: { user: null }, error: null };

      return { data: { user: { id: profile.id, email: profile.email } }, error: null };
    },

    /** Substitui `supabase.auth.signInWithPassword()` — bcrypt contra profiles.password_hash. */
    signInWithPassword: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<{ data: { user: { id: string; email: string } | null }; error: { message: string } | null }> => {
      const profile = this.db
        .prepare(`SELECT id, email, password_hash FROM profiles WHERE lower(email) = lower(?)`)
        .get(email) as { id: string; email: string; password_hash: string } | undefined;

      if (!profile || !bcrypt.compareSync(password, profile.password_hash)) {
        return { data: { user: null }, error: { message: "Invalid login credentials" } };
      }

      const token = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
      this.db
        .prepare(`INSERT INTO sessions (token, profile_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
        .run(token, profile.id, now.toISOString(), expiresAt.toISOString());

      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });

      return { data: { user: { id: profile.id, email: profile.email } }, error: null };
    },

    /** Substitui `supabase.auth.signOut()` — apaga a sessão local e o cookie. */
    signOut: async (): Promise<{ error: null }> => {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        this.db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
        cookieStore.delete(SESSION_COOKIE_NAME);
      }
      return { error: null };
    },
  };
}

/**
 * Equivalente local ao cliente `service_role` (createAdminClient). Reaproveita
 * `.from()` da `LocalSupabaseClient` e substitui `auth.admin.createUser()` /
 * `deleteUser()` — usados por `createCompanyWithPorter`/`addPorter`
 * (empresas/actions.ts) e `createResidentLogin` (moradores/actions.ts) para
 * provisionar o login antes de inserir o `profile` correspondente.
 */
export class LocalAdminClient {
  constructor(private db: Database.Database) {}

  from<T = Row>(table: string) {
    return new LocalQueryBuilder<T>(table, this.db);
  }

  rawDb() {
    return this.db;
  }

  auth = {
    admin: {
      createUser: async ({
        email,
        password,
      }: {
        email: string;
        password: string;
        email_confirm?: boolean;
        user_metadata?: Record<string, unknown>;
      }): Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }> => {
        const db = this.rawDb();
        const existing = db.prepare(`SELECT id FROM profiles WHERE lower(email) = lower(?)`).get(email);
        if (existing) {
          return { data: { user: null }, error: { message: "User already registered" } };
        }

        const id = crypto.randomUUID();
        const passwordHash = bcrypt.hashSync(password, 10);
        db.prepare(`INSERT INTO pending_credentials (profile_id, password_hash, created_at) VALUES (?, ?, ?)`).run(
          id,
          passwordHash,
          nowIso()
        );
        return { data: { user: { id } }, error: null };
      },

      deleteUser: async (id: string): Promise<{ error: null }> => {
        const db = this.rawDb();
        db.prepare(`DELETE FROM pending_credentials WHERE profile_id = ?`).run(id);
        db.prepare(`DELETE FROM sessions WHERE profile_id = ?`).run(id);
        db.prepare(`DELETE FROM profiles WHERE id = ?`).run(id);
        return { error: null };
      },
    },
  };
}

/** Equivalente local a `createAdminClient()` (cliente privilegiado). */
export function createLocalAdminClient(): LocalAdminClient {
  return new LocalAdminClient(getLocalDb());
}

let dbInstance: Database.Database | null = null;

function getDataDir(): string {
  return process.env.APP_DATA_DIR ?? path.join(process.cwd(), "local-db", "data");
}

export function getLocalDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "chcontrol.sqlite3");
  const isNew = !fs.existsSync(dbPath);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  if (isNew) {
    const migrationPath = path.join(process.cwd(), "local-db", "migrations", "0001_desktop_init.sql");
    db.exec(fs.readFileSync(migrationPath, "utf-8"));
  }

  dbInstance = db;
  return db;
}

/** Equivalente local a `createClient()` — mesma assinatura `async`, mesmo formato de retorno. */
export async function createLocalClient(): Promise<LocalSupabaseClient> {
  return new LocalSupabaseClient(getLocalDb());
}
