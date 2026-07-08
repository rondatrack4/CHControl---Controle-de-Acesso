"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Repeat, CheckCircle2, AlertTriangle, XCircle, PauseCircle, Ban, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RecurringFormDialog } from "@/components/modules/recurring/recurring-form-dialog";
import { deleteRecurringAuth, toggleRecurringAuthStatus } from "@/app/(app)/recorrentes/actions";
import { formatDate, initials, recurringAuthComputedStatus, weekdayScheduleSummary, type RecurringAuthComputedStatus } from "@/lib/utils";
import { PERSON_TYPE_LABELS } from "@/lib/constants";
import type { RecurringAuthorization, Resident } from "@/lib/database.types";

const STATUS_META: Record<RecurringAuthComputedStatus, { label: string; icon: typeof CheckCircle2; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  active: { label: "Ativo", icon: CheckCircle2, variant: "success" },
  expiring: { label: "Expira em breve", icon: AlertTriangle, variant: "warning" },
  expired: { label: "Expirado", icon: XCircle, variant: "destructive" },
  inactive: { label: "Suspenso", icon: PauseCircle, variant: "secondary" },
};

function ComputedStatusBadge({ auth }: { auth: RecurringAuthorization }) {
  const status = recurringAuthComputedStatus(auth);
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant} className="gap-1">
      <meta.icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}

export function RecurringClient({
  authorizations,
  residents,
}: {
  authorizations: RecurringAuthorization[];
  residents: Resident[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringAuthorization | null>(null);
  const [toDelete, setToDelete] = useState<RecurringAuthorization | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const computed = authorizations.map((a) => recurringAuthComputedStatus(a));
    return {
      total: authorizations.length,
      active: computed.filter((s) => s === "active").length,
      expiring: computed.filter((s) => s === "expiring").length,
      expired: computed.filter((s) => s === "expired").length,
    };
  }, [authorizations]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(a: RecurringAuthorization) {
    setEditing(a);
    setFormOpen(true);
  }

  function toggleStatus(a: RecurringAuthorization) {
    const nextStatus = a.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const res = await toggleRecurringAuthStatus(a.id, nextStatus);
      if (res.ok) toast.success(nextStatus === "active" ? "Autorização reativada." : "Autorização suspensa.");
      else toast.error(res.error ?? "Erro ao atualizar status.");
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deleteRecurringAuth(toDelete.id);
      if (res.ok) toast.success("Autorização excluída.");
      else toast.error(res.error ?? "Erro ao excluir.");
      setToDelete(null);
    });
  }

  const columns: Column<RecurringAuthorization>[] = [
    {
      key: "person",
      header: "Pessoa",
      sortable: true,
      sortValue: (a) => a.person_name.toLowerCase(),
      render: (a) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials(a.person_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{a.person_name}</p>
            <p className="text-xs text-muted-foreground">
              {a.category_label ?? PERSON_TYPE_LABELS[a.person_type]} · {a.person_document ?? "Sem documento"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "destination",
      header: "Destino",
      render: (a) => a.destination_label ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "recurrence",
      header: "Recorrência",
      render: (a) => {
        const summary = weekdayScheduleSummary(a.weekday_schedule) ?? a.recurrence_note;
        return summary ? <span className="text-sm">{summary}</span> : <span className="text-muted-foreground">Qualquer horário</span>;
      },
    },
    {
      key: "start_date",
      header: "Início",
      sortable: true,
      sortValue: (a) => a.start_date,
      render: (a) => <span className="text-sm">{formatDate(a.start_date)}</span>,
    },
    {
      key: "end_date",
      header: "Validade",
      sortable: true,
      sortValue: (a) => a.end_date ?? "",
      render: (a) => <span className="text-sm">{a.end_date ? formatDate(a.end_date) : "Indeterminado"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (a) => <ComputedStatusBadge auth={a} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[140px]",
      render: (a) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleStatus(a)}
            disabled={pending}
            aria-label={a.status === "active" ? "Suspender" : "Reativar"}
            title={a.status === "active" ? "Suspender" : "Reativar"}
          >
            {a.status === "active" ? <Ban className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(a)} aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToDelete(a)} aria-label="Excluir">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Recorrente" description="Autorizações de acesso periódico para moradores, visitantes e prestadores.">
        <Button onClick={openNew}>
          <Plus /> Novo acesso recorrente
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Autorizações" value={stats.total} icon={Repeat} accent="blue" />
        <StatCard label="Ativas" value={stats.active} icon={CheckCircle2} accent="green" />
        <StatCard label="Expirando em breve" value={stats.expiring} icon={AlertTriangle} accent="amber" />
        <StatCard label="Expiradas" value={stats.expired} icon={XCircle} accent="red" />
      </div>

      <DataTable
        data={authorizations}
        columns={columns}
        rowKey={(a) => a.id}
        searchAccessor={(a) => `${a.person_name} ${a.person_document ?? ""} ${a.destination_label ?? ""} ${a.recurrence_note ?? ""}`}
        searchPlaceholder="Buscar por nome, documento ou destino..."
        emptyMessage="Nenhum acesso recorrente cadastrado."
      />

      <RecurringFormDialog open={formOpen} onOpenChange={setFormOpen} authorization={editing} residents={residents} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir acesso recorrente"
        description={`Tem certeza que deseja excluir a autorização de "${toDelete?.person_name}"? Esta ação não pode ser desfeita.`}
        variant="destructive"
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
