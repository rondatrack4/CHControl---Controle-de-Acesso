import Link from "next/link";
import {
  Activity,
  LogIn,
  LogOut,
  PackagePlus,
  PackageCheck,
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/lib/database.types";

const ACTION_META: Record<string, { label: string; icon: typeof Activity; className: string }> = {
  login: { label: "entrou no sistema", icon: KeyRound, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  logout: { label: "saiu do sistema", icon: KeyRound, className: "bg-muted text-muted-foreground" },
  entry: { label: "registrou entrada", icon: LogIn, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  exit: { label: "registrou saída", icon: LogOut, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  create: { label: "criou um cadastro", icon: UserPlus, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  update: { label: "atualizou um cadastro", icon: Pencil, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  delete: { label: "excluiu um cadastro", icon: Trash2, className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  deliver: { label: "entregou uma correspondência", icon: PackageCheck, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  status_change: { label: "alterou o status", icon: Pencil, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

const ENTITY_LABELS: Record<string, string> = {
  resident: "morador",
  visitor: "visitante",
  service_provider: "prestador",
  correspondence: "correspondência",
  profile: "usuário",
  access_log: "acesso",
};

function describe(log: AuditLog): { label: string; icon: typeof Activity; className: string } {
  const meta = ACTION_META[log.action] ?? {
    label: log.action,
    icon: Activity,
    className: "bg-muted text-muted-foreground",
  };
  if (log.action === "create" && log.entity && ENTITY_LABELS[log.entity]) {
    return { ...meta, icon: log.entity === "correspondence" ? PackagePlus : meta.icon, label: `cadastrou um ${ENTITY_LABELS[log.entity]}` };
  }
  if (log.entity && ENTITY_LABELS[log.entity] && ["update", "delete"].includes(log.action)) {
    return { ...meta, label: `${meta.label} de ${ENTITY_LABELS[log.entity]}` };
  }
  return meta;
}

export function ActivityFeedCard({ logs }: { logs: AuditLog[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Atividade recente</CardTitle>
        <Link href="/auditoria" className="text-xs font-medium text-primary hover:underline">
          Ver auditoria
        </Link>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Activity className="h-8 w-8 opacity-40" />
            <p className="text-sm">Sem atividade registrada ainda.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {logs.map((log) => {
              const { label, icon: Icon, className } = describe(log);
              return (
                <li key={log.id} className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${className}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{log.user_name ?? "Sistema"}</span> {label}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
