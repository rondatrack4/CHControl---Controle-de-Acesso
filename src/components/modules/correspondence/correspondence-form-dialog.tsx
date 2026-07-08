"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Home } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResidentCombobox } from "@/components/shared/resident-combobox";
import { MultiPhotoUpload } from "@/components/modules/correspondence/multi-photo-upload";
import { SignaturePad } from "@/components/modules/correspondence/signature-pad";
import { createCorrespondence, updateCorrespondence } from "@/app/(app)/correspondencias/actions";
import { residenceLabel } from "@/lib/utils";
import {
  CORRESPONDENCE_TYPE_SUGGESTIONS,
  CARRIER_SUGGESTIONS,
  CORRESPONDENCE_STATUS_LABELS,
  CORRESPONDENCE_PRIORITY_LABELS,
  CORRESPONDENCE_DOCUMENT_KIND_LABELS,
} from "@/lib/constants";
import type {
  Correspondence,
  Resident,
  ResidenceType,
  CorrespondenceStatus,
  CorrespondencePriority,
  CorrespondenceDocumentKind,
} from "@/lib/database.types";

interface CorrespondenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correspondence?: Correspondence | null;
  residents: Resident[];
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initial(c?: Correspondence | null) {
  return {
    type: c?.type ?? "Pacote",
    carrier: c?.carrier ?? "",
    sender_company: c?.sender_company ?? "",
    deliverer_name: c?.deliverer_name ?? "",
    deliverer_document: c?.deliverer_document ?? "",
    deliverer_document_type: (c?.deliverer_document_type ?? "cpf") as CorrespondenceDocumentKind,
    deliverer_phone: c?.deliverer_phone ?? "",
    tracking_code: c?.tracking_code ?? "",
    received_at: c ? toLocalInputValue(c.received_at) : toLocalInputValue(new Date().toISOString()),
    resident_id: c?.resident_id ?? null,
    recipient_name: c?.recipient_name ?? "",
    recipient_residence_type: (c?.recipient_residence_type ?? "apartamento") as ResidenceType,
    recipient_block: c?.recipient_block ?? "",
    recipient_apartment: c?.recipient_apartment ?? "",
    recipient_quadra: c?.recipient_quadra ?? "",
    recipient_lote: c?.recipient_lote ?? "",
    recipient_tower: c?.recipient_tower ?? "",
    recipient_unit: c?.recipient_unit ?? "",
    recipient_document: c?.recipient_document ?? "",
    recipient_document_type: (c?.recipient_document_type ?? "cpf") as CorrespondenceDocumentKind,
    recipient_phone: c?.recipient_phone ?? "",
    recipient_whatsapp: c?.recipient_whatsapp ?? "",
    recipient_email: c?.recipient_email ?? "",
    status: (c?.status ?? "recebido") as CorrespondenceStatus,
    priority: (c?.priority ?? "normal") as CorrespondencePriority,
    location_note: c?.location_note ?? "",
    notes: c?.notes ?? "",
    entry_photos: c?.entry_photos ?? [],
    entry_signature_url: c?.entry_signature_url ?? null,
  };
}

