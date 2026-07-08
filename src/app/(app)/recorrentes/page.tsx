import { createClient } from "@/lib/supabase/server";
import { RecurringClient } from "@/components/modules/recurring/recurring-client";
import type { RecurringAuthorization } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function RecorrentesPage() {
  const supabase = await createClient();

  const [authRes, residentsRes] = await Promise.all([
    supabase.from("recurring_authorizations").select("*").order("created_at", { ascending: false }),
    supabase.from("residents").select("*").eq("status", "active").order("full_name"),
  ]);

  return (
    <RecurringClient
      authorizations={(authRes.data as RecurringAuthorization[]) ?? []}
      residents={residentsRes.data ?? []}
    />
  );
}
