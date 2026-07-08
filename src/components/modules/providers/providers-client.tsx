"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Car, Wrench, UserCheck, Ban } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProviderForm } from "./provider-form";
import { deleteProvider } from "@/app/(app)/prestadores/actions";
import { initials, residenceLabel } from "@/lib/utils";
import type { Resident, ServiceProvider } from "@/lib/database.types";

export type ProviderRow = ServiceProvider & { resident: Resident | null };

export function ProvidersClient({
  providers,
  residents,
}: {
  providers: ProviderRow[];
  residents: Resident[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceProvider | null>(null);
  const [toDelete, setToDelete] = useState<ProviderRow | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(
    () => ({
      total: providers.length,
      active: providers.filter((p) => p.status === "active").length,
      blocked: providers.filter((p) => p.status === "inactive").length,
      withVehicle: providers.filter((p) => !!p.vehicle_plate).length,
    }),
    [providers]
  );

  function confirmDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deleteProvider(toDelete.id);
      if (res.ok) toast.success("Prestador excluído.");
      else toast.error(res.error ?? "Erro ao excluir.");
      setToDelete(null);
    });
  }

  const columns: Column<ProviderRow>[] = [
    {
      key: "full_name",
      header: "Prestador",
      sortable: true,
      sortValue: (p) => p.full_name.toLowerCase(),
      render: (p) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {p.photo_url ? <AvatarImage src={p.photo_url} /> : null}
            <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{p.full_name}</p>
            <p className="text-xs text-muted-foreground">{p.company_name ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "service",
      header: "Serviço",
      render: (p) => p.service_type ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "vehicle",
      header: "Veículo",
      render: (p) => {
        const details = [p.vehicle_brand, p.vehicle_model, p.vehicle_color].filter(Boolean).join(" · ");
        return p.vehicle_plate ? (
          <div>
            <Badge variant="outline" className="gap-1">
              <Car className="h-3 w-3" /> {p.vehicle_plate}
            </Badge>
            {details && <p className="mt-1 text-xs text-muted-foreground">{details}</p>}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "resident",
      header: "Responsável",
      render: (p) => (
        <div>
          <p className="text-sm font-medium">{p.resident?.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {p.resident ? residenceLabel(p.resident) : ""}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (p) => p.status,
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(p);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToDelete(p)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Prestadores de Serviço" description="Cadastro de prestadores vinculados aos moradores.">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus /> Novo prestador
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Prestadores" value={stats.total} icon={Wrench} accent="amber" />
        <StatCard label="Ativos" value={stats.active} icon={UserCheck} accent="green" />
        <StatCard label="Bloqueados" value={stats.blocked} icon={Ban} accent="red" />
        <StatCard label="Com veículo" value={stats.withVehicle} icon={Car} accent="blue" />
      </div>

      <DataTable
        data={providers}
        columns={columns}
        rowKey={(p) => p.id}
        searchAccessor={(p) =>
          `${p.full_name} ${p.company_name ?? ""} ${p.service_type ?? ""} ${p.vehicle_plate ?? ""} ${p.vehicle_brand ?? ""} ${p.vehicle_model ?? ""} ${p.vehicle_color ?? ""} ${p.resident?.full_name ?? ""}`
        }
        searchPlaceholder="Buscar por prestador, empresa, serviço ou placa..."
        emptyMessage="Nenhum prestador cadastrado."
      />

      <ProviderForm open={formOpen} onOpenChange={setFormOpen} provider={editing} residents={residents} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir prestador"
        description={`Excluir "${toDelete?.full_name}"?`}
        variant="destructive"
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
