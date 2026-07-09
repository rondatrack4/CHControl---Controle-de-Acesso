"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, X, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEnterSubmit } from "@/lib/form-utils";
import { createKey, updateKey } from "@/app/(app)/chaves/actions";
import type { KeyItem } from "@/lib/database.types";

interface KeyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyItem?: KeyItem | null;
}

export function KeyForm({ open, onOpenChange, keyItem }: KeyFormProps) {
  const editing = !!keyItem;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(() => initial(keyItem));
  const [lastId, setLastId] = useState<string | null>(keyItem?.id ?? null);
  if (open && (keyItem?.id ?? null) !== lastId) {
    setForm(initial(keyItem));
    setLastId(keyItem?.id ?? null);
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      const res = editing ? await updateKey(keyItem!.id, form) : await createKey(form);
      if (res.ok) {
        toast.success(editing ? "Chave atualizada." : "Chave cadastrada.");
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" hideClose onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-0">
          <div className="relative -mx-6 -mt-6 overflow-hidden rounded-t-lg bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 px-6 pb-5 pt-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/80 backdrop-blur-sm transition-all hover:bg-white/25 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                <KeyRound className="h-5 w-5" />
              </span>
              <DialogTitle className="text-xl font-bold text-white">
                {editing ? "Editar chave" : "Nova chave"}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4" onKeyDown={useEnterSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Código da chave *">
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="Ex.: CH-001" className="font-mono uppercase" />
            </Field>
            <Field label="Nome da chave *">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Salão de Festas" />
            </Field>
            <Field label="Local">
              <Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Ex.: Bloco A - Térreo" />
            </Field>
            <Field label="Unidade">
              <Input value={form.unit ?? ""} onChange={(e) => set("unit", e.target.value)} placeholder="Ex.: Apto 101" />
            </Field>
          </div>
          <Field label="Descrição">
            <Input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Descrição da chave" />
          </Field>
          <Field label="Observações">
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Observações internas..." />
          </Field>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancelar</Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {editing ? "Salvar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
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

function initial(k?: KeyItem | null) {
  return {
    code: k?.code ?? "",
    name: k?.name ?? "",
    location: k?.location ?? "",
    unit: k?.unit ?? "",
    description: k?.description ?? "",
    notes: k?.notes ?? "",
    status: (k?.status ?? "available") as "available" | "lent" | "inactive",
  };
}
