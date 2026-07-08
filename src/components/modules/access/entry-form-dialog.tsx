"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Wrench, UserRound, X } from "lucide-react";
import { useEnterSubmit } from "@/lib/form-utils";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { KnownPersonSearch } from "@/components/modules/access/known-person-search";
import { VisitorForm } from "@/components/modules/visitors/visitor-form";
import { ProviderForm } from "@/components/modules/providers/provider-form";
import { registerEntry, checkRecurringAuthToday, type KnownPersonResult } from "@/app/(app)/acessos/actions";
import { initials, maskCPF, maskCNPJ } from "@/lib/utils";
import { playEntrySound } from "@/lib/sound";
import { VISITOR_CATEGORY_LABELS, CATEGORY_TO_PERSON_TYPE } from "@/lib/constants";
import type { Resident, VisitorCategory, CpfCnpjKind, DocumentType } from "@/lib/database.types";
import type { DestinationInput } from "@/lib/validations";

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residents: Resident[];
}

function emptyDestination(): DestinationInput {
  return { resident_id: null, location_label: "Área comum", internal_location: "", service_note: "", notes: "" };
}

function initialForm() {
  return {
    existing_person_id: null as string | null,
    category: "visitante" as VisitorCategory,
    full_name: "",
    cpf: "",
    cpf_type: "cpf" as CpfCnpjKind,
    document_type: "rg" as DocumentType,
    document_number: "",
    phone: "",
    photo_url: null as string | null,
    company_name: "",
    service_type: "",
    vehicle_plate: "",
    vehicle_brand: "",
    vehicle_model: "",
    vehicle_color: "",
    reason: "",
    service_description: "",
    notes: "",
    expected_exit_at: "",
    priority: "normal" as "normal" | "urgente",
    destinations: [emptyDestination()],
    lastVisit: null as { at: string; label: string | null } | null,
    residentName: null as string | null,
    residenceLabel: null as string | null,
  };
}

