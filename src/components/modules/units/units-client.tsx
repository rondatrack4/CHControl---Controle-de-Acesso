"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Pencil, Home, Building2, MapPinned, CheckCircle2, X } from "lucide-react";
import { useEnterSubmit } from "@/lib/form-utils";
import { createUnit, updateUnit, deleteUnit, type UnitData } from "@/app/(app)/unidades/actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskCPF } from "@/lib/utils";
import { maskPhone } from "@/lib/masks";
import type { Unit, ResidenceType } from "@/lib/database.types";

function unitLabel(u: Unit) {
  return u.unit_type === "apartamento" ? `Bloco ${u.block ?? "—"}, Apto ${u.apartment ?? "—"}` : `Quadra ${u.quadra ?? "—"}, Lote ${u.lote ?? "—"}`;
}

export function UnitsClient({ units }: { units: Unit[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [toDelete, setToDelete] = useState<Unit | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => ({
    total: units.length,
    apartamentos: units.filter((u) => u.unit_type === "apartamento").length,
    lotes: units.filter((u) => u.unit_type === "lote").length,
    withOwner: units.filter((u) => !!u.owner_name).length,
  }), [units]);

  function onDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deleteUnit(toDelete.id);
      if (!res.ok) toast.error(res.error ?? "Falha ao deletar.");
      else toast.success("Unidade removida.");
      setToDelete(null);
    });
  }

  const columns: Column<Unit>[] = [
    {
      key: "type",
      header: "Tipo",
      render: (u) => (
        <span className="inline-flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {u.unit_type === "apartamento" ? <Building2 className="h-4 w-4" /> : <MapPinned className="h-4 w-4" />}
          </span>
          <span className="capitalize">{u.unit_type}</span>
        </span>
      ),
    },
    { key: "loc", header: "Localização", sortable: true, sortValue: (u) => unitLabel(u), render: (u) => <span className="font-medium">{unitLabel(u)}</span> },
    {
      key: "owner",
      header: "Proprietário",
      render: (u) => (
        <div>
          <p className="text-sm">{u.owner_name || "—"}</p>
          {u.owner_document && <p className="text-xs text-muted-foreground">{u.owner_document}</p>}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (u) => (
        <div className="text-xs">
          <p>{u.owner_phone || "—"}</p>
          {u.owner_email && <p className="text-muted-foreground">{u.owner_email}</p>}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (u) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(u); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToDelete(u)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Unidades" description="Cadastre e gerencie apartamentos, quadras e lotes do condomínio.">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova unidade
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de unidades" value={stats.total} icon={Home} accent="blue" />
        <StatCard label="Apartamentos" value={stats.apartamentos} icon={Building2} accent="violet" />
        <StatCard label="Lotes" value={stats.lotes} icon={MapPinned} accent="amber" />
        <StatCard label="Com proprietário" value={stats.withOwner} icon={CheckCircle2} accent="green" />
      </div>

      <DataTable
        data={units}
        columns={columns}
        rowKey={(u) => u.id}
        searchAccessor={(u) => `${unitLabel(u)} ${u.owner_name ?? ""} ${u.owner_phone ?? ""} ${u.owner_document ?? ""}`}
        searchPlaceholder="Buscar por localização ou proprietário..."
        emptyMessage="Nenhuma unidade cadastrada."
      />

      <UnitForm open={open} onOpenChange={setOpen} unit={editing} pending={pending} startTransition={startTransition} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir unidade"
        description={`Excluir "${toDelete ? unitLabel(toDelete) : ""}"?`}
        variant="destructive"
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={onDelete}
      />
    </>
  );
}

function UnitForm({
  open, onOpenChange, unit, pending, startTransition,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unit: Unit | null;
  pending: boolean;
  startTransition: React.TransitionStartFunction;
}) {
  const editing = !!unit;
  const [form, setForm] = useState(() => initial(unit));
  const [lastId, setLastId] = useState<string | null>(unit?.id ?? null);
  if (open && (unit?.id ?? null) !== lastId) {
    setForm(initial(unit));
    setLastId(unit?.id ?? null);
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const data: UnitData = {
      unit_type: form.unit_type,
      block: form.block, apartment: form.apartment, quadra: form.quadra, lote: form.lote,
      owner_name: form.owner_name, owner_phone: form.owner_phone, owner_email: form.owner_email,
      owner_document: form.owner_document, notes: form.notes,
    };
    startTransition(async () => {
      const res = editing ? await updateUnit(unit!.id, data) : await createUnit(data);
      if (res.ok) {
        toast.success(editing ? "Unidade atualizada." : "Unidade criada.");
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Falha ao salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" hideClose>
        <DialogHeader className="space-y-0">
          <div className="relative -mx-6 -mt-6 overflow-hidden rounded-t-lg bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 px-6 pb-5 pt-6 text-white">
            <button type="button" onClick={() => onOpenChange(false)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 hover:bg-white/25" aria-label="Fechar"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Home className="h-5 w-5" /></span>
              <DialogTitle className="text-xl font-bold">{editing ? "Editar unidade" : "Nova unidade"}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1" onKeyDown={useEnterSubmit(submit)}>
          <div className="space-y-1.5">
            <Label>Tipo de unidade</Label>
            <Select value={form.unit_type} onValueChange={(v) => set("unit_type", v as ResidenceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="apartamento">Apartamento</SelectItem>
                <SelectItem value="lote">Lote</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.unit_type === "apartamento" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Bloco *</Label><Input value={form.block} onChange={(e) => set("block", e.target.value)} placeholder="A" /></div>
              <div className="space-y-1.5"><Label>Apartamento *</Label><Input value={form.apartment} onChange={(e) => set("apartment", e.target.value)} placeholder="101" /></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Quadra *</Label><Input value={form.quadra} onChange={(e) => set("quadra", e.target.value)} placeholder="01" /></div>
              <div className="space-y-1.5"><Label>Lote *</Label><Input value={form.lote} onChange={(e) => set("lote", e.target.value)} placeholder="001" /></div>
            </div>
          )}

          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold">Proprietário</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Nome</Label><Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>CPF</Label><Input value={form.owner_document} onChange={(e) => set("owner_document", maskCPF(e.target.value))} placeholder="000.000.000-00" /></div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.owner_phone} onChange={(e) => set("owner_phone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" /></div>
              <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} /></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Ex.: vaga de garagem, box, restrições..." />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancelar</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initial(u: Unit | null) {
  return {
    unit_type: (u?.unit_type ?? "apartamento") as ResidenceType,
    block: u?.block ?? "",
    apartment: u?.apartment ?? "",
    quadra: u?.quadra ?? "",
    lote: u?.lote ?? "",
    owner_name: u?.owner_name ?? "",
    owner_phone: u?.owner_phone ?? "",
    owner_email: u?.owner_email ?? "",
    owner_document: u?.owner_document ?? "",
    notes: u?.notes ?? "",
  };
}
