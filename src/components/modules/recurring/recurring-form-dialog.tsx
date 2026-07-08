"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Home, X } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonAnySearch } from "@/components/modules/recurring/person-any-search";
import { ResidentCombobox } from "@/components/shared/resident-combobox";
import { createRecurringAuth, updateRecurringAuth, type AnyPersonResult } from "@/app/(app)/recorrentes/actions";
import { initials, residenceLabel, todayISO, weekdayScheduleSummary } from "@/lib/utils";
import { WEEKDAY_LABELS, TIME_OPTIONS } from "@/lib/constants";
import type { Resident, RecurringAuthorization, WeekdayScheduleEntry } from "@/lib/database.types";

interface RecurringFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorization?: RecurringAuthorization | null;
  residents: Resident[];
}

function defaultWeekdaySchedule(): WeekdayScheduleEntry[] {
  return Array.from({ length: 7 }, (_, day) => ({ day, enabled: false, start_time: "08:00", end_time: "18:00" }));
}

function initial(a?: RecurringAuthorization | null) {
  return {
    person_type: (a?.person_type ?? null) as AnyPersonResult["person_type"] | null,
    person_id: a?.person_id ?? "",
    person_name: a?.person_name ?? "",
    person_document: a?.person_document ?? "",
    category_label: a?.category_label ?? "",
    destination_resident_id: a?.destination_resident_id ?? null,
    destination_label: a?.destination_label ?? "",
    start_date: a?.start_date ?? todayISO(),
    end_date: a?.end_date ?? "",
    weekday_schedule: a?.weekday_schedule && a.weekday_schedule.length === 7 ? a.weekday_schedule : defaultWeekdaySchedule(),
    status: a?.status ?? ("active" as "active" | "inactive"),
    notes: a?.notes ?? "",
  };
}

export function RecurringFormDialog({ open, onOpenChange, authorization, residents }: RecurringFormDialogProps) {
  const editing = !!authorization;
  const [form, setForm] = useState(() => initial(authorization));
  const [lastId, setLastId] = useState<string | null>(authorization?.id ?? null);
  const [pending, startTransition] = useTransition();

  if (open && (authorization?.id ?? null) !== lastId) {
    setForm(initial(authorization));
    setLastId(authorization?.id ?? null);
  }

  const selectedDestination = residents.find((r) => r.id === form.destination_resident_id) ?? null;

  function set<K extends keyof ReturnType<typeof initial>>(key: K, value: ReturnType<typeof initial>[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSelectPerson(person: AnyPersonResult) {
    setForm((f) => ({
      ...f,
      person_type: person.person_type,
      person_id: person.id,
      person_name: person.full_name,
      person_document: person.document ?? "",
      category_label: person.category_label,
    }));
  }

  function clearPerson() {
    setForm((f) => ({ ...f, person_type: null, person_id: "", person_name: "", person_document: "", category_label: "" }));
  }

  function updateWeekday(day: number, patch: Partial<WeekdayScheduleEntry>) {
    setForm((f) => ({
      ...f,
      weekday_schedule: f.weekday_schedule.map((d) => (d.day === day ? { ...d, ...patch } : d)),
    }));
  }

  function submit() {
    if (!form.person_type || !form.person_id) {
      toast.error("Busque e selecione uma pessoa.");
      return;
    }
    const payload = {
      person_type: form.person_type,
      person_id: form.person_id,
      person_name: form.person_name,
      person_document: form.person_document,
      category_label: form.category_label,
      destination_resident_id: form.destination_resident_id,
      destination_label: form.destination_label,
      start_date: form.start_date,
      end_date: form.end_date || null,
      recurrence_note: weekdayScheduleSummary(form.weekday_schedule),
      weekday_schedule: form.weekday_schedule,
      status: form.status,
      notes: form.notes,
    };
    startTransition(async () => {
      const res = editing
        ? await updateRecurringAuth(authorization!.id, payload)
        : await createRecurringAuth(payload);
      if (res.ok) {
        toast.success(editing ? "Autorização recorrente atualizada." : "Autorização recorrente criada.");
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar acesso recorrente" : "Novo acesso recorrente"}</DialogTitle>
          <DialogDescription>
            Autorize a entrada periódica de um morador, visitante ou prestador já cadastrado, com validade definida.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <section className="space-y-2">
            <Label>Pessoa autorizada *</Label>
            {form.person_id ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{initials(form.person_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-medium">{form.person_name}</p>
                    <Badge variant="outline" className="text-[10px]">{form.category_label}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{form.person_document || "Sem documento"}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={clearPerson}>
                  <X className="h-3.5 w-3.5" /> Trocar
                </Button>
              </div>
            ) : (
              <PersonAnySearch onSelect={handleSelectPerson} />
            )}
          </section>

          <section className="space-y-1.5">
            <Label>Morador / destino responsável</Label>
            <ResidentCombobox
              residents={residents}
              value={form.destination_resident_id}
              onSelect={(r) => {
                set("destination_resident_id", r?.id ?? null);
                set("destination_label", r ? residenceLabel(r) : "");
              }}
              placeholder="Selecione (opcional)"
            />
            {selectedDestination && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span>Residência: <strong>{residenceLabel(selectedDestination)}</strong></span>
              </div>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Data de início *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de validade</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                placeholder="Sem data de término"
              />
              <p className="text-xs text-muted-foreground">Deixe em branco para autorização por prazo indeterminado.</p>
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v as "active" | "inactive")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <Label>Horário permitido por dia da semana</Label>
            <div className="space-y-2 rounded-lg border p-3">
              {form.weekday_schedule.map((entry) => (
                <div key={entry.day} className="flex flex-wrap items-center gap-3">
                  <Switch
                    checked={entry.enabled}
                    onCheckedChange={(checked) => updateWeekday(entry.day, { enabled: checked })}
                  />
                  <span className={`w-24 shrink-0 text-sm ${entry.enabled ? "font-medium" : "text-muted-foreground"}`}>
                    {WEEKDAY_LABELS[entry.day]}
                  </span>
                  <Select
                    value={entry.start_time}
                    onValueChange={(v) => updateWeekday(entry.day, { start_time: v })}
                    disabled={!entry.enabled}
                  >
                    <SelectTrigger className="w-[110px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">até</span>
                  <Select
                    value={entry.end_time}
                    onValueChange={(v) => updateWeekday(entry.day, { end_time: v })}
                    disabled={!entry.enabled}
                  >
                    <SelectTrigger className="w-[110px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe todos os dias desmarcados para permitir a qualquer horário, todos os dias.
            </p>
          </section>

          <section className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </section>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {editing ? "Salvar alterações" : "Criar autorização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
