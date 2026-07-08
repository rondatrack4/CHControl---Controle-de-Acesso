"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { visitorSchema, type VisitorInput } from "@/lib/validations";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createVisitor(input: VisitorInput): Promise<ActionResult> {
  const parsed = visitorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visitors")
    .insert({ ...parsed.data, cpf: parsed.data.cpf || null, company_id: session.company.id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "create",
    entity: "visitor",
    entityId: data.id,
    details: { full_name: parsed.data.full_name },
    session,
  });
  revalidatePath("/visitantes");
  return { ok: true, id: data.id };
}

export async function updateVisitor(id: string, input: VisitorInput): Promise<ActionResult> {
  const parsed = visitorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("visitors")
    .update({ ...parsed.data, cpf: parsed.data.cpf || null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "update",
    entity: "visitor",
    entityId: id,
    details: { full_name: parsed.data.full_name },
    session,
  });
  revalidatePath("/visitantes");
  return { ok: true };
}

export async function deleteVisitor(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("visitors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "delete", entity: "visitor", entityId: id, session });
  revalidatePath("/visitantes");
  return { ok: true };
}
