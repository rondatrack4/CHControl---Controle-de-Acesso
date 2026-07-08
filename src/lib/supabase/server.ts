import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createLocalClient } from "@/lib/db/local-client";

/** Cliente Supabase para Server Components / Server Actions / Route Handlers. */
export async function createClient() {
  // Modo desktop (Tauri + SQLite, offline): mesma assinatura async e mesma
  // API encadeável (.from/.select/.eq/.../.auth.getUser()), mas os dados
  // vêm do SQLite local em vez da nuvem. Ver src/lib/db/local-client.ts.
  if (process.env.APP_MODE === "desktop") {
    return (await createLocalClient()) as unknown as Awaited<ReturnType<typeof createServerClient>>;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component — pode ser ignorado
            // quando há middleware atualizando a sessão.
          }
        },
      },
    }
  );
}
