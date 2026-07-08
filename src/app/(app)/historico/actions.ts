"use server";

import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/** Registra na auditoria uma exportação de histórico (PDF/Excel). */
export async function logExport(format: "pdf" | "excel", count: number): Promise<void> {
  const session = await requireSession();
  await logAudit({
    action: "export",
    entity: "access_log",
    details: { format, count },
    session,
  });
}
