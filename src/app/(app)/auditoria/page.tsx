import { createClient } from "@/lib/supabase/server";
import { AuditClient } from "@/components/modules/audit/audit-client";
import type { AuditLog } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);

  return <AuditClient logs={(data as AuditLog[]) ?? []} />;
}