export function CorrespondenceFormDialog({
  open,
  onOpenChange,
  correspondence,
  residents,
}: CorrespondenceFormDialogProps) {
  const editing = !!correspondence;
  const [form, setForm] = useState(() => initial(correspondence));
  const [lastId, setLastId] = useState<string | null>(correspondence?.id ?? null);
  const [pending, startTransition] = useTransition();

  if (open && (correspondence?.id ?? null) !== lastId) {
    setForm(initial(correspondence));
    setLastId(correspondence?.id ?? null);
  }

  function set<K extends keyof ReturnType<typeof initial>>(key: K, value: ReturnType<typeof initial>[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleResidentSelect(resident: Resident | null) {
    if (!resident) {
      set("resident_id", null);
      return;
    }
    set("resident_id", resident.id);
    set("recipient_name", resident.full_name);
    set("recipient_residence_type", resident.residence_type);
    set("recipient_block", resident.block ?? "");
    set("recipient_apartment", resident.apartment ?? "");
    set("recipient_quadra", resident.quadra ?? "");
    set("recipient_lote", resident.lote ?? "");
    set("recipient_unit", residenceLabel(resident));
    set("recipient_document", resident.cpf ?? "");
    set("recipient_document_type", resident.cpf_type);
    set("recipient_phone", resident.phone ?? "");
    set("recipient_whatsapp", resident.phone ?? "");
    set("recipient_email", resident.email ?? "");
  }

  function close() {
    onOpenChange(false);
  }

  function submit() {
    startTransition(async () => {
      const payload = { ...form, received_at: new Date(form.received_at).toISOString() };
      const res = editing
        ? await updateCorrespondence(correspondence!.id, payload)
        : await createCorrespondence(payload);
      if (res.ok) {
        toast.success(editing ? "Correspondência atualizada." : "Correspondência cadastrada.");
        close();
      } else {
        toast.error(res.error ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar correspondência" : "Nova correspondência"}</DialogTitle>
          <DialogDescription>
            {editing ? correspondence!.registration_number : "Um número de registro será gerado automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
          <section className="space-y-4">
            <p className="text-sm font-semibold">Destinatário</p>
            <div className="space-y-1.5">
              <Label>Buscar morador</Label>
              <ResidentCombobox residents={residents} value={form.resident_id} onSelect={handleResidentSelect} />
              {form.resident_id && (
                <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{form.recipient_name} — {form.recipient_unit}</span>
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de residência</Label>
                <Select
                  value={form.recipient_residence_type}
                  onValueChange={(v) => set("recipient_residence_type", v as ResidenceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartamento">Bloco/Apartamento</SelectItem>
                    <SelectItem value="lote">Quadra/Lote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.recipient_residence_type === "apartamento" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Bloco</Label>
                    <Input value={form.recipient_block} onChange={(e) => set("recipient_block", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Apartamento</Label>
                    <Input value={form.recipient_apartment} onChange={(e) => set("recipient_apartment", e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Quadra</Label>
                    <Input
                      value={form.recipient_quadra}
                      maxLength={1}
                      placeholder="A"
                      onChange={(e) =>
                        set("recipient_quadra", e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lote</Label>
                    <Input
                      value={form.recipient_lote}
                      inputMode="numeric"
                      placeholder="12"
                      onChange={(e) => set("recipient_lote", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>Documento</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.recipient_document_type}
                    onValueChange={(v) => set("recipient_document_type", v as CorrespondenceDocumentKind)}
                  >
                    <SelectTrigger className="w-[90px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CORRESPONDENCE_DOCUMENT_KIND_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={form.recipient_document} onChange={(e) => set("recipient_document", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.recipient_phone} onChange={(e) => set("recipient_phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={form.recipient_email} onChange={(e) => set("recipient_email", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <p className="text-sm font-semibold">Dados da correspondência</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Input
                  list="correspondence-types"
                  value={form.type}
                  onChange={(e) => set("type", e.target.value)}
                />
                <datalist id="correspondence-types">
                  {CORRESPONDENCE_TYPE_SUGGESTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>Transportadora</Label>
                <Input
                  list="carrier-suggestions"
                  value={form.carrier}
                  onChange={(e) => set("carrier", e.target.value)}
                />
                <datalist id="carrier-suggestions">
                  {CARRIER_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>Código / Etiqueta</Label>
                <Input value={form.tracking_code} onChange={(e) => set("tracking_code", e.target.value)} placeholder="BR123456789" />
              </div>
              <div className="space-y-1.5">
                <Label>Empresa remetente</Label>
                <Input value={form.sender_company} onChange={(e) => set("sender_company", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data/hora de recebimento *</Label>
                <Input
                  type="datetime-local"
                  value={form.received_at}
                  onChange={(e) => set("received_at", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nome do entregador</Label>
                <Input value={form.deliverer_name} onChange={(e) => set("deliverer_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Documento do entregador</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.deliverer_document_type}
                    onValueChange={(v) => set("deliverer_document_type", v as CorrespondenceDocumentKind)}
                  >
                    <SelectTrigger className="w-[90px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CORRESPONDENCE_DOCUMENT_KIND_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={form.deliverer_document} onChange={(e) => set("deliverer_document", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Telefone do entregador</Label>
                <Input value={form.deliverer_phone} onChange={(e) => set("deliverer_phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Localização / Armazenamento</Label>
                <Input
                  value={form.location_note}
                  onChange={(e) => set("location_note", e.target.value)}
                  placeholder="Ex.: Prateleira A3"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as CorrespondenceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CORRESPONDENCE_STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as CorrespondencePriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CORRESPONDENCE_PRIORITY_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold">Fotos</p>
            <MultiPhotoUpload
              value={form.entry_photos}
              onChange={(urls) => set("entry_photos", urls)}
              folder="correspondence-entries"
            />
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold">Assinatura de recebimento</p>
            <SignaturePad
              value={form.entry_signature_url}
              onChange={(url) => set("entry_signature_url", url)}
              folder="correspondence-signatures"
            />
          </section>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {editing ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
