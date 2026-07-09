"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Ban, ShieldCheck, X, UserRound, Car, IdCard, Phone, MapPin, Briefcase } from "lucide-react";
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
import { maskCNPJ, maskCPF } from "@/lib/utils";
import { maskRG, formatPlateMercosul, formatPlateOld, maskPhone, maskCEP } from "@/lib/masks";
import { useEnterSubmit } from "@/lib/form-utils";
import { MARITAL_STATUS_LABELS } from "@/lib/constants";
import { createEmployee, updateEmployee } from "@/app/(app)/funcionarios/actions";
import type { Employee, DocumentType, CpfCnpjKind, MaritalStatus } from "@/lib/database.types";

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

export function EmployeeForm({ open, onOpenChange, employee }: EmployeeFormProps) {
  const editing = !!employee;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(() => initial(employee));
  const [lastId, setLastId] = useState<string | null>(employee?.id ?? null);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [plateType, setPlateType] = useState<"mercosul" | "antiga">("mercosul");
  if (open && (employee?.id ?? null) !== lastId) {
    setForm(initial(employee));
    setLastId(employee?.id ?? null);
  }

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
      const res = editing ? await updateEmployee(employee!.id, payload) : await createEmployee(payload);
      if (res.ok) {
        toast.success(editing ? "Funcionário atualizado." : "Funcionário cadastrado.");
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Erro ao salvar.");
      }
    });
  }

  function setBlocked(blocked: boolean) {
    if (!employee) return;
    const status = blocked ? "inactive" : "active";
    startTransition(async () => {
      const res = await updateEmployee(employee.id, { ...form, marital_status: (form.marital_status || null) as MaritalStatus | null, status });
      if (res.ok) {
        toast.success(blocked ? "Funcionário bloqueado." : "Funcionário desbloqueado.");
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
        className="max-w-3xl"
        hideClose
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-0">
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
                <Badge className="mb-2 border-0 bg-white/20 text-white hover:bg-white/30">Funcionário</Badge>
                <DialogTitle className="truncate text-2xl font-bold text-white">
                  {editing ? form.full_name || "Editar funcionário" : "Novo funcionário"}
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
          {/* Dados pessoais */}
          <Section icon={UserRound} title="Dados Pessoais">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo *">
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              </Field>
              <Field label="Empresa / Terceirizada">
                <Input value={form.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} placeholder="Ex.: Zeladoria própria" />
              </Field>
              <Field label="Cargo / Função">
                <Input value={form.role_title ?? ""} onChange={(e) => set("role_title", e.target.value)} placeholder="Ex.: Zelador, Faxineira" />
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
                    onValueChange={(v) => { set("cpf_type", v as CpfCnpjKind); set("cpf", ""); }}
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
                    onChange={(e) => set("cpf", form.cpf_type === "cnpj" ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                    placeholder={form.cpf_type === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                  />
                </div>
              </Field>
              <Field label="Documento (RG / CNH)">
                <div className="flex gap-2">
                  <Select value={form.document_type} onValueChange={(v) => set("document_type", v as DocumentType)}>
                    <SelectTrigger className="w-[100px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rg">RG</SelectItem>
                      <SelectItem value="cnh">CNH</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={form.document_number ?? ""} onChange={(e) => set("document_number", maskRG(e.target.value))} placeholder="Número" />
                </div>
              </Field>
            </div>
          </Section>

          {/* Contato */}
          <Section icon={Phone} title="Contato">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telefone">
                <Input value={form.phone ?? ""} onChange={(e) => set("phone", maskPhone(e.target.value))} placeholder="(00) 0000-0000" />
              </Field>
              <Field label="Celular">
                <Input value={form.mobile ?? ""} onChange={(e) => set("mobile", maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="funcionario@email.com" />
              </Field>
            </div>
          </Section>

          {/* Endereço */}
          <Section icon={MapPin} title="Endereço">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="CEP">
                <Input value={form.cep ?? ""} onChange={(e) => set("cep", maskCEP(e.target.value))} placeholder="00000-000" />
              </Field>
              <div className="lg:col-span-2">
                <Field label="Rua">
                  <Input value={form.street ?? ""} onChange={(e) => set("street", e.target.value)} />
                </Field>
              </div>
              <Field label="Número">
                <Input value={form.number ?? ""} onChange={(e) => set("number", e.target.value)} />
              </Field>
              <Field label="Complemento">
                <Input value={form.complement ?? ""} onChange={(e) => set("complement", e.target.value)} />
              </Field>
              <Field label="Bairro">
                <Input value={form.neighborhood ?? ""} onChange={(e) => set("neighborhood", e.target.value)} />
              </Field>
              <Field label="Cidade">
                <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Documentos */}
          <Section icon={IdCard} title="Documentos">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DocumentUpload label="Documento (RG/CNH)" value={form.document_photo_url} onChange={(url) => set("document_photo_url", url)} folder="employee-documents" framed />
              <DocumentUpload label="Antecedentes Criminais" value={form.document_criminal_url} onChange={(url) => set("document_criminal_url", url)} folder="employee-documents" framed />
              <DocumentUpload label="Comprovante de Endereço" value={form.document_address_url} onChange={(url) => set("document_address_url", url)} folder="employee-documents" framed />
            </div>
          </Section>

          {/* Veículo */}
          <Section icon={Car} title="Veículo">
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
                  onChange={(e) => set("vehicle_plate", plateType === "mercosul" ? formatPlateMercosul(e.target.value) : formatPlateOld(e.target.value))}
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
          </Section>

          {/* Observações */}
          <Section icon={Briefcase} title="Observações">
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Anotações internas sobre o funcionário..." rows={3} />
          </Section>
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
        title="Bloquear funcionário"
        description={`Tem certeza que deseja bloquear "${form.full_name}"?`}
        variant="destructive"
        confirmLabel="Bloquear"
        loading={pending}
        onConfirm={() => setBlocked(true)}
      />
    </Dialog>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
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

function initial(e?: Employee | null) {
  return {
    full_name: e?.full_name ?? "",
    company_name: e?.company_name ?? "",
    role_title: e?.role_title ?? "",
    marital_status: e?.marital_status ?? "",
    cpf: e?.cpf ?? "",
    cpf_type: (e?.cpf_type ?? "cpf") as CpfCnpjKind,
    document_type: (e?.document_type ?? "rg") as DocumentType,
    document_number: e?.document_number ?? "",
    document_photo_url: e?.document_photo_url ?? null,
    document_criminal_url: e?.document_criminal_url ?? null,
    document_address_url: e?.document_address_url ?? null,
    photo_url: e?.photo_url ?? null,
    phone: e?.phone ?? "",
    mobile: e?.mobile ?? "",
    whatsapp: e?.whatsapp ?? "",
    email: e?.email ?? "",
    cep: e?.cep ?? "",
    street: e?.street ?? "",
    number: e?.number ?? "",
    complement: e?.complement ?? "",
    neighborhood: e?.neighborhood ?? "",
    city: e?.city ?? "",
    vehicle_type: e?.vehicle_type ?? "automovel",
    vehicle_plate: e?.vehicle_plate ?? "",
    vehicle_brand: e?.vehicle_brand ?? "",
    vehicle_model: e?.vehicle_model ?? "",
    vehicle_color: e?.vehicle_color ?? "",
    notes: e?.notes ?? "",
    status: (e?.status ?? "active") as "active" | "inactive",
  };
}
