import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth";

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "entry"
  | "exit"
  | "export"
  | "deliver"
  | "status_change"
  | "duplicate";

interface AuditParams {
  action: AuditAction;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  session: SessionContext;
}

/**
 * Registra um evento de auditoria capturando IP e navegador dos headers.
 * Chamado a partir de Server Actions / Route Handlers.
 */
export async function logAudit({
  action,
  entity,
  entityId,
  details = {},
  session,
}: AuditParams): Promise<void> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    const userAgent = h.get("user-agent") || null;

    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      company_id: session.company?.id ?? session.profile.company_id ?? null,
      user_id: session.userId,
      user_name: session.profile.full_name || session.email,
      action,
      entity: entity ?? null,
      entity_id: entityId ?? null,
      details,
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch (err) {
    // Auditoria nunca deve quebrar o fluxo principal.
    console.error("Falha ao registrar auditoria:", err);
  }
}
