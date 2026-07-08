import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

const PUBLIC_PATHS = ["/login", "/api/health"];

/**
 * Modo desktop (offline): o middleware roda em Edge runtime e não pode
 * importar o shim SQLite (módulo nativo). Faz só uma checagem leve — existe
 * cookie de sessão? — em vez de resolver o papel do usuário aqui.
 *
 * Isso é seguro porque a única coisa que o middleware da nuvem decide com
 * base em papel é o desvio morador <-> /portal, e no app desktop não existe
 * caminho que crie uma sessão local com role="resident" (o Portal do
 * Morador é cloud-only — nenhum profile de morador é logado localmente; o
 * /setup wizard e admin.auth.admin.createUser() só criam porter/admin). As
 * demais rotas restritas por papel (ex.: /empresas -> superadmin) já são
 * garantidas página a página via requireSuperadmin() em src/lib/auth.ts,
 * que roda contra o SQLite local — middleware nunca foi a única barreira
 * pra essas.
 */
function updateSessionDesktop(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // /setup é público no desktop (assistente de primeira execução, roda antes
  // de qualquer login existir).
  const isPublic = path.startsWith("/setup") || PUBLIC_PATHS.some((p) => path.startsWith(p));
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasSession && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request });
}

/** Atualiza a sessão a cada request e protege rotas privadas. */
export async function updateSession(request: NextRequest) {
  if (process.env.APP_MODE === "desktop") {
    return updateSessionDesktop(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isPortalPath = path.startsWith("/portal");

  // Não autenticado tentando acessar rota privada -> login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const needsRoleCheck = path === "/login" || isPortalPath || (!isPublic && !isPortalPath);
    if (needsRoleCheck) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role;

      // Autenticado tentando acessar /login -> destino conforme o papel
      if (path === "/login") {
        const url = request.nextUrl.clone();
        url.pathname = role === "resident" ? "/portal" : "/dashboard";
        return NextResponse.redirect(url);
      }
      // Não-morador tentando acessar o portal do morador -> dashboard
      if (isPortalPath && role !== "resident") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
      // Morador tentando acessar rotas de porteiro/admin -> portal
      if (!isPortalPath && !isPublic && role === "resident") {
        const url = request.nextUrl.clone();
        url.pathname = "/portal";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
