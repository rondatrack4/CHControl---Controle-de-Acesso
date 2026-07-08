import { requireResident } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentCorrespondenceClient } from "@/components/modules/resident-portal/correspondence-client";
import type { Correspondence } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function PortalCorrespondenciasPage() {
  const session = await requireResident();
  const residentId = session.profile.resident_id!;
  const supabase = await createClient();

  const { data } = await supabase
    .from("correspondences")
    .select("*")
    .eq("resident_id", residentId)
    .order("received_at", { ascending: false })
    .limit(1000);

  return <ResidentCorrespondenceClient correspondences={(data as Correspondence[]) ?? []} />;
}
