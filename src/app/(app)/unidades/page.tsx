import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UnitsClient } from "@/components/modules/units/units-client";
import type { Unit } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function UnidadesPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("units").select("*").eq("status", "active").order("updated_at", { ascending: false });
  return <UnitsClient units={(data as Unit[]) ?? []} />;
}
