"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import {
  companySchema,
  createCompanySchema,
  type CompanyInput,
  type CreateCompanyInput,
} from "@/lib/validations";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Cria empresa + primeiro usuário da portaria (usa service_role). */
export async function createCompanyWithPorter(input: CreateCompanyInput): Promise<ActionResult> {
  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSuperadmin();
  const admin = createAdminClient();

  // 1) empresa
  const { porter_name, porter_email, porter_password, ...company } = parsed.data;
  const { data: created, error: companyErr } = await admin
    .from("companies")
    .insert({ ...company, email: company.email || null })
    .select("id")
    .single();
  if (companyErr) return { ok: false, error: companyErr.message };

  // 2) usuário auth do porteiro
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email: porter_email,
    password: porter_password,
    email_confirm: true,
    user_metadata: { full_name: porter_name },
  });
  if (userErr || !userData.user) {
    // rollback da empresa para não deixar órfã
    await admin.from("companies").delete().eq("id", created.id);
    return { ok: false, error: `Falha ao criar porteiro: ${userErr?.message ?? "erro"}` };
  }

  // 3) perfil
  const { error: profileErr } = await admin.from("profiles").insert({
    id: userData.user.id,
    company_id: created.id,
    full_name: porter_name,
    email: porter_email,
    role: "porter",
    status: "active",
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(userData.user.id);
    await admin.from("companies").delete().eq("id", created.id);
    return { ok: false, error: profileErr.message };
  }

  await logAudit({
    action: "create",
    entity: "company",
    entityId: created.id,
    details: { name: company.name, porter_email },
    session,
  });
  revalidatePath("/empresas");
  return { ok: true };
}

export async function updateCompany(id: string, input: CompanyInput): Promise<ActionResult> {
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSuperadmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({ ...parsed.data, email: parsed.data.email || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "update", entity: "company", entityId: id, details: { name: parsed.data.name }, session });
  revalidatePath("/empresas");
  return { ok: true };
}

/** Adiciona um novo porteiro a uma empresa existente. */
export async function addPorter(
  companyId: string,
  name: string,
  email: string,
  password: string
): Promise<ActionResult> {
  const session = await requireSuperadmin();
  if (name.length < 3 || !email.includes("@") || password.length < 6) {
    return { ok: false, error: "Dados do porteiro inválidos (senha mínima de 6 caracteres)." };
  }
  const admin = createAdminClient();
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (userErr || !userData.user) return { ok: false, error: userErr?.message ?? "Erro ao criar usuário." };

  const { error } = await admin.from("profiles").insert({
    id: userData.user.id,
    company_id: companyId,
    full_name: name,
    email,
    role: "porter",
    status: "active",
  });
  if (error) {
    await admin.auth.admin.deleteUser(userData.user.id);
    return { ok: false, error: error.message };
  }

  await logAudit({ action: "create", entity: "profile", entityId: userData.user.id, details: { email, companyId }, session });
  revalidatePath("/empresas");
  return { ok: true };
}
