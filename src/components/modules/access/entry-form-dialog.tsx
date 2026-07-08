"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Wrench, UserRound } from "lucide-react";
import { maskPlate } from "@/lib/masks";
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
import { KnownPersonSearch } from "@/components/modules/access/known-person-search";
import { VisitorForm } from "@/components/modules/visitors/visitor-form";
import { ProviderForm } from "@/components/modules/providers/provider-form";
import { registerEntry, type KnownPersonResult } from "@/app/(app)/acessos/actions";
import { residenceLabel } from "@/lib/utils";
import { playEntrySound } from "@/lib/sound";
import { VISITOR_CATEGORY_LABELS, CATEGORY_TO_PERSON_TYPE } from "@/lib/constants";
import type { Resident, VisitorCategory, CpfCnpjKind, DocumentType, Unit, AccessLog } from "@/lib/database.types";
import type { DestinationInput } from "@/lib/validations";

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residents: Resident[];
  units?: Unit[];
  inside?: AccessLog[];
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
    vehicle_type: "automovel" as string,
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
    residentName: null as string | null,
    residenceLabel: null as string | null,
    selectedDestinationResidentId: null as string | null,
  };
}

export function EntryFormDialog({ open, onOpenChange, residents, units = [], inside = [] }: EntryFormDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [pending, startTransition] = useTransition();
  const [registerOptionsOpen, setRegisterOptionsOpen] = useState(false);
  const [visitorFormOpen, setVisitorFormOpen] = useState(false);
  const [providerFormOpen, setProviderFormOpen] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSelectKnown(person: KnownPersonResult) {
    setForm((f) => ({
      ...f,
      existing_person_id: person.id,
      category: person.category,
      full_name: person.full_name,
      residentName: person.residentName ?? null,
      residenceLabel: person.residenceLabel ?? null,
      selectedDestinationResidentId: null,
    }));
    setRegisterOptionsOpen(false);
    setVisitorFormOpen(false);
    setProviderFormOpen(false);
  }

  function clearSelection() {
    setForm((f) => ({ ...initialForm(), category: f.category }));
    setRegisterOptionsOpen(false);
  }

  function close() {
    onOpenChange(false);
    setForm(initialForm());
    setRegisterOptionsOpen(false);
  }

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    // Validar se pessoa já está dentro
    if (form.existing_person_id) {
      const alreadyInside = inside.some(
        (log) => log.person_id === form.existing_person_id && log.person_type === CATEGORY_TO_PERSON_TYPE[form.category]
      );
      if (alreadyInside) {
        toast.error("Esta pessoa já está registrada como dentro do condomínio.");
        return;
      }
    }

    let destinations = form.destinations;
    if (form.selectedDestinationResidentId) {
      const selectedResident = residents.find((r) => r.id === form.selectedDestinationResidentId);
      if (selectedResident) {
        destinations = [
          {
            ...form.destinations[0],
            resident_id: selectedResident.id,
            location_label: residenceLabel(selectedResident),
          },
          ...form.destinations.slice(1),
        ];
      }
    }

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
        destinations,
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

  if (!form.existing_person_id) {
    return (
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Entrada</DialogTitle>
            <DialogDescription>Busque ou cadastre uma pessoa</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <KnownPersonSearch onSelect={handleSelectKnown} />

            {!registerOptionsOpen ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setRegisterOptionsOpen(true)} className="w-full">
                <Plus className="h-4 w-4" /> Cadastrar nova pessoa
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setVisitorFormOpen(true)} className="flex-1">
                  <UserRound className="h-4 w-4" /> Visitante
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setProviderFormOpen(true)} className="flex-1">
                  <Wrench className="h-4 w-4" /> Prestador
                </Button>
              </div>
            )}
          </div>

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
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Entrada</DialogTitle>
          <DialogDescription>{form.full_name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          {/* Pessoa */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pessoa</h3>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Trocar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{form.full_name}</p>
            {form.residentName && (
              <p className="text-sm">
                Vinculado: <strong>{form.residentName}</strong>
              </p>
            )}
          </div>

          {/* Local */}
          <div className="space-y-3">
            <Label>Local de visita *</Label>
            <Select value={form.selectedDestinationResidentId || ""} onValueChange={(v) => set("selectedDestinationResidentId", v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o local" />
              </SelectTrigger>
              <SelectContent>
                {form.residentName && (
                  <SelectItem value={form.residentName}>
                    {form.residentName} (vinculado)
                  </SelectItem>
                )}
                {residents.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.full_name}
                  </SelectItem>
                ))}
                {units.length > 0 && (
                  <>
                    {units.map((u) => (
                      <SelectItem key={`unit-${u.id}`} value={`unit-${u.id}`}>
                        {u.unit_type === "apartamento"
                          ? `Bloco ${u.block}, Apto ${u.apartment}`
                          : `Quadra ${u.quadra}, Lote ${u.lote}`}
                        {u.owner_name && ` – ${u.owner_name}`}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Veículo */}
          <div className="space-y-3">
            <h3 className="font-semibold">Veículo</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
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
              </div>
              <div className="space-y-1.5">
                <Label>Placa</Label>
                <Input
                  value={form.vehicle_plate}
                  onChange={(e) => set("vehicle_plate", maskPlate(e.target.value))}
                  placeholder="ABC1D23"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-3">
            <Label>Notas (opcional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Informações adicionais"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Registrar Entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
