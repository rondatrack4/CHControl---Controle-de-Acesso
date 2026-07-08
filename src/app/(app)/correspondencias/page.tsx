import { createClient } from "@/lib/supabase/server";
import { CorrespondenceClient } from "@/components/modules/correspondence/correspondence-client";
import type { Correspondence, Resident } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function CorrespondenciasPage() {
  const supabase = await createClient();
  const [correspondencesRes, residentsRes] = await Promise.all([
    supabase.from("correspondences").select("*").order("received_at", { ascending: false }).limit(3000),
    supabase.from("residents").select("*").eq("status", "active").order("full_name"),
  ]);

  const correspondences = (correspondencesRes.data as Correspondence[]) ?? [];
  const porters = Array.from(
    new Set(correspondences.map((c) => c.entry_porter_name).filter((n): n is string => !!n))
  ).sort();

  return (
    <CorrespondenceClient
      correspondences={correspondences}
      residents={(residentsRes.data as Resident[]) ?? []}
      porters={porters}
    />
  );
}
