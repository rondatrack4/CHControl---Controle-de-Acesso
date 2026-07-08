"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, UserPlus, UserCheck, Ban, Car } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VisitorForm } from "./visitor-form";
import { deleteVisitor } from "@/app/(app)/visitantes/actions";
import { initials, residenceLabel } from "@/lib/utils";
import type { Resident, Visitor } from "@/lib/database.types";

export type VisitorRow = Visitor & { resident: Resident | null };

export function VisitorsClient({
  visitors,
  residents,
}: {
  visitors: VisitorRow[];
  residents: Resident[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Visitor | null>(null);
  const [toDelete, setToDelete] = useState<VisitorRow | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(
    () => ({
      total: visitors.length,
      active: visitors.filter((v) => v.status === "active").length,
      blocked: visitors.filter((v) => v.status === "inactive").length,
      withVehicle: visitors.filter((v) => !!v.vehicle_plate).length,
    }),
    [visitors]
  );

  function confirmDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deleteVisitor(toDelete.id);
      if (res.ok) toast.success("Visitante excluído.");
      else toast.error(res.error ?? "Erro ao excluir.");
      setToDelete(null);
    });
  }

  const columns: Column<VisitorRow>[] = [
    {
      key: "full_name",
      header: "Visitante",
      sortable: true,
      sortValue: (v) => v.full_name.toLowerCase(),
      render: (v) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {v.photo_url ? <AvatarImage src={v.photo_url} /> : null}
            <AvatarFallback>{initials(v.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{v.full_name}</p>
            <p className="text-xs text-muted-foreground">{v.cpf ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "resident",
      header: "Morador responsável",
      render: (v) => (
        <div>
          <p className="text-sm font-medium">{v.resident?.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {v.resident ? residenceLabel(v.resident) : ""}
          </p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Telefone",
      render: (v) => v.phone ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (v) => v.status,
      render: (v) => <StatusBadge status={v.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (v) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(v);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => setToDelete(v)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Visitantes" description="Cadastro de visitantes vinculados aos moradores.">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus /> Novo visitante
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Visitantes" value={stats.total} icon={UserPlus} accent="violet" />
        <StatCard label="Ativos" value={stats.active} icon={UserCheck} accent="green" />
        <StatCard label="Bloqueados" value={stats.blocked} icon={Ban} accent="red" />
        <StatCard label="Com veículo" value={stats.withVehicle} icon={Car} accent="blue" />
      </div>

      <DataTable
        data={visitors}
        columns={columns}
        rowKey={(v) => v.id}
        searchAccessor={(v) =>
          `${v.full_name} ${v.cpf ?? ""} ${v.resident?.full_name ?? ""} ${v.phone ?? ""}`
        }
        searchPlaceholder="Buscar por visitante, CPF ou morador..."
        emptyMessage="Nenhum visitante cadastrado."
      />

      <VisitorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        visitor={editing}
        residents={residents}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir visitante"
        description={`Excluir "${toDelete?.full_name}"?`}
        variant="destructive"
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