export function EntryFormDialog({ open, onOpenChange, residents }: EntryFormDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [pending, startTransition] = useTransition();
  const [registerOptionsOpen, setRegisterOptionsOpen] = useState(false);
  const [visitorFormOpen, setVisitorFormOpen] = useState(false);
  const [providerFormOpen, setProviderFormOpen] = useState(false);
  const [recurringBlockReason, setRecurringBlockReason] = useState<string | null>(null);

  function set<K extends keyof ReturnType<typeof initialForm>>(key: K, value: ReturnType<typeof initialForm>[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSelectKnown(person: KnownPersonResult) {
    setForm((f) => ({
      ...f,
      existing_person_id: person.id,
      category: person.category,
      full_name: person.full_name,
      cpf: person.cpf ?? "",
      cpf_type: person.cpf_type,
      document_type: person.document_type,
      document_number: person.document_number ?? "",
      phone: person.phone ?? "",
      photo_url: person.photo_url,
      company_name: person.company_name ?? "",
      service_type: person.service_type ?? "",
      vehicle_plate: person.vehicle_plate ?? "",
      vehicle_brand: person.vehicle_brand ?? "",
      vehicle_model: person.vehicle_model ?? "",
      vehicle_color: person.vehicle_color ?? "",
      lastVisit: person.last_visit_at ? { at: person.last_visit_at, label: person.last_destination_label } : null,
      residentName: person.residentName ?? null,
      residenceLabel: person.residenceLabel ?? null,
    }));

    // Verificar recurring auth
    startTransition(async () => {
      const result = await checkRecurringAuthToday(person.id, person.person_type);
      setRecurringBlockReason(result.blocked ? result.reason ?? "Acesso não permitido." : null);
    });

    setRegisterOptionsOpen(false);
    setVisitorFormOpen(false);
    setProviderFormOpen(false);
  }

  function clearSelection() {
    setForm((f) => ({
      ...f,
      existing_person_id: null,
      category: "visitante",
      full_name: "",
      cpf: "",
      cpf_type: "cpf",
      document_type: "rg",
      document_number: "",
      phone: "",
      photo_url: null,
      company_name: "",
      service_type: "",
      vehicle_plate: "",
      vehicle_brand: "",
      vehicle_model: "",
      vehicle_color: "",
      lastVisit: null,
      residentName: null,
      residenceLabel: null,
    }));
    setRecurringBlockReason(null);
    setRegisterOptionsOpen(false);
  }

  function close() {
    onOpenChange(false);
    setForm(initialForm());
    setRegisterOptionsOpen(false);
  }

  function submit() {
    startTransition(async () => {
      const res = await registerEntry({
        person: {
          person_type: CATEGORY_TO_PERSON_TYPE[form.category],
          existing_person_id: form.existing_person_id,
          full_name: form.full_name,
          cpf: form.cpf,
          cpf_type: form.cpf_type,
          document_type: form.document_type,
          document_number: form.document_number,
          phone: form.phone,
          photo_url: form.photo_url,
          company_name: form.company_name,
          service_type: form.service_type,
          vehicle_plate: form.vehicle_plate,
          vehicle_brand: form.vehicle_brand,
          vehicle_model: form.vehicle_model,
          vehicle_color: form.vehicle_color,
          category: form.category,
        },
        reason: form.reason,
        service_description: form.service_description,
        notes: form.notes,
        expected_exit_at: form.expected_exit_at ? new Date(form.expected_exit_at).toISOString() : null,
        priority: form.priority,
        destinations: form.destinations,
      });
      if (res.ok) {
        playEntrySound();
        toast.success("Entrada registrada.");
        close();
      } else {
        toast.error(res.error ?? "Erro ao registrar entrada.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Registrar Entrada</DialogTitle>
          <DialogDescription>
            Busque um cadastro existente para autopreencher os dados. Se não encontrar, cadastre um novo visitante ou prestador.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1" onKeyDown={useEnterSubmit(submit)}>
          {/* Pessoa */}
          <section className="space-y-4">
            <p className="text-sm font-semibold">Pessoa</p>

            {form.existing_person_id ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={form.photo_url ?? undefined} alt={form.full_name} />
                    <AvatarFallback>{initials(form.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-medium">{form.full_name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {VISITOR_CATEGORY_LABELS[form.category]}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">Cadastro existente</Badge>
                    </div>
                    {form.lastVisit && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        Última visita em {new Date(form.lastVisit.at).toLocaleString("pt-BR")}
                        {form.lastVisit.label ? ` · ${form.lastVisit.label}` : ""}
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                    <X className="h-3.5 w-3.5" /> Trocar
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Dados pré-preenchidos do cadastro. Ajustes feitos aqui valem só para esta entrada — o cadastro
                  original não é alterado.
                </p>

                {form.residentName && (
                  <div className="rounded-lg bg-blue-50 p-3 text-sm">
                    <p className="font-medium text-blue-900">Morador vinculado:</p>
                    <p className="text-blue-800">{form.residentName}</p>
                    {form.residenceLabel && <p className="text-xs text-blue-700">{form.residenceLabel}</p>}
                  </div>
                )}

                {recurringBlockReason && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm border border-red-200">
                    <p className="font-medium text-red-900">⛔ {recurringBlockReason}</p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Documento (CPF/CNPJ)</Label>
                    <div className="flex gap-2">
                      <Select value={form.cpf_type} onValueChange={(v) => set("cpf_type", v as CpfCnpjKind)}>
                        <SelectTrigger className="w-[100px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={form.cpf}
                        onChange={(e) => set("cpf", form.cpf_type === "cnpj" ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Empresa</Label>
                    <Input
                      value={form.company_name}
                      onChange={(e) => set("company_name", e.target.value)}
                      placeholder="Ex.: Uber, iFood, HidroFix Ltda"
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="mb-3 text-sm font-semibold">Veículo</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label>Placa</Label>
                      <Input
                        value={form.vehicle_plate}
                        onChange={(e) => set("vehicle_plate", e.target.value.toUpperCase())}
                        placeholder="ABC1D23"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Marca</Label>
                      <Input value={form.vehicle_brand} onChange={(e) => set("vehicle_brand", e.target.value)} placeholder="Volkswagen" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Modelo</Label>
                      <Input value={form.vehicle_model} onChange={(e) => set("vehicle_model", e.target.value)} placeholder="Gol" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cor</Label>
                      <Input value={form.vehicle_color} onChange={(e) => set("vehicle_color", e.target.value)} placeholder="Prata" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <KnownPersonSearch onSelect={handleSelectKnown} />
                {!registerOptionsOpen ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setRegisterOptionsOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Cadastrar
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
                    <p className="w-full text-xs text-muted-foreground">Cadastrar novo:</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setVisitorFormOpen(true)}>
                      <UserRound className="h-3.5 w-3.5" /> Visitante
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setProviderFormOpen(true)}>
                      <Wrench className="h-3.5 w-3.5" /> Prestador
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending || !!recurringBlockReason}>
            {pending && <Loader2 className="animate-spin" />}
            Registrar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>

      <VisitorForm
        open={visitorFormOpen}
        onOpenChange={setVisitorFormOpen}
        residents={residents}
        onCreated={handleSelectKnown}
      />
      <ProviderForm
        open={providerFormOpen}
        onOpenChange={setProviderFormOpen}
        residents={residents}
        onCreated={handleSelectKnown}
      />
    </Dialog>
  );
}
