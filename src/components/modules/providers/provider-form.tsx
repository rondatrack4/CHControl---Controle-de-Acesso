"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Home, Ban, ShieldCheck, X, UserRound, Car, IdCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { PhotoAvatar } from "@/components/shared/photo-crop";
import { DocumentUpload } from "@/components/shared/document-upload";
import { ResidentCombobox } from "@/components/shared/resident-combobox";
import { maskCNPJ, maskCPF, residenceLabel } from "@/lib/utils";
import { maskRG, formatPlateMercosul, formatPlateOld } from "@/lib/masks";
import { useEnterSubmit } from "@/lib/form-utils";
import { MARITAL_STATUS_LABELS } from "@/lib/constants";
import { createProvider, updateProvider } from "@/app/(app)/prestadores/actions";
import type { KnownPersonResult } from "@/app/(app)/acessos/actions";
import type { ServiceProvider, Resident, DocumentType, CpfCnpjKind, MaritalStatus } from "@/lib/database.types";

interface ProviderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: ServiceProvider | null;
  residents: Resident[];
  /** Chamado após um cadastro bem-sucedido (apenas na criação), com os dados já no formato de busca de acesso. */
  onCreated?: (person: KnownPersonResult) => void;
}

export function ProviderForm({ open, onOpenChange, provider, residents, onCreated }: ProviderFormProps) {
  const editing = !!provider;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(() => initial(provider));
  const [lastId, setLastId] = useState<string | null>(provider?.id ?? null);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [plateType, setPlateType] = useState<"mercosul" | "antiga">("mercosul");
  if (open && (provider?.id ?? null) !== lastId) {
    setForm(initial(provider));
    setLastId(provider?.id ?? null);
  }

  const selectedResident = residents.find((r) => r.id === form.resident_id) ?? null;
  const isBlocked = form.status === "inactive";

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handlePlateTypeChange(newType: "mercosul" | "antiga") {
    setPlateType(newType);
    if (form.vehicle_plate) {
      set("vehicle_plate", newType === "mercosul" ? formatPlateMercosul(form.vehicle_plate) : formatPlateOld(form.vehicle_plate));
    }
  }

  function submit() {
    startTransition(async () => {
      const payload = { ...form, marital_status: (form.marital_status || null) as MaritalStatus | null };
      const res = editing
        ? await updateProvider(provider!.id, payload)
        : await createProvider(payload);
      if (res.ok) {
        toast.success(editing ? "Prestador atualizado." : "Prestador cadastrado.");
        if (!editing && res.id) {
          const resident = residents.find((r) => r.id === form.resident_id);
          onCreated?.({
            id: res.id,
            person_type: "service_provider",
            full_name: form.full_name,
            cpf: form.cpf || null,
            cpf_type: form.cpf_type,
            document_type: form.document_type,
            document_number: form.document_number || null,
            phone: form.phone || null,
            photo_url: form.photo_url,
            company_name: form.company_name || null,
            service_type: form.service_type || null,
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
    if (!provider) return;
    const status = blocked ? "inactive" : "active";
    startTransition(async () => {
      const res = await updateProvider(provider.id, { ...form, marital_status: (form.marital_status || null) as MaritalStatus | null, status });
      if (res.ok) {
        toast.success(blocked ? "Prestador bloqueado." : "Prestador desbloqueado.");
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
      <DialogContent
        className="max-w-2xl"
        hideClose
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-0">
          {/* Banner com gradiente */}
          <div className="relative -mx-6 -mt-6 overflow-hidden rounded-t-lg bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 px-6 pb-6 pt-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-sky-300/10 blur-3xl" />

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/80 backdrop-blur-sm transition-all hover:bg-white/25 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex items-center gap-5">
              <PhotoAvatar
                value={form.photo_url}
                onChange={(u) => set("photo_url", u)}
                name={form.full_name}
                variant="banner"
              />
              <div className="min-w-0 flex-1">
                <Badge className="mb-2 border-0 bg-white/20 text-white hover:bg-white/30">Prestador</Badge>
                <DialogTitle className="truncate text-2xl font-bold text-white">
                  {editing ? form.full_name || "Editar prestador" : "Novo prestador"}
                </DialogTitle>
                {editing && (
                  <div className="mt-2">
                    <StatusBadge status={form.status} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1" onKeyDown={useEnterSubmit(submit)}>
          {/* Morador vinculado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Morador responsável *</Label>
            </div>
            <ResidentCombobox
              residents={residents}
              value={form.resident_id || null}
              onSelect={(r) => set("resident_id", r?.id ?? "")}
            />
            {selectedResident && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span>
                  Residência: <strong>{residenceLabel(selectedResident)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Dados pessoais */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Dados Pessoais</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo *">
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              </Field>
              <Field label="Empresa">
                <Input value={form.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} />
              </Field>
              <Field label="Estado civil">
                <Select value={form.marital_status || ""} onValueChange={(v) => set("marital_status", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MARITAL_STATUS_LABELS).map(([v, label]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select value={form.document_type} onValueChange={(v) => set("document_type", v as DocumentType)}>
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
              <Field label="Tipo de serviço">
                <Input value={form.service_type ?? ""} onChange={(e) => set("service_type", e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Documentos */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <IdCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Documentos</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DocumentUpload label="Documento (RG/CNH)" value={form.document_photo_url} onChange={(url) => set("document_photo_url", url)} folder="provider-documents" framed />
              <DocumentUpload label="Antecedentes Criminais" value={form.document_criminal_url} onChange={(url) => set("document_criminal_url", url)} folder="provider-documents" framed />
              <DocumentUpload label="Comprovante de Endereço" value={form.document_address_url} onChange={(url) => set("document_address_url", url)} folder="provider-documents" framed />
            </div>
          </div>

          {/* Veículo */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Veículo</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <Field label="Tipo de placa">
                <Select value={plateType} onValueChange={(v) => handlePlateTypeChange(v as "mercosul" | "antiga")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mercosul">Mercosul</SelectItem>
                    <SelectItem value="antiga">Placa Cinza</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Placa">
                <Input
                  value={form.vehicle_plate ?? ""}
                  onChange={(e) =>
                    set("vehicle_plate", plateType === "mercosul" ? formatPlateMercosul(e.target.value) : formatPlateOld(e.target.value))
                  }
                  placeholder={plateType === "mercosul" ? "ABC1D23" : "BUY-8593"}
                  maxLength={plateType === "mercosul" ? 7 : 8}
                  className="font-mono uppercase"
                />
              </Field>
              <Field label="Marca">
                <Input value={form.vehicle_brand ?? ""} onChange={(e) => set("vehicle_brand", e.target.value)} placeholder="Volkswagen" />
              </Field>
              <Field label="Modelo">
                <Input value={form.vehicle_model ?? ""} onChange={(e) => set("vehicle_model", e.target.value)} placeholder="Gol" />
              </Field>
              <Field label="Cor">
                <Input value={form.vehicle_color ?? ""} onChange={(e) => set("vehicle_color", e.target.value)} placeholder="Prata" />
              </Field>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Observações</h3>
            </div>
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Anotações internas sobre o prestador..." />
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2">
          {editing &&
            (isBlocked ? (
              <Button type="button" variant="outline" className="sm:mr-auto" onClick={() => setBlocked(false)} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Desbloquear
              </Button>
            ) : (
              <Button type="button" variant="destructive" className="sm:mr-auto" onClick={() => setConfirmBlockOpen(true)} disabled={pending}>
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
        title="Bloquear prestador"
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

function initial(p?: ServiceProvider | null) {
  return {
    full_name: p?.full_name ?? "",
    company_name: p?.company_name ?? "",
    marital_status: p?.marital_status ?? "",
    cpf: p?.cpf ?? "",
    cpf_type: (p?.cpf_type ?? "cpf") as CpfCnpjKind,
    document_type: (p?.document_type ?? "rg") as DocumentType,
    document_number: p?.document_number ?? "",
    phone: p?.phone ?? "",
    photo_url: p?.photo_url ?? null,
    vehicle_type: p?.vehicle_type ?? "automovel",
    vehicle_plate: p?.vehicle_plate ?? "",
    vehicle_brand: p?.vehicle_brand ?? "",
    vehicle_model: p?.vehicle_model ?? "",
    vehicle_color: p?.vehicle_color ?? "",
    document_photo_url: p?.document_photo_url ?? null,
    document_criminal_url: p?.document_criminal_url ?? null,
    document_address_url: p?.document_address_url ?? null,
    service_type: p?.service_type ?? "",
    notes: p?.notes ?? "",
    resident_id: p?.resident_id ?? "",
    category: p?.category ?? "prestador_servico",
    status: (p?.status ?? "active") as "active" | "inactive",
  };
}
