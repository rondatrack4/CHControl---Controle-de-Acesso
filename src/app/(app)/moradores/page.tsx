import { createClient } from "@/lib/supabase/server";
import { ResidentsClient } from "@/components/modules/residents/residents-client";
import type { Resident } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function MoradoresPage() {
  const supabase = await createClient();
  const [residentsRes, portalProfilesRes] = await Promise.all([
    supabase.from("residents").select("*").order("full_name", { ascending: true }),
    supabase.from("profiles").select("resident_id").eq("role", "resident").not("resident_id", "is", null),
  ]);

  const residentIdsWithPortalAccess = (portalProfilesRes.data ?? [])
    .map((p) => p.resident_id)
    .filter((id): id is string => !!id);

  return (
    <ResidentsClient
      residents={(residentsRes.data as Resident[]) ?? []}
      residentIdsWithPortalAccess={residentIdsWithPortalAccess}
    />
  );
}
