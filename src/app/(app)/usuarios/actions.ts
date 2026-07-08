"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Cria um login de equipe (porteiro ou admin) para o condomínio da sessão.
 * Diferente de `addPorter` (que é superadmin + escolhe a empresa), aqui o
 * admin da instalação cria usuários só para a própria empresa.
 */
export async function createStaffLogin(
  name: string,
  email: string,
  password: string,
  role: "porter" | "admin"
): Promise<ActionResult> {
  const session = await requireSession();
  if (session.profile.role !== "admin" && session.profile.role !== "superadmin") {
    return { ok: false, error: "Sem permissão para criar usuários." };
  }
  if (!session.company) return { ok: false, error: "Empresa não identificada." };
  if (name.trim().length < 3) return { ok: false, error: "Informe o nome completo." };
  if (!email.includes("@")) return { ok: false, error: "E-mail inválido." };
  if (password.length < 6) return { ok: false, error: "A senha deve ter ao menos 6 caracteres." };

  const admin = createAdminClient();
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (userErr || !userData.user) {
    return { ok: false, error: userErr?.message ?? "Já existe um usuário com este e-mail." };
  }

  const { error } = await admin.from("profiles").insert({
    id: userData.user.id,
    company_id: session.company.id,
    full_name: name,
    email,
    role,
    status: "active",
  });
  if (error) {
    await admin.auth.admin.deleteUser(userData.user.id);
    return { ok: false, error: error.message };
  }

  await logAudit({ action: "create", entity: "profile", entityId: userData.user.id, details: { email, role }, session });
  revalidatePath("/usuarios");
  return { ok: true };
}

/** Ativa/desativa um login de equipe (não permite mexer no próprio usuário). */
export async function toggleStaffStatus(profileId: string, active: boolean): Promise<ActionResult> {
  const session = await requireSession();
  if (session.profile.role !== "admin" && session.profile.role !== "superadmin") {
    return { ok: false, error: "Sem permissão." };
  }
  if (profileId === session.userId) return { ok: false, error: "Você não pode desativar o próprio usuário." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status: active ? "active" : "inactive" })
    .eq("id", profileId);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "update", entity: "profile", entityId: profileId, details: { status: active ? "active" : "inactive" }, session });
  revalidatePath("/usuarios");
  return { ok: true };
}
