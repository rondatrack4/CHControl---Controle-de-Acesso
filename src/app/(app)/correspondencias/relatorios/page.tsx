import { createClient } from "@/lib/supabase/server";
import { CorrespondenceReportsClient } from "@/components/modules/correspondence/correspondence-reports-client";
import type { Correspondence } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function CorrespondenciasRelatoriosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("correspondences")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(5000);

  return <CorrespondenceReportsClient correspondences={(data as Correspondence[]) ?? []} />;
}
