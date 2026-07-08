import { requireResident } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentHistoryClient } from "@/components/modules/resident-portal/history-client";
import type { AccessLogWithDestinations } from "@/app/(app)/acessos/page";

export const dynamic = "force-dynamic";

export default async function PortalHistoricoPage() {
  const session = await requireResident();
  const residentId = session.profile.resident_id!;
  const supabase = await createClient();

  const { data } = await supabase
    .from("access_logs")
    .select("*, destinations:access_log_destinations!inner(*)")
    .eq("destinations.resident_id", residentId)
    .order("entry_at", { ascending: false })
    .limit(2000);

  return <ResidentHistoryClient logs={(data as AccessLogWithDestinations[]) ?? []} />;
}
