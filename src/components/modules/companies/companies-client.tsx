"use client";

import { useState } from "react";
import { Plus, Pencil, Building2, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyForm } from "./company-form";
import type { Company } from "@/lib/database.types";

export type CompanyRow = Company & { porters: number };

export function CompaniesClient({ companies }: { companies: CompanyRow[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const columns: Column<CompanyRow>[] = [
    {
      key: "name",
      header: "Condomínio",
      sortable: true,
      sortValue: (c) => c.name.toLowerCase(),
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.cnpj ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Localização",
      render: (c) =>
        c.city ? (
          <span className="inline-flex items-center gap-1 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            {c.city}
            {c.state ? `/${c.state}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (c) => (
        <div className="text-sm">
          <p>{c.phone ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{c.email ?? ""}</p>
        </div>
      ),
    },
    {
      key: "porters",
      header: "Porteiros",
      render: (c) => <Badge variant="secondary">{c.porters}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (c) => c.status,
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[80px]",
      render: (c) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(c);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Empresas" description="Gerencie os condomínios da plataforma.">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus /> Nova empresa
        </Button>
      </PageHeader>

      <DataTable
        data={companies}
        columns={columns}
        rowKey={(c) => c.id}
        searchAccessor={(c) => `${c.name} ${c.cnpj ?? ""} ${c.city ?? ""} ${c.email ?? ""}`}
        searchPlaceholder="Buscar por nome, CNPJ ou cidade..."
        emptyMessage="Nenhuma empresa cadastrada."
      />

      <CompanyForm open={formOpen} onOpenChange={setFormOpen} company={editing} />
    </>
  );
}
