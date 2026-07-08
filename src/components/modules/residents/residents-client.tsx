"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, Phone, ShieldCheck, Users, UserCheck, KeyRound, Building2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResidenceBadge } from "@/components/shared/residence-badge";
import { ResidentForm } from "./resident-form";
import { deleteResident } from "@/app/(app)/moradores/actions";
import { residenceLabel, residenceLabels, initials } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import type { Resident } from "@/lib/database.types";

export function ResidentsClient({
  residents,
  residentIdsWithPortalAccess,
}: {
  residents: Resident[];
  residentIdsWithPortalAccess: string[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resident | null>(null);
  const [toDelete, setToDelete] = useState<Resident | null>(null);
  const [pending, startTransition] = useTransition();
  const portalAccessSet = new Set(residentIdsWithPortalAccess);

  const stats = useMemo(
    () => ({
      total: residents.length,
      active: residents.filter((r) => r.status === "active").length,
      withPortal: residents.filter((r) => portalAccessSet.has(r.id)).length,
      multiResidence: residents.filter((r) => (r.residences?.length ?? 1) > 1).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [residents, residentIdsWithPortalAccess]
  );

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(r: Resident) {
    setEditing(r);
    setFormOpen(true);
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      openNew();
      router.replace("/moradores");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function confirmDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deleteResident(toDelete.id);
      if (res.ok) toast.success("Morador excluído.");
      else toast.error(res.error ?? "Erro ao excluir.");
      setToDelete(null);
    });
  }

  const columns: Column<Resident>[] = [
    {
      key: "full_name",
      header: "Morador",
      sortable: true,
      sortValue: (r) => r.full_name.toLowerCase(),
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {r.photo_url ? <AvatarImage src={r.photo_url} /> : null}
            <AvatarFallback>{initials(r.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-medium">{r.full_name}</p>
              {portalAccessSet.has(r.id) && (
                <Badge variant="success" className="gap-1 text-[10px]">
                  <ShieldCheck className="h-3 w-3" /> Acesso ao Portal
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{r.cpf}</p>
          </div>
        </div>
      ),
    },
    {
      key: "residence",
      header: "Residência",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span>{residenceLabel(r)}</span>
          <ResidenceBadge resident={r} />
        </div>
      ),
    },
    {
      key: "document",
      header: "Documento",
      render: (r) => (
        <span className="text-sm">
          {DOCUMENT_TYPE_LABELS[r.document_type]} {r.document_number ?? ""}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Contato",
      render: (r) =>
        r.phone ? (
          <span className="inline-flex items-center gap-1 text-sm">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {r.phone}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => setToDelete(r)}
            aria-label="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Moradores" description="Cadastro de moradores do condomínio.">
        <Button onClick={openNew}>
          <Plus /> Novo morador
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Moradores" value={stats.total} icon={Users} accent="blue" />
        <StatCard label="Ativos" value={stats.active} icon={UserCheck} accent="green" />
        <StatCard label="Acesso ao portal" value={stats.withPortal} icon={KeyRound} accent="violet" />
        <StatCard label="Múltiplas residências" value={stats.multiResidence} icon={Building2} accent="amber" />
      </div>

      <DataTable
        data={residents}
        columns={columns}
        rowKey={(r) => r.id}
        searchAccessor={(r) =>
          `${r.full_name} ${r.cpf} ${r.document_number ?? ""} ${residenceLabels(r).join(" ")} ${r.phone ?? ""}`
        }
        searchPlaceholder="Buscar por nome, CPF/CNPJ, RG ou quadra e lote..."
        emptyMessage="Nenhum morador cadastrado."
      />

      <ResidentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        resident={editing}
        hasPortalAccess={editing ? portalAccessSet.has(editing.id) : false}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir morador"
        description={`Tem certeza que deseja excluir "${toDelete?.full_name}"? Esta ação não pode ser desfeita.`}
        variant="destructive"
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
