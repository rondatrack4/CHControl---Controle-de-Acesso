"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ResidenceType, RecordStatus } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createUnit(data: {
  unit_type: ResidenceType;
  block?: string | null;
  apartment?: string | null;
  quadra?: string | null;
  lote?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
}): Promise<ActionResult> {
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };

  const supabase = await createClient();
  const label = data.unit_type === "apartamento"
    ? `${data.block}/${data.apartment}`
    : `Quadra ${data.quadra}, Lote ${data.lote}`;

  const { error } = await supabase.from("units").insert({
    unit_type: data.unit_type,
    block: data.block || null,
    apartment: data.apartment || null,
    quadra: data.quadra || null,
    lote: data.lote || null,
    owner_name: data.owner_name || null,
    owner_phone: data.owner_phone || null,
    status: "active" as RecordStatus,
    company_id: session.company.id,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esta unidade já existe." };
    return { ok: false, error: error.message };
  }

  await logAudit({ action: "create", entity: "unit", entityId: label, details: { label }, session });
  revalidatePath("/unidades");
  return { ok: true };
}

export async function updateUnit(id: string, data: { owner_name?: string | null; owner_phone?: string | null; status?: RecordStatus }): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("units").update(data).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "update", entity: "unit", entityId: id, details: data, session });
  revalidatePath("/unidades");
  return { ok: true };
}

export async function deleteUnit(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.from("units").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "delete", entity: "unit", entityId: id, session });
  revalidatePath("/unidades");
  return { ok: true };
}
