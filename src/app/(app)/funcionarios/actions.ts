"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { employeeSchema, type EmployeeInput } from "@/lib/validations";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createEmployee(input: EmployeeInput): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({ ...parsed.data, cpf: parsed.data.cpf || null, company_id: session.company.id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "create",
    entity: "employee",
    entityId: data.id,
    details: { full_name: parsed.data.full_name },
    session,
  });
  revalidatePath("/funcionarios");
  return { ok: true, id: data.id };
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ ...parsed.data, cpf: parsed.data.cpf || null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "update",
    entity: "employee",
    entityId: id,
    details: { full_name: parsed.data.full_name },
    session,
  });
  revalidatePath("/funcionarios");
  return { ok: true };
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "delete", entity: "employee", entityId: id, session });
  revalidatePath("/funcionarios");
  return { ok: true };
}
