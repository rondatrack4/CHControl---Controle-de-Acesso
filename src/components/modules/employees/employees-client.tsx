"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Contact, UserCheck, Ban, Car } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmployeeForm } from "./employee-form";
import { deleteEmployee } from "@/app/(app)/funcionarios/actions";
import { initials } from "@/lib/utils";
import type { Employee } from "@/lib/database.types";

export function EmployeesClient({ employees }: { employees: Employee[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((e) => e.status === "active").length,
      blocked: employees.filter((e) => e.status === "inactive").length,
      withVehicle: employees.filter((e) => !!e.vehicle_plate).length,
    }),
    [employees]
  );

  function confirmDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deleteEmployee(toDelete.id);
      if (res.ok) toast.success("Funcionário excluído.");
      else toast.error(res.error ?? "Erro ao excluir.");
      setToDelete(null);
    });
  }

  const columns: Column<Employee>[] = [
    {
      key: "full_name",
      header: "Funcionário",
      sortable: true,
      sortValue: (e) => e.full_name.toLowerCase(),
      render: (e) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {e.photo_url ? <AvatarImage src={e.photo_url} /> : null}
            <AvatarFallback>{initials(e.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{e.full_name}</p>
            <p className="text-xs text-muted-foreground">{e.role_title || e.cpf || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "company_name",
      header: "Empresa",
      render: (e) => e.company_name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "contact",
      header: "Contato",
      render: (e) => (
        <div>
          <p className="text-sm">{e.mobile || e.phone || "—"}</p>
          {e.email && <p className="text-xs text-muted-foreground">{e.email}</p>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (e) => e.status,
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (e) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setFormOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToDelete(e)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Funcionários" description="Cadastro dos funcionários do condomínio.">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus /> Novo funcionário
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Funcionários" value={stats.total} icon={Contact} accent="blue" />
        <StatCard label="Ativos" value={stats.active} icon={UserCheck} accent="green" />
        <StatCard label="Bloqueados" value={stats.blocked} icon={Ban} accent="red" />
        <StatCard label="Com veículo" value={stats.withVehicle} icon={Car} accent="violet" />
      </div>

      <DataTable
        data={employees}
        columns={columns}
        rowKey={(e) => e.id}
        searchAccessor={(e) => `${e.full_name} ${e.cpf ?? ""} ${e.company_name ?? ""} ${e.role_title ?? ""} ${e.mobile ?? ""}`}
        searchPlaceholder="Buscar por nome, empresa, cargo ou CPF..."
        emptyMessage="Nenhum funcionário cadastrado."
      />

      <EmployeeForm open={formOpen} onOpenChange={setFormOpen} employee={editing} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir funcionário"
        description={`Excluir "${toDelete?.full_name}"?`}
        variant="destructive"
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
