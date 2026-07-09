"use client";

import { useMemo, useState } from "react";
import { ScrollText, CalendarClock, UserCog, Activity, Filter } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const ENTITY_LABELS: Record<string, string> = {
  visitor: "Visitante",
  service_provider: "Prestador",
  employee: "Funcionário",
  resident: "Morador",
  unit: "Unidade",
  key: "Chave",
  key_loan: "Empréstimo de chave",
  correspondence: "Correspondência",
  access_log: "Acesso",
  user: "Usuário",
  company: "Empresa",
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
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = logs.filter((l) => new Date(l.created_at) >= todayStart).length;
    const users = new Set(logs.map((l) => l.user_name).filter(Boolean)).size;
    const creates = logs.filter((l) => l.action === "create").length;
    return { total: logs.length, today, users, creates };
  }, [logs]);

  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of logs) counts[l.action] = (counts[l.action] ?? 0) + 1;
    return counts;
  }, [logs]);

  const filtered = useMemo(
    () => (actionFilter ? logs.filter((l) => l.action === actionFilter) : logs),
    [logs, actionFilter]
  );

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
        const details = (typeof l.details === "object" && l.details ? l.details : {}) as Record<string, unknown>;
        const detail =
          "full_name" in details ? String(details.full_name)
          : "person_name" in details ? String(details.person_name)
          : "label" in details ? String(details.label)
          : "name" in details ? String(details.name)
          : "";
        return (
          <div>
            <p className="text-sm">{l.entity ? ENTITY_LABELS[l.entity] ?? l.entity : "—"}</p>
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
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">{shortenUA(l.user_agent)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Logs de Auditoria" description="Registro imutável de todas as ações realizadas no sistema." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de registros" value={stats.total} icon={ScrollText} accent="blue" />
        <StatCard label="Hoje" value={stats.today} icon={CalendarClock} accent="green" />
        <StatCard label="Usuários ativos" value={stats.users} icon={UserCog} accent="violet" />
        <StatCard label="Cadastros" value={stats.creates} icon={Activity} accent="amber" />
      </div>

      {/* Filtros por ação */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Filter className="h-4 w-4" /> Filtrar:</span>
        <Button variant={actionFilter === null ? "default" : "outline"} size="sm" onClick={() => setActionFilter(null)}>
          Todos <span className="ml-1 opacity-70">{logs.length}</span>
        </Button>
        {Object.entries(actionCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([action, count]) => (
            <Button
              key={action}
              variant={actionFilter === action ? "default" : "outline"}
              size="sm"
              onClick={() => setActionFilter(action)}
            >
              {ACTION_LABELS[action] ?? action} <span className="ml-1 opacity-70">{count}</span>
            </Button>
          ))}
      </div>

      <DataTable
        data={filtered}
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
