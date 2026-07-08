import { createClient } from "@/lib/supabase/server";
import { AccessClient } from "@/components/modules/access/access-client";
import type { AccessLog, AccessLogDestination } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export type AccessLogWithDestinations = AccessLog & { destinations: AccessLogDestination[] };

export default async function AcessosPage() {
  const supabase = await createClient();

  // Moradores não registram entrada — apenas visitantes e prestadores.
  const [visitorsRes, providersRes, insideRes, residentsRes] = await Promise.all([
    supabase.from("visitors").select("*, resident:residents(*)").eq("status", "active").order("full_name"),
    supabase.from("service_providers").select("*, resident:residents(*)").eq("status", "active").order("full_name"),
    supabase
      .from("access_logs")
      .select("*, destinations:access_log_destinations(*)")
      .eq("status", "inside")
      .order("entry_at", { ascending: false }),
    supabase.from("residents").select("*").eq("status", "active").order("full_name"),
  ]);

  return (
    <AccessClient
      visitors={(visitorsRes.data as never) ?? []}
      providers={(providersRes.data as never) ?? []}
      inside={(insideRes.data as AccessLogWithDestinations[]) ?? []}
      residents={residentsRes.data ?? []}
    />
  );
}
