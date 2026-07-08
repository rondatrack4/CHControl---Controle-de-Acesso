"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireResident } from "@/lib/auth";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  await requireResident();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/portal");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  await requireResident();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/portal");
  return { ok: true };
}
