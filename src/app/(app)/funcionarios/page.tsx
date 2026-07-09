import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmployeesClient } from "@/components/modules/employees/employees-client";
import type { Employee } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function FuncionariosPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });
  return <EmployeesClient employees={(data as Employee[]) ?? []} />;
}
