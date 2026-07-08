"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { recurringAuthSchema, type RecurringAuthInput } from "@/lib/validations";
import { residenceLabel } from "@/lib/utils";
import { PERSON_TYPE_LABELS, VISITOR_CATEGORY_LABELS } from "@/lib/constants";
import type { PersonType } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface AnyPersonResult {
  person_type: PersonType;
  id: string;
  full_name: string;
  document: string | null;
  category_label: string;
  photo_url: string | null;
}

/** Busca qualquer pessoa já cadastrada — morador, visitante ou prestador — por nome ou documento. */
export async function searchAnyPerson(query: string): Promise<AnyPersonResult[]> {
  await requireSession();
  const supabase = await createClient();
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${q}%`;

  const [residentsRes, visitorsRes, providersRes] = await Promise.all([
    supabase
      .from("residents")
      .select("id, full_name, cpf, photo_url")
      .eq("status", "active")
      .or(`full_name.ilike.${pattern},cpf.ilike.${pattern}`)
      .limit(15),
    supabase
      .from("visitors")
      .select("id, full_name, cpf, document_number, photo_url, category")
      .eq("status", "active")
      .or(`full_name.ilike.${pattern},cpf.ilike.${pattern},document_number.ilike.${pattern}`)
      .limit(15),
    supabase
      .from("service_providers")
      .select("id, full_name, cpf, document_number, photo_url, category")
      .eq("status", "active")
      .or(`full_name.ilike.${pattern},cpf.ilike.${pattern},document_number.ilike.${pattern}`)
      .limit(15),
  ]);

  const results: AnyPersonResult[] = [
    ...(residentsRes.data ?? []).map((r) => ({
      person_type: "resident" as PersonType,
      id: r.id,
      full_name: r.full_name,
      document: r.cpf,
      category_label: PERSON_TYPE_LABELS.resident,
      photo_url: r.photo_url,
    })),
    ...(visitorsRes.data ?? []).map((v) => ({
      person_type: "visitor" as PersonType,
      id: v.id,
      full_name: v.full_name,
      document: v.cpf ?? v.document_number,
      category_label: VISITOR_CATEGORY_LABELS[v.category] ?? PERSON_TYPE_LABELS.visitor,
      photo_url: v.photo_url,
    })),
    ...(providersRes.data ?? []).map((p) => ({
      person_type: "service_provider" as PersonType,
      id: p.id,
      full_name: p.full_name,
      document: p.cpf ?? p.document_number,
      category_label: VISITOR_CATEGORY_LABELS[p.category] ?? PERSON_TYPE_LABELS.service_provider,
      photo_url: p.photo_url,
    })),
  ];
  return results.slice(0, 25);
}

export async function createRecurringAuth(input: RecurringAuthInput): Promise<ActionResult> {
  const parsed = recurringAuthSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };
  const supabase = await createClient();

  let destinationLabel = parsed.data.destination_label || null;
  if (parsed.data.destination_resident_id && !destinationLabel) {
    const { data: r } = await supabase
      .from("residents")
      .select("*")
      .eq("id", parsed.data.destination_resident_id)
      .single();
    if (r) destinationLabel = residenceLabel(r);
  }

  const { data, error } = await supabase
    .from("recurring_authorizations")
    .insert({
      ...parsed.data,
      destination_label: destinationLabel,
      company_id: session.company.id,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "create",
    entity: "recurring_authorization",
    entityId: data.id,
    details: { person_name: parsed.data.person_name },
    session,
  });
  revalidatePath("/recorrentes");
  return { ok: true, id: data.id };
}

export async function updateRecurringAuth(id: string, input: RecurringAuthInput): Promise<ActionResult> {
  const parsed = recurringAuthSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  const supabase = await createClient();

  let destinationLabel = parsed.data.destination_label || null;
  if (parsed.data.destination_resident_id && !destinationLabel) {
    const { data: r } = await supabase
      .from("residents")
      .select("*")
      .eq("id", parsed.data.destination_resident_id)
      .single();
    if (r) destinationLabel = residenceLabel(r);
  }

  const { error } = await supabase
    .from("recurring_authorizations")
    .update({ ...parsed.data, destination_label: destinationLabel })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "update",
    entity: "recurring_authorization",
    entityId: id,
    details: { person_name: parsed.data.person_name },
    session,
  });
  revalidatePath("/recorrentes");
  return { ok: true };
}

export async function toggleRecurringAuthStatus(id: string, status: "active" | "inactive"): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_authorizations").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "status_change",
    entity: "recurring_authorization",
    entityId: id,
    details: { to_status: status },
    session,
  });
  revalidatePath("/recorrentes");
  return { ok: true };
}

export async function deleteRecurringAuth(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_authorizations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "delete", entity: "recurring_authorization", entityId: id, session });
  revalidatePath("/recorrentes");
  return { ok: true };
}
