"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Home, Ban, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { PhotoUpload } from "@/components/shared/photo-upload";
import { DocumentUpload } from "@/components/shared/document-upload";
import { ResidentCombobox } from "@/components/shared/resident-combobox";
import { maskCNPJ, maskCPF, residenceLabel } from "@/lib/utils";
import { maskRG, maskPlate } from "@/lib/masks";
import { createVisitor, updateVisitor } from "@/app/(app)/visitantes/actions";
import type { KnownPersonResult } from "@/app/(app)/acessos/actions";
import type { Visitor, Resident, DocumentType, CpfCnpjKind } from "@/lib/database.types";

interface VisitorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitor?: Visitor | null;
  residents: Resident[];
  /** Chamado após um cadastro bem-sucedido (apenas na criação), com os dados já no formato de busca de acesso. */
  onCreated?: (person: KnownPersonResult) => void;
}

export function VisitorForm({ open, onOpenChange, visitor, residents, onCreated }: VisitorFormProps) {
  const editing = !!visitor;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(() => initial(visitor));
  const [lastId, setLastId] = useState<string | null>(visitor?.id ?? null);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  if (open && (visitor?.id ?? null) !== lastId) {
    setForm(initial(visitor));
    setLastId(visitor?.id ?? null);
  }

  const selectedResident = residents.find((r) => r.id === form.resident_id) ?? null;
  const isBlocked = form.status === "inactive";

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      const res = editing
        ? await updateVisitor(visitor!.id, form)
        : await createVisitor(form);
      if (res.ok) {
        toast.success(editing ? "Visitante atualizado." : "Visitante cadastrado.");
        if (!editing && res.id) {
          const resident = residents.find(r => r.id === form.resident_id);
          onCreated?.({
            id: res.id,
            person_type: "visitor",
            full_name: form.full_name,
            cpf: form.cpf || null,
            cpf_type: form.cpf_type,
            document_type: form.document_type,
            document_number: form.document_number || null,
            phone: form.phone || null,
            photo_url: form.photo_url,
            company_name: null,
            service_type: null,
            vehicle_type: form.vehicle_type || "automovel",
            vehicle_plate: form.vehicle_plate || null,
            vehicle_brand: form.vehicle_brand || null,
            vehicle_model: form.vehicle_model || null,
            vehicle_color: form.vehicle_color || null,
            category: form.category,
            residentName: resident?.full_name ?? null,
            residenceLabel: resident ? residenceLabel(resident) : null,
            last_visit_at: null,
            last_destination_label: null,
          });
        }
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Erro ao salvar.");
      }
    });
  }

  function setBlocked(blocked: boolean) {
    if (!visitor) return;
    const status = blocked ? "inactive" : "active";
    startTransition(async () => {
      const res = await updateVisitor(visitor.id, { ...form, status });
      if (res.ok) {
        toast.success(blocked ? "Visitante bloqueado." : "Visitante desbloqueado.");
        set("status", status);
        setConfirmBlockOpen(false);
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Erro ao atualizar status.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar visitante" : "Novo visitante"}</DialogTitle>
          <DialogDescription>
            Vincule o visitante a um morador responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <PhotoUpload value={form.photo_url} onChange={(u) => set("photo_url", u)} folder="visitors" />

          <div className="space-y-1.5">
            <Label>Morador responsável *</Label>
            <ResidentCombobox
              residents={residents}
              value={form.resident_id || null}
              onSelect={(r) => set("resident_id", r?.id ?? "")}
            />
            {selectedResident && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span>Residência: <strong>{residenceLabel(selectedResident)}</strong></span>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo *">
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </Field>
            <Field label={form.cpf_type === "cnpj" ? "CNPJ" : "CPF"}>
              <div className="flex gap-2">
                <Select
                  value={form.cpf_type}
                  onValueChange={(v) => {
                    set("cpf_type", v as CpfCnpjKind);
                    set("cpf", "");
                  }}
                >
                  <SelectTrigger className="w-[110px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={form.cpf ?? ""}
                  onChange={(e) =>
                    set("cpf", form.cpf_type === "cnpj" ? maskCNPJ(e.target.value) : maskCPF(e.target.value))
                  }
                  placeholder={form.cpf_type === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                />
              </div>
            </Field>
            <Field label="Tipo de documento">
              <Select
                value={form.document_type}
                onValueChange={(v) => set("document_type", v as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rg">RG</SelectItem>
                  <SelectItem value="cnh">CNH</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Número do documento">
              <Input
                value={form.document_number ?? ""}
                onChange={(e) => set("document_number", maskRG(e.target.value))}
              />
            </Field>
            <Field label="Telefone">
              <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            {editing && (
              <Field label="Status">
                <div className="flex h-10 items-center">
                  <StatusBadge status={form.status} />
                </div>
              </Field>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-sm font-semibold">Documento</p>
            <DocumentUpload
              value={form.document_photo_url}
              onChange={(url) => set("document_photo_url", url)}
              folder="visitor-documents"
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-sm font-semibold">Veículo</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Tipo">
                <Select value={form.vehicle_type || "automovel"} onValueChange={(v) => set("vehicle_type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automovel">Automóvel</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="caminhao">Caminhão</SelectItem>
                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Placa">
                <Input
                  value={form.vehicle_plate ?? ""}
                  onChange={(e) => set("vehicle_plate", maskPlate(e.target.value))}
                  placeholder="ABC1D23"
                />
              </Field>
              <Field label="Marca">
                <Input
                  value={form.vehicle_brand ?? ""}
                  onChange={(e) => set("vehicle_brand", e.target.value)}
                  placeholder="Volkswagen"
                />
              </Field>
              <Field label="Modelo">
                <Input
                  value={form.vehicle_model ?? ""}
                  onChange={(e) => set("vehicle_model", e.target.value)}
                  placeholder="Gol"
                />
              </Field>
              <Field label="Cor">
                <Input
                  value={form.vehicle_color ?? ""}
                  onChange={(e) => set("vehicle_color", e.target.value)}
                  placeholder="Prata"
                />
              </Field>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2">
          {editing &&
            (isBlocked ? (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                onClick={() => setBlocked(false)}
                disabled={pending}
              >
                {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Desbloquear
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={() => setConfirmBlockOpen(true)}
                disabled={pending}
              >
                <Ban /> Bloquear
              </Button>
            ))}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {editing ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={confirmBlockOpen}
        onOpenChange={setConfirmBlockOpen}
        title="Bloquear visitante"
        description={`Tem certeza que deseja bloquear "${form.full_name}"? Ele deixará de aparecer no controle de acesso e não poderá mais registrar entrada.`}
        variant="destructive"
        confirmLabel="Bloquear"
        loading={pending}
        onConfirm={() => setBlocked(true)}
      />
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function initial(v?: Visitor | null) {
  return {
    full_name: v?.full_name ?? "",
    cpf: v?.cpf ?? "",
    cpf_type: (v?.cpf_type ?? "cpf") as CpfCnpjKind,
    document_type: (v?.document_type ?? "rg") as DocumentType,
    document_number: v?.document_number ?? "",
    phone: v?.phone ?? "",
    photo_url: v?.photo_url ?? null,
    resident_id: v?.resident_id ?? "",
    category: v?.category ?? "visitante",
    vehicle_type: v?.vehicle_type ?? "automovel",
    vehicle_plate: v?.vehicle_plate ?? "",
    vehicle_brand: v?.vehicle_brand ?? "",
    vehicle_model: v?.vehicle_model ?? "",
    vehicle_color: v?.vehicle_color ?? "",
    document_photo_url: v?.document_photo_url ?? null,
    status: (v?.status ?? "active") as "active" | "inactive",
  };
}
