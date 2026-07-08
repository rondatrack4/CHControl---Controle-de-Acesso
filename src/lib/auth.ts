import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Company, Profile } from "@/lib/database.types";

export interface SessionContext {
  userId: string;
  email: string;
  profile: Profile;
  company: Company | null;
}

/** Retorna o contexto da sessão atual, ou null se não autenticado. */
export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  let company: Company | null = null;
  if (profile.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single();
    company = data ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile,
    company,
  };
}

/** Garante autenticação; redireciona para /login se não houver sessão. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Garante que o usuário é superadmin. */
export async function requireSuperadmin(): Promise<SessionContext> {
  const session = await requireSession();
  if (session.profile.role !== "superadmin") redirect("/dashboard");
  return session;
}

/** Garante que o usuário é morador (role='resident') com resident_id vinculado. */
export async function requireResident(): Promise<SessionContext> {
  const session = await requireSession();
  if (session.profile.role !== "resident" || !session.profile.resident_id) {
    redirect("/dashboard");
  }
  return session;
}
