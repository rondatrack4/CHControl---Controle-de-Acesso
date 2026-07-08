import { createClient } from "@/lib/supabase/server";
import { HistoryClient } from "@/components/modules/history/history-client";
import type { AccessLogWithDestinations } from "@/app/(app)/acessos/page";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("access_logs")
    .select("*, destinations:access_log_destinations(*)")
    .order("entry_at", { ascending: false })
    .limit(5000);

  const logs = (data as AccessLogWithDestinations[]) ?? [];
  const porters = Array.from(
    new Set(logs.map((l) => l.entry_porter_name).filter((n): n is string => !!n))
  ).sort();

  return <HistoryClient logs={logs} porters={porters} />;
}
