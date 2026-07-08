"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function signOutAction() {
  const session = await getSession();
  if (session) {
    await logAudit({ action: "logout", session });
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
