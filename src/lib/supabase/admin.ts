import { createClient } from "@supabase/supabase-js";
import { createLocalAdminClient } from "@/lib/db/local-client";

/**
 * Cliente privilegiado (service_role). Ignora RLS.
 * USAR APENAS em rotas de servidor confiáveis (ex.: provisionar empresa +
 * primeiro porteiro). NUNCA importar em Client Components.
 */
export function createAdminClient() {
  if (process.env.APP_MODE === "desktop") {
    return createLocalAdminClient() as unknown as ReturnType<typeof createClient>;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
