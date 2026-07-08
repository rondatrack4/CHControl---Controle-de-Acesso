import { createClient } from "@/lib/supabase/server";
import { ProvidersClient, type ProviderRow } from "@/components/modules/providers/providers-client";
import type { Resident } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function PrestadoresPage() {
  const supabase = await createClient();

  const [{ data: providers }, { data: residents }] = await Promise.all([
    supabase
      .from("service_providers")
      .select("*, resident:residents(*)")
      .order("full_name", { ascending: true }),
    supabase.from("residents").select("*").eq("status", "active").order("full_name"),
  ]);

  return (
    <ProvidersClient
      providers={(providers as ProviderRow[]) ?? []}
      residents={(residents as Resident[]) ?? []}
    />
  );
}
