"use server";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { getLocalDb } from "@/lib/db/local-client";
import { isConfigured, isDesktop } from "@/lib/desktop-setup";

export interface SetupState {
  error?: string;
}

/**
 * Assistente de primeira execução (desktop): cria o condomínio desta
 * instalação, o primeiro login (admin) e grava a configuração. A partir daí o
 * app funciona 100% offline; a URL/chave do Supabase é opcional aqui e só é
 * usada pelo motor de sincronização (fase posterior).
 */
export async function completeSetup(_prev: SetupState, formData: FormData): Promise<SetupState> {
  if (!isDesktop()) return { error: "Assistente disponível apenas no app desktop." };
  if (isConfigured()) redirect("/login");

  const companyName = String(formData.get("company_name") ?? "").trim();
  const adminName = String(formData.get("admin_name") ?? "").trim();
  const adminEmail = String(formData.get("admin_email") ?? "").trim().toLowerCase();
  const adminPassword = String(formData.get("admin_password") ?? "");
  const supabaseUrl = String(formData.get("supabase_url") ?? "").trim();
  const supabaseKey = String(formData.get("supabase_key") ?? "").trim();

  if (companyName.length < 2) return { error: "Informe o nome do condomínio." };
  if (adminName.length < 3) return { error: "Informe o nome do administrador." };
  if (!adminEmail.includes("@")) return { error: "E-mail inválido." };
  if (adminPassword.length < 6) return { error: "A senha deve ter ao menos 6 caracteres." };

  const db = getLocalDb();
  const now = new Date().toISOString();
  const companyId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO companies (id, name, status, created_at, updated_at) VALUES (?, ?, 'active', ?, ?)`
    ).run(companyId, companyName, now, now);

    db.prepare(
      `INSERT INTO profiles (id, company_id, full_name, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'admin', 'active', ?, ?)`
    ).run(profileId, companyId, adminName, adminEmail, passwordHash, now, now);

    // company e profile também vão pra fila de sync (não são desktop-only).
    for (const [table, id, payload] of [
      ["companies", companyId, { id: companyId, name: companyName, status: "active", created_at: now, updated_at: now }],
      ["profiles", profileId, { id: profileId, company_id: companyId, full_name: adminName, email: adminEmail, role: "admin", status: "active", created_at: now, updated_at: now }],
    ] as const) {
      db.prepare(`INSERT INTO outbox (id, table_name, record_id, operation, payload, created_at) VALUES (?, ?, ?, 'insert', ?, ?)`)
        .run(crypto.randomUUID(), table, id, JSON.stringify(payload), now);
    }

    db.prepare(
      `INSERT INTO install_config (id, company_id, supabase_url, supabase_anon_key, configured_at)
       VALUES (1, ?, ?, ?, ?)`
    ).run(companyId, supabaseUrl, supabaseKey, now);
  });

  try {
    run();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao concluir a configuração." };
  }

  redirect("/login");
}
