import { createClient } from "@/lib/supabase/server";
import { VisitorsClient, type VisitorRow } from "@/components/modules/visitors/visitors-client";
import type { Resident } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function VisitantesPage() {
  const supabase = await createClient();

  const [{ data: visitors }, { data: residents }] = await Promise.all([
    supabase
      .from("visitors")
      .select("*, resident:residents(*)")
      .order("full_name", { ascending: true }),
    supabase.from("residents").select("*").eq("status", "active").order("full_name"),
  ]);

  return (
    <VisitorsClient
      visitors={(visitors as VisitorRow[]) ?? []}
      residents={(residents as Resident[]) ?? []}
    />
  );
}
