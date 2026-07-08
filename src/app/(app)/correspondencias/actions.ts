"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  correspondenceSchema,
  deliverCorrespondenceSchema,
  type CorrespondenceInput,
  type DeliverCorrespondenceInput,
} from "@/lib/validations";
import type { AuditLog, CorrespondenceStatus } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createCorrespondence(input: CorrespondenceInput): Promise<ActionResult> {
  const parsed = correspondenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("correspondences")
    .insert({
      ...parsed.data,
      company_id: session.company.id,
      entry_porter_id: session.userId,
      entry_porter_name: session.profile.full_name || session.email,
    })
    .select("id, registration_number")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Erro ao cadastrar." };

  await logAudit({
    action: "create",
    entity: "correspondence",
    entityId: data.id,
    details: { registration_number: data.registration_number, recipient_name: parsed.data.recipient_name },
    session,
  });
  revalidatePath("/correspondencias");
  revalidatePath("/portal/correspondencias");
  return { ok: true, id: data.id };
}

export async function updateCorrespondence(id: string, input: CorrespondenceInput): Promise<ActionResult> {
  const parsed = correspondenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  const supabase = await createClient();

  const { data: current } = await supabase.from("correspondences").select("status").eq("id", id).single();

  const { error } = await supabase.from("correspondences").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "update",
    entity: "correspondence",
    entityId: id,
    details: {
      recipient_name: parsed.data.recipient_name,
      ...(current && current.status !== parsed.data.status
        ? { from_status: current.status, to_status: parsed.data.status }
        : {}),
    },
    session,
  });
  revalidatePath("/correspondencias");
  revalidatePath("/portal/correspondencias");
  return { ok: true };
}

export async function changeStatus(
  id: string,
  status: CorrespondenceStatus,
  locationNote?: string
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: current } = await supabase.from("correspondences").select("status").eq("id", id).single();
  if (!current) return { ok: false, error: "Correspondência não encontrada." };

  const { error } = await supabase
    .from("correspondences")
    .update({ status, ...(locationNote !== undefined ? { location_note: locationNote } : {}) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "status_change",
    entity: "correspondence",
    entityId: id,
    details: { from_status: current.status, to_status: status, location_note: locationNote },
    session,
  });
  revalidatePath("/correspondencias");
  revalidatePath("/portal/correspondencias");
  return { ok: true };
}

export async function deliverCorrespondence(input: DeliverCorrespondenceInput): Promise<ActionResult> {
  const parsed = deliverCorrespondenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const { correspondence_id, ...rest } = parsed.data;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("correspondences")
    .select("status")
    .eq("id", correspondence_id)
    .single();
  if (!current) return { ok: false, error: "Correspondência não encontrada." };
  if (current.status === "entregue") return { ok: false, error: "Correspondência já foi entregue." };

  const { error } = await supabase
    .from("correspondences")
    .update({
      ...rest,
      status: "entregue",
      delivered_at: new Date().toISOString(),
      delivery_porter_id: session.userId,
      delivery_porter_name: session.profile.full_name || session.email,
    })
    .eq("id", correspondence_id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "deliver",
    entity: "correspondence",
    entityId: correspondence_id,
    details: { from_status: current.status, to_status: "entregue", delivered_to_name: rest.delivered_to_name },
    session,
  });
  revalidatePath("/correspondencias");
  revalidatePath("/portal/correspondencias");
  return { ok: true };
}

export async function duplicateCorrespondence(id: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };
  const supabase = await createClient();

  const { data: original } = await supabase.from("correspondences").select("*").eq("id", id).single();
  if (!original) return { ok: false, error: "Correspondência não encontrada." };

  const { data, error } = await supabase
    .from("correspondences")
    .insert({
      company_id: session.company.id,
      type: original.type,
      carrier: original.carrier,
      sender_company: original.sender_company,
      resident_id: original.resident_id,
      recipient_name: original.recipient_name,
      recipient_residence_type: original.recipient_residence_type,
      recipient_block: original.recipient_block,
      recipient_apartment: original.recipient_apartment,
      recipient_quadra: original.recipient_quadra,
      recipient_lote: original.recipient_lote,
      recipient_tower: original.recipient_tower,
      recipient_unit: original.recipient_unit,
      recipient_document: original.recipient_document,
      recipient_document_type: original.recipient_document_type,
      recipient_phone: original.recipient_phone,
      recipient_whatsapp: original.recipient_whatsapp,
      recipient_email: original.recipient_email,
      priority: original.priority,
      status: "recebido",
      entry_porter_id: session.userId,
      entry_porter_name: session.profile.full_name || session.email,
    })
    .select("id, registration_number")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Erro ao duplicar." };

  await logAudit({
    action: "duplicate",
    entity: "correspondence",
    entityId: data.id,
    details: { duplicated_from: id, registration_number: data.registration_number },
    session,
  });
  revalidatePath("/correspondencias");
  return { ok: true, id: data.id };
}

export async function deleteCorrespondence(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("correspondences").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "delete", entity: "correspondence", entityId: id, session });
  revalidatePath("/correspondencias");
  revalidatePath("/portal/correspondencias");
  return { ok: true };
}

export async function getCorrespondenceHistory(id: string): Promise<AuditLog[]> {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("entity", "correspondence")
    .eq("entity_id", id)
    .order("created_at", { ascending: true });
  return (data as AuditLog[]) ?? [];
}
