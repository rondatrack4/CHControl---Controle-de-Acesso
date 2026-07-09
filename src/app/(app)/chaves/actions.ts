"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { keySchema, lendKeySchema, returnKeySchema, type KeyInput, type LendKeyInput, type ReturnKeyInput } from "@/lib/validations";
import type { Employee, KeyItem, KeyLoan } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createKey(input: KeyInput): Promise<ActionResult> {
  const parsed = keySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keys")
    .insert({ ...parsed.data, company_id: session.company.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "create", entity: "key", entityId: data.id, details: { code: parsed.data.code, name: parsed.data.name }, session });
  revalidatePath("/chaves");
  return { ok: true, id: data.id };
}

export async function updateKey(id: string, input: KeyInput): Promise<ActionResult> {
  const parsed = keySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("keys").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "update", entity: "key", entityId: id, details: { name: parsed.data.name }, session });
  revalidatePath("/chaves");
  return { ok: true };
}

export async function deleteKey(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  // Impede excluir uma chave que está emprestada (loan em aberto).
  const { data: open } = await supabase.from("keys").select("status").eq("id", id).single();
  if ((open as KeyItem | null)?.status === "lent") {
    return { ok: false, error: "Não é possível excluir uma chave emprestada. Registre a devolução primeiro." };
  }

  const { error } = await supabase.from("keys").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "delete", entity: "key", entityId: id, session });
  revalidatePath("/chaves");
  return { ok: true };
}

export async function lendKey(input: LendKeyInput): Promise<ActionResult> {
  const parsed = lendKeySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };
  const supabase = await createClient();

  const { data: key } = await supabase.from("keys").select("*").eq("id", parsed.data.key_id).single();
  const keyRow = key as KeyItem | null;
  if (!keyRow) return { ok: false, error: "Chave não encontrada." };
  if (keyRow.status === "lent") return { ok: false, error: "Esta chave já está emprestada." };

  const { data: emp } = await supabase.from("employees").select("*").eq("id", parsed.data.employee_id).single();
  const employee = emp as Employee | null;
  if (!employee) return { ok: false, error: "Funcionário não encontrado." };

  const { data: loan, error } = await supabase
    .from("key_loans")
    .insert({
      company_id: session.company.id,
      key_id: keyRow.id,
      key_code: keyRow.code,
      key_name: keyRow.name,
      employee_id: employee.id,
      employee_name: employee.full_name,
      lent_by_id: session.profile.id,
      lent_by_name: session.profile.full_name,
      lent_at: parsed.data.lent_at,
      expected_return_at: parsed.data.expected_return_at || null,
      lend_notes: parsed.data.lend_notes || null,
      status: "open",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("keys").update({ status: "lent" }).eq("id", keyRow.id);

  await logAudit({
    action: "update",
    entity: "key_loan",
    entityId: loan.id,
    details: { key: keyRow.name, employee: employee.full_name, acao: "emprestimo" },
    session,
  });
  revalidatePath("/chaves");
  return { ok: true, id: loan.id };
}

export async function returnKey(input: ReturnKeyInput): Promise<ActionResult> {
  const parsed = returnKeySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const session = await requireSession();
  const supabase = await createClient();

  const { data: loanData } = await supabase.from("key_loans").select("*").eq("id", parsed.data.loan_id).single();
  const loan = loanData as KeyLoan | null;
  if (!loan) return { ok: false, error: "Empréstimo não encontrado." };
  if (loan.status === "returned") return { ok: false, error: "Esta chave já foi devolvida." };

  const { error } = await supabase
    .from("key_loans")
    .update({
      status: "returned",
      returned_at: parsed.data.returned_at,
      returned_by_id: session.profile.id,
      returned_by_name: session.profile.full_name,
      return_notes: parsed.data.return_notes || null,
    })
    .eq("id", loan.id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("keys").update({ status: "available" }).eq("id", loan.key_id);

  await logAudit({
    action: "update",
    entity: "key_loan",
    entityId: loan.id,
    details: { key: loan.key_name, employee: loan.employee_name, acao: "devolucao" },
    session,
  });
  revalidatePath("/chaves");
  return { ok: true };
}
