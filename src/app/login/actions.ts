"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export interface LoginState {
  error?: string;
}

export async function signInAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciais inválidas. Verifique e-mail e senha." };
  }

  // Registra auditoria de login
  const session = await getSession();
  if (session) {
    if (session.profile.status === "inactive") {
      await supabase.auth.signOut();
      return { error: "Usuário inativo. Contate o administrador." };
    }
    await logAudit({ action: "login", session });
  }

  redirect(session?.profile.role === "resident" ? "/portal" : "/dashboard");
}
