"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Atualiza o nome e a foto do próprio perfil (usuário logado). */
export async function updateOwnProfile(fullName: string, photoUrl: string | null): Promise<ActionResult> {
  const trimmed = fullName.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "Nome deve ter ao menos 3 caracteres." };
  }
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed, photo_url: photoUrl })
    .eq("id", session.userId);

  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "update", entity: "profile", entityId: session.userId, details: { full_name: trimmed }, session });
  revalidatePath("/", "layout");
  return { ok: true };
}
