"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound, ShieldCheck, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUpload } from "@/components/shared/photo-upload";
import { maskCNPJ, maskCPF } from "@/lib/utils";
import { createResident, updateResident, createResidentLogin } from "@/app/(app)/moradores/actions";
import type {
  Resident,
  ResidenceType,
  ResidenceEntry,
  FamilyContact,
  DocumentType,
  CpfCnpjKind,
  PhoneKind,
} from "@/lib/database.types";

interface ResidentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident?: Resident | null;
  hasPortalAccess?: boolean;
}

export function ResidentForm({ open, onOpenChange, resident, hasPortalAccess }: ResidentFormProps) {
  const editing = !!resident;
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState(() => initial(resident));
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalEmail, setPortalEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [portalPending, startPortalTransition] = useTransition();

  // Reinicializa ao abrir com registro diferente
  const [lastId, setLastId] = useState<string | null>(resident?.id ?? null);
  if (open && (resident?.id ?? null) !== lastId) {
    setForm(initial(resident));
    setLastId(resident?.id ?? null);
    setPortalOpen(false);
    setPortalEmail("");
    setPortalPassword("");
  }

  function submitPortalAccess() {
    if (!resident) return;
    if (!portalEmail || portalPassword.length < 6) {
      toast.error("Informe um e-mail e uma senha com ao menos 6 caracteres.");
      return;
    }
    startPortalTransition(async () => {
      const res = await createResidentLogin(resident.id, portalEmail, portalPassword);
      if (res.ok) {
        toast.success("Acesso ao portal criado.");
        setPortalOpen(false);
        setPortalEmail("");
        setPortalPassword("");
      } else {
        toast.error(res.error ?? "Erro ao criar acesso.");
      }
    });
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addResidence() {
    setForm((f) => ({
      ...f,
      residences: [...f.residences, { residence_type: "apartamento", block: "", apartment: "", quadra: "", lote: "" }],
    }));
  }

  function updateResidence(index: number, patch: Partial<ResidenceEntry>) {
    setForm((f) => ({
      ...f,
      residences: f.residences.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }

  function removeResidence(index: number) {
    setForm((f) => ({ ...f, residences: f.residences.filter((_, i) => i !== index) }));
  }

  function addFamilyContact() {
    setForm((f) => ({ ...f, family_contacts: [...f.family_contacts, { name: "", phone: "" }] }));
  }

  function updateFamilyContact(index: number, patch: Partial<FamilyContact>) {
    setForm((f) => ({
      ...f,
      family_contacts: f.family_contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  function removeFamilyContact(index: number) {
    setForm((f) => ({ ...f, family_contacts: f.family_contacts.filter((_, i) => i !== index) }));
  }

  function submit() {
    startTransition(async () => {
      const payload = {
        ...form,
        email: form.email || null,
        cpf: form.cpf,
        family_contacts: form.family_contacts.filter((c) => c.name.trim() || c.phone.trim()),
      };
      const res = editing
        ? await updateResident(resident!.id, payload)
        : await createResident(payload);
      if (res.ok) {
        toast.success(editing ? "Morador atualizado." : "Morador cadastrado.");
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
          <DialogTitle>{editing ? "Editar morador" : "Novo morador"}</DialogTitle>
          <DialogDescription>
            Preencha os dados do morador. Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1" onKeyDown={useEnterSubmit(submit)}>
          <PhotoUpload
            value={form.photo_url}
            onChange={(url) => set("photo_url", url)}
            folder="residents"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo *">
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </Field>
            <Field label={form.cpf_type === "cnpj" ? "CNPJ *" : "CPF *"}>
              <div className="flex gap-2">
                <Select
                  value={form.cpf_type}
                  onValueChange={(v) => {
                    set("cpf_type", v as CpfCnpjKind);
                    set("cpf", "");
                  }}
                >
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
                onChange={(e) => set("document_number", e.target.value)}
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v as "active" | "inactive")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-sm font-semibold">Telefones</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telefone">
                <div className="flex gap-2">
                  <Select value={form.phone_type} onValueChange={(v) => set("phone_type", v as PhoneKind)}>
                    <SelectTrigger className="w-[130px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixo">Fixo</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
                </div>
              </Field>
              <Field label="Telefone secundário">
                <div className="flex gap-2">
                  <Select
                    value={form.phone_secondary_type}
                    onValueChange={(v) => set("phone_secondary_type", v as PhoneKind)}
                  >
                    <SelectTrigger className="w-[130px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixo">Fixo</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={form.phone_secondary ?? ""}
                    onChange={(e) => set("phone_secondary", e.target.value)}
                  />
                </div>
              </Field>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Residências</p>
              <Button type="button" variant="outline" size="sm" onClick={addResidence}>
                <Plus className="h-3.5 w-3.5" /> Adicionar residência
              </Button>
            </div>
            <div className="space-y-3">
              {form.residences.map((res, i) => (
                <div key={i} className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[repeat(3,1fr)_auto]">
                  <Field label="Tipo">
                    <Select
                      value={res.residence_type}
                      onValueChange={(v) => updateResidence(i, { residence_type: v as ResidenceType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartamento">Bloco/Apartamento</SelectItem>
                        <SelectItem value="lote">Quadra/Lote</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {res.residence_type === "apartamento" ? (
                    <>
                      <Field label="Bloco">
                        <Input value={res.block ?? ""} onChange={(e) => updateResidence(i, { block: e.target.value })} />
                      </Field>
                      <Field label="Apartamento">
                        <Input
                          value={res.apartment ?? ""}
                          onChange={(e) => updateResidence(i, { apartment: e.target.value })}
                        />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Quadra">
                        <Input
                          value={res.quadra ?? ""}
                          maxLength={1}
                          placeholder="A"
                          onChange={(e) =>
                            updateResidence(i, { quadra: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1) })
                          }
                        />
                      </Field>
                      <Field label="Lote">
                        <Input
                          value={res.lote ?? ""}
                          inputMode="numeric"
                          placeholder="12"
                          onChange={(e) => updateResidence(i, { lote: e.target.value.replace(/\D/g, "") })}
                        />
                      </Field>
                    </>
                  )}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeResidence(i)}
                      disabled={form.residences.length <= 1}
                      aria-label="Remover residência"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Contatos de familiares</p>
              <Button type="button" variant="outline" size="sm" onClick={addFamilyContact}>
                <Plus className="h-3.5 w-3.5" /> Adicionar contato
              </Button>
            </div>
            {form.family_contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum contato adicionado.</p>
            ) : (
              <div className="space-y-3">
                {form.family_contacts.map((c, i) => (
                  <div key={i} className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Field label="Nome">
                      <Input value={c.name} onChange={(e) => updateFamilyContact(i, { name: e.target.value })} />
                    </Field>
                    <Field label="Telefone">
                      <Input value={c.phone} onChange={(e) => updateFamilyContact(i, { phone: e.target.value })} />
                    </Field>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeFamilyContact(i)}
                        aria-label="Remover contato"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Observações">
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          {editing && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Portal do Morador</p>
                {hasPortalAccess ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-success">
                    <ShieldCheck className="h-4 w-4" /> Já possui acesso ao portal
                  </span>
                ) : (
                  !portalOpen && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setPortalOpen(true)}>
                      <KeyRound className="h-4 w-4" /> Criar acesso ao portal
                    </Button>
                  )
                )}
              </div>
              {!hasPortalAccess && portalOpen && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="E-mail de acesso">
                    <Input
                      type="email"
                      value={portalEmail}
                      onChange={(e) => setPortalEmail(e.target.value)}
                    />
                  </Field>
                  <Field label="Senha">
                    <Input
                      type="password"
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </Field>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="button" size="sm" onClick={submitPortalAccess} disabled={portalPending}>
                      {portalPending && <Loader2 className="animate-spin" />}
                      Criar acesso
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPortalOpen(false)} disabled={portalPending}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function initial(r?: Resident | null) {
  const residences: ResidenceEntry[] =
    r?.residences && r.residences.length > 0
      ? r.residences
      : [
          {
            residence_type: (r?.residence_type ?? "apartamento") as ResidenceType,
            block: r?.block ?? "",
            apartment: r?.apartment ?? "",
            quadra: r?.quadra ?? "",
            lote: r?.lote ?? "",
          },
        ];
  return {
    full_name: r?.full_name ?? "",
    cpf: r?.cpf ?? "",
    cpf_type: (r?.cpf_type ?? "cpf") as CpfCnpjKind,
    document_type: (r?.document_type ?? "rg") as DocumentType,
    document_number: r?.document_number ?? "",
    phone: r?.phone ?? "",
    phone_type: (r?.phone_type ?? "fixo") as PhoneKind,
    phone_secondary: r?.phone_secondary ?? "",
    phone_secondary_type: (r?.phone_secondary_type ?? "fixo") as PhoneKind,
    email: r?.email ?? "",
    photo_url: r?.photo_url ?? null,
    residences,
    family_contacts: (r?.family_contacts ?? []) as FamilyContact[],
    status: (r?.status ?? "active") as "active" | "inactive",
    notes: r?.notes ?? "",
  };
}
