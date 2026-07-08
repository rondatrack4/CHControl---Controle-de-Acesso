import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CompaniesClient, type CompanyRow } from "@/components/modules/companies/companies-client";
import type { Company } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  await requireSuperadmin();
  // Usa admin client para agregar dados de todas as empresas com segurança.
  const admin = createAdminClient();

  const [{ data: companies }, { data: profiles }] = await Promise.all([
    admin.from("companies").select("*").order("name"),
    admin.from("profiles").select("company_id").eq("role", "porter"),
  ]);

  const porterCounts = new Map<string, number>();
  (profiles ?? []).forEach((p) => {
    if (p.company_id) porterCounts.set(p.company_id, (porterCounts.get(p.company_id) ?? 0) + 1);
  });

  const rows: CompanyRow[] = ((companies as Company[]) ?? []).map((c) => ({
    ...c,
    porters: porterCounts.get(c.id) ?? 0,
  }));

  return <CompaniesClient companies={rows} />;
}
