"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { maskCNPJ } from "@/lib/utils";
import { createCompanyWithPorter, updateCompany } from "@/app/(app)/empresas/actions";
import type { Company } from "@/lib/database.types";

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
}

export function CompanyForm({ open, onOpenChange, company }: CompanyFormProps) {
  const editing = !!company;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(() => initial(company));
  const [lastId, setLastId] = useState<string | null>(company?.id ?? null);
  if (open && (company?.id ?? null) !== lastId) {
    setForm(initial(company));
    setLastId(company?.id ?? null);
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      const res = editing
        ? await updateCompany(company!.id, {
            name: form.name,
            cnpj: form.cnpj,
            address: form.address,
            city: form.city,
            state: form.state,
            zip: form.zip,
            phone: form.phone,
            email: form.email,
            logo_url: null,
            status: form.status,
          })
        : await createCompanyWithPorter(form);
      if (res.ok) {
        toast.success(editing ? "Empresa atualizada." : "Empresa e porteiro criados.");
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
          <DialogTitle>{editing ? "Editar empresa" : "Nova empresa (condomínio)"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Atualize os dados do condomínio."
              : "Cadastre o condomínio e o primeiro usuário da portaria."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome *">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="CNPJ">
              <Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Endereço">
              <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Cidade">
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Estado">
              <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} maxLength={2} placeholder="SP" />
            </Field>
            <Field label="CEP">
              <Input value={form.zip ?? ""} onChange={(e) => set("zip", e.target.value)} placeholder="00000-000" />
            </Field>
            <Field label="Telefone">
              <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v as "active" | "inactive")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {!editing && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-semibold">Primeiro usuário da portaria</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome do porteiro *">
                  <Input value={form.porter_name} onChange={(e) => set("porter_name", e.target.value)} />
                </Field>
                <Field label="E-mail de acesso *">
                  <Input type="email" value={form.porter_email} onChange={(e) => set("porter_email", e.target.value)} />
                </Field>
                <Field label="Senha *">
                  <Input type="password" value={form.porter_password} onChange={(e) => set("porter_password", e.target.value)} placeholder="Mínimo 6 caracteres" />
                </Field>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {editing ? "Salvar alterações" : "Criar empresa"}
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

function initial(c?: Company | null) {
  return {
    name: c?.name ?? "",
    cnpj: c?.cnpj ?? "",
    address: c?.address ?? "",
    city: c?.city ?? "",
    state: c?.state ?? "",
    zip: c?.zip ?? "",
    phone: c?.phone ?? "",
    email: c?.email ?? "",
    status: (c?.status ?? "active") as "active" | "inactive",
    porter_name: "",
    porter_email: "",
    porter_password: "",
  };
}
