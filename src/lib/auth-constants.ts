/**
 * Constantes de auth compartilhadas entre o shim local (src/lib/db/local-client.ts,
 * que importa better-sqlite3) e o middleware (roda em Edge runtime, não pode
 * importar módulos nativos) — por isso vivem num arquivo à parte, sem deps.
 */
export const SESSION_COOKIE_NAME = "chcontrol_session";
