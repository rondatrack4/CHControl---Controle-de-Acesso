import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UsersClient } from "@/components/modules/users/users-client";
import type { Profile } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await requireSession();
  if (session.profile.role !== "admin" && session.profile.role !== "superadmin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["admin", "porter"])
    .order("full_name", { ascending: true });

  return <UsersClient profiles={(data as Profile[]) ?? []} currentUserId={session.userId} />;
}
