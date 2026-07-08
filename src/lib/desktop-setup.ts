import { getLocalDb } from "@/lib/db/local-client";

/** true quando o app roda como aplicativo desktop offline (Tauri + SQLite). */
export function isDesktop(): boolean {
  return process.env.APP_MODE === "desktop";
}

/**
 * true quando a instalação já passou pelo assistente de primeira execução
 * (existe install_config + pelo menos um login criado). Só faz sentido no
 * modo desktop; na nuvem sempre retorna true.
 */
export function isConfigured(): boolean {
  if (!isDesktop()) return true;
  const db = getLocalDb();
  const cfg = db.prepare(`SELECT 1 FROM install_config WHERE id = 1`).get();
  const anyProfile = db.prepare(`SELECT 1 FROM profiles LIMIT 1`).get();
  return Boolean(cfg && anyProfile);
}
