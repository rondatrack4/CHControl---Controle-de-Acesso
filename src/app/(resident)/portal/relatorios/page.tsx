import { requireResident } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentReportsClient } from "@/components/modules/resident-portal/reports-client";
import type { AccessLog } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function PortalRelatoriosPage() {
  const session = await requireResident();
  const residentId = session.profile.resident_id!;
  const supabase = await createClient();

  const { data } = await supabase
    .from("access_logs")
    .select("*, destinations:access_log_destinations!inner(*)")
    .eq("destinations.resident_id", residentId)
    .order("entry_at", { ascending: false })
    .limit(2000);

  return <ResidentReportsClient logs={(data as AccessLog[]) ?? []} />;
}
