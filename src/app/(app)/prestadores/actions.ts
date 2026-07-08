"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { serviceProviderSchema, type ServiceProviderInput } from "@/lib/validations";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createProvider(input: ServiceProviderInput): Promise<ActionResult> {
  const parsed = serviceProviderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_providers")
    .insert({ ...parsed.data, cpf: parsed.data.cpf || null, company_id: session.company.id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "create",
    entity: "service_provider",
    entityId: data.id,
    details: { full_name: parsed.data.full_name },
    session,
  });
  revalidatePath("/prestadores");
  return { ok: true, id: data.id };
}

export async function updateProvider(id: string, input: ServiceProviderInput): Promise<ActionResult> {
  const parsed = serviceProviderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_providers")
    .update({ ...parsed.data, cpf: parsed.data.cpf || null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "update",
    entity: "service_provider",
    entityId: id,
    details: { full_name: parsed.data.full_name },
    session,
  });
  revalidatePath("/prestadores");
  return { ok: true };
}

export async function deleteProvider(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("service_providers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "delete", entity: "service_provider", entityId: id, session });
  revalidatePath("/prestadores");
  return { ok: true };
}
