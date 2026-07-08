"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { residentSchema, type ResidentInput } from "@/lib/validations";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function normalize(input: ResidentInput) {
  // Zera campos irrelevantes ao tipo de cada residência informada.
  const residences = input.residences.map((r) => ({
    residence_type: r.residence_type,
    block: r.residence_type === "apartamento" ? r.block || null : null,
    apartment: r.residence_type === "apartamento" ? r.apartment || null : null,
    quadra: r.residence_type === "lote" ? r.quadra || null : null,
    lote: r.residence_type === "lote" ? r.lote || null : null,
  }));
  // A primeira residência da lista é espelhada nas colunas legadas
  // (residence_type/block/apartment/quadra/lote), usadas em outros pontos
  // do app (rótulo rápido, autopreenchimento de visitante/correspondência).
  const primary = residences[0];
  return {
    ...input,
    email: input.email || null,
    residences,
    ...primary,
  };
}

export async function createResident(input: ResidentInput): Promise<ActionResult> {
  const parsed = residentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("residents")
    .insert({ ...normalize(parsed.data), company_id: session.company.id })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe um morador com este CPF." };
    return { ok: false, error: error.message };
  }

  await logAudit({
    action: "create",
    entity: "resident",
    entityId: data.id,
    details: { full_name: parsed.data.full_name },
    session,
  });
  revalidatePath("/moradores");
  return { ok: true };
}

export async function updateResident(id: string, input: ResidentInput): Promise<ActionResult> {
  const parsed = residentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("residents").update(normalize(parsed.data)).eq("id", id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe um morador com este CPF." };
    return { ok: false, error: error.message };
  }

  await logAudit({
    action: "update",
    entity: "resident",
    entityId: id,
    details: { full_name: parsed.data.full_name },
    session,
  });
  revalidatePath("/moradores");
  return { ok: true };
}

/** Cria um login de acesso ao Portal do Morador para um morador já cadastrado. */
export async function createResidentLogin(
  residentId: string,
  email: string,
  password: string
): Promise<ActionResult> {
  const session = await requireSession();
  const admin = createAdminClient();

  const { data: resident } = await admin
    .from("residents")
    .select("full_name, company_id")
    .eq("id", residentId)
    .single();
  if (!resident) return { ok: false, error: "Morador não encontrado." };

  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: resident.full_name },
  });
  if (userErr || !userData.user) {
    return { ok: false, error: `Falha ao criar acesso: ${userErr?.message ?? "erro"}` };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: userData.user.id,
    company_id: resident.company_id,
    full_name: resident.full_name,
    email,
    role: "resident",
    status: "active",
    resident_id: residentId,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(userData.user.id);
    return { ok: false, error: profileErr.message };
  }

  await logAudit({
    action: "create",
    entity: "profile",
    entityId: userData.user.id,
    details: { email, residentId, role: "resident" },
    session,
  });
  revalidatePath("/moradores");
  return { ok: true };
}

export async function deleteResident(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("residents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "delete", entity: "resident", entityId: id, session });
  revalidatePath("/moradores");
  return { ok: true };
}
