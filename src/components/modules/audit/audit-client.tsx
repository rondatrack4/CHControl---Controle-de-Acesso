"use client";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/lib/database.types";

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  create: "Cadastro",
  update: "Alteração",
  delete: "Exclusão",
  entry: "Entrada",
  exit: "Saída",
  export: "Exportação",
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  login: "success",
  logout: "secondary",
  create: "default",
  update: "warning",
  delete: "destructive",
  entry: "success",
  exit: "secondary",
  export: "outline",
};

export function AuditClient({ logs }: { logs: AuditLog[] }) {
  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      header: "Data/Hora",
      sortable: true,
      sortValue: (l) => l.created_at,
      render: (l) => <span className="text-sm">{formatDateTime(l.created_at)}</span>,
    },
    {
      key: "user_name",
      header: "Usuário",
      render: (l) => <span className="font-medium">{l.user_name ?? "—"}</span>,
    },
    {
      key: "action",
      header: "Ação",
      render: (l) => <Badge variant={ACTION_VARIANTS[l.action] ?? "outline"}>{ACTION_LABELS[l.action] ?? l.action}</Badge>,
    },
    {
      key: "entity",
      header: "Entidade",
      render: (l) => {
        const detail =
          typeof l.details === "object" && l.details && "full_name" in l.details
            ? String((l.details as Record<string, unknown>).full_name)
            : typeof l.details === "object" && l.details && "person_name" in l.details
              ? String((l.details as Record<string, unknown>).person_name)
              : "";
        return (
          <div>
            <p className="text-sm">{l.entity ?? "—"}</p>
            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
          </div>
        );
      },
    },
    {
      key: "ip_address",
      header: "IP",
      render: (l) => <span className="text-xs text-muted-foreground">{l.ip_address ?? "—"}</span>,
    },
    {
      key: "user_agent",
      header: "Navegador",
      render: (l) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">
          {shortenUA(l.user_agent)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Logs de Auditoria" description="Registro imutável de todas as ações realizadas no sistema." />
      <DataTable
        data={logs}
        columns={columns}
        rowKey={(l) => l.id}
        searchAccessor={(l) => `${l.user_name ?? ""} ${l.action} ${l.entity ?? ""} ${l.ip_address ?? ""}`}
        searchPlaceholder="Buscar por usuário, ação ou IP..."
        emptyMessage="Nenhum registro de auditoria."
      />
    </>
  );
}

function shortenUA(ua: string | null): string {
  if (!ua) return "—";
  if (ua.includes("Edg")) return "Microsoft Edge";
  if (ua.includes("Chrome")) return "Google Chrome";
  if (ua.includes("Firefox")) return "Mozilla Firefox";
  if (ua.includes("Safari")) return "Safari";
  return ua.slice(0, 40);
}
