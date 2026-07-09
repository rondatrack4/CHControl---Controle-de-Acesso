import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChavesClient } from "@/components/modules/keys/chaves-client";
import type { Employee, KeyItem, KeyLoan } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function ChavesPage() {
  await requireSession();
  const supabase = await createClient();

  const [{ data: keys }, { data: employees }, { data: loans }] = await Promise.all([
    supabase.from("keys").select("*").order("code", { ascending: true }),
    supabase.from("employees").select("*").eq("status", "active").order("full_name", { ascending: true }),
    supabase.from("key_loans").select("*").order("lent_at", { ascending: false }),
  ]);

  return (
    <ChavesClient
      keys={(keys as KeyItem[]) ?? []}
      employees={(employees as Employee[]) ?? []}
      loans={(loans as KeyLoan[]) ?? []}
    />
  );
}
