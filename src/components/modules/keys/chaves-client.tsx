"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, KeyRound, KeySquare, CheckCircle2, AlertTriangle, Clock,
  ArrowRightLeft, RotateCcw, History, MapPin, Home, User, ShieldCheck, X, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KeyForm } from "./key-form";
import { lendKey, returnKey, deleteKey } from "@/app/(app)/chaves/actions";
import { cn, formatDateTime, formatDurationBetween } from "@/lib/utils";
import type { Employee, KeyItem, KeyLoan } from "@/lib/database.types";

function toLocalInput(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function isOverdue(loan: KeyLoan): boolean {
  return !!loan.expected_return_at && new Date(loan.expected_return_at).getTime() < Date.now();
}

export function ChavesClient({
  keys,
  employees,
  loans,
}: {
  keys: KeyItem[];
  employees: Employee[];
  loans: KeyLoan[];
}) {
  const [view, setView] = useState<"chaves" | "historico">("chaves");
  const [formOpen, setFormOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<KeyItem | null>(null);
  const [lendKeyItem, setLendKeyItem] = useState<KeyItem | null>(null);
  const [returnLoan, setReturnLoan] = useState<{ loan: KeyLoan; key: KeyItem } | null>(null);
  const [toDelete, setToDelete] = useState<KeyItem | null>(null);
  const [pending, startTransition] = useTransition();

  const openLoanByKey = useMemo(() => {
    const map = new Map<string, KeyLoan>();
    for (const l of loans) if (l.status === "open") map.set(l.key_id, l);
    return map;
  }, [loans]);

  const stats = useMemo(() => {
    const lent = keys.filter((k) => k.status === "lent");
    const overdue = lent.filter((k) => {
      const loan = openLoanByKey.get(k.id);
      return loan && isOverdue(loan);
    });
    return {
      total: keys.length,
      available: keys.filter((k) => k.status === "available").length,
      lent: lent.length,
      overdue: overdue.length,
    };
  }, [keys, openLoanByKey]);

  function confirmDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deleteKey(toDelete.id);
      if (res.ok) toast.success("Chave excluída.");
      else toast.error(res.error ?? "Erro ao excluir.");
      setToDelete(null);
    });
  }

  const sortedKeys = useMemo(
    () => [...keys].sort((a, b) => {
      const rank = (k: KeyItem) => (k.status === "lent" ? 0 : k.status === "available" ? 1 : 2);
      return rank(a) - rank(b) || a.code.localeCompare(b.code);
    }),
    [keys]
  );

  return (
    <>
      <style>{`
        @keyframes keyPulseAmber {0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.0);border-color:rgba(245,158,11,.55)}50%{box-shadow:0 0 0 4px rgba(245,158,11,.28);border-color:rgba(245,158,11,.95)}}
        @keyframes keyPulseRed {0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.0);border-color:rgba(239,68,68,.6)}50%{box-shadow:0 0 0 4px rgba(239,68,68,.30);border-color:rgba(239,68,68,1)}}
        .key-blink-amber{animation:keyPulseAmber 1.4s ease-in-out infinite}
        .key-blink-red{animation:keyPulseRed 1.15s ease-in-out infinite}
      `}</style>

      <PageHeader title="Controle de Chaves" description="Empréstimo, devolução e rastreamento das chaves da portaria.">
        <Button onClick={() => { setEditingKey(null); setFormOpen(true); }}>
          <Plus /> Nova chave
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de chaves" value={stats.total} icon={KeySquare} accent="blue" />
        <StatCard label="Disponíveis" value={stats.available} icon={CheckCircle2} accent="green" />
        <StatCard label="Pendentes de devolução" value={stats.lent} icon={Clock} accent="amber" live={stats.lent > 0} hint="Emprestadas agora" />
        <StatCard label="Em atraso" value={stats.overdue} icon={AlertTriangle} accent="red" hint="Passaram da previsão" />
      </div>

      {/* Alternador de visão */}
      <div className="mb-5 inline-flex rounded-lg border bg-card p-1 shadow-sm">
        <ViewTab active={view === "chaves"} onClick={() => setView("chaves")} icon={KeyRound} label="Chaves" />
        <ViewTab active={view === "historico"} onClick={() => setView("historico")} icon={History} label={`Histórico (${loans.length})`} />
      </div>

      {view === "chaves" ? (
        sortedKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
            <KeyRound className="h-10 w-10 opacity-40" />
            <p>Nenhuma chave cadastrada.</p>
            <Button variant="outline" onClick={() => { setEditingKey(null); setFormOpen(true); }}>
              <Plus /> Cadastrar primeira chave
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedKeys.map((k) => (
              <KeyCard
                key={k.id}
                keyItem={k}
                loan={openLoanByKey.get(k.id) ?? null}
                onLend={() => setLendKeyItem(k)}
                onReturn={(loan) => setReturnLoan({ loan, key: k })}
                onEdit={() => { setEditingKey(k); setFormOpen(true); }}
                onDelete={() => setToDelete(k)}
              />
            ))}
          </div>
        )
      ) : (
        <HistoryTable loans={loans} />
      )}

      <KeyForm open={formOpen} onOpenChange={setFormOpen} keyItem={editingKey} />

      {lendKeyItem && (
        <LendDialog
          keyItem={lendKeyItem}
          employees={employees}
          onClose={() => setLendKeyItem(null)}
        />
      )}

      {returnLoan && (
        <ReturnDialog
          loan={returnLoan.loan}
          keyItem={returnLoan.key}
          onClose={() => setReturnLoan(null)}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir chave"
        description={`Excluir a chave "${toDelete?.name}" (${toDelete?.code})?`}
        variant="destructive"
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function ViewTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function KeyCard({
  keyItem, loan, onLend, onReturn, onEdit, onDelete,
}: {
  keyItem: KeyItem;
  loan: KeyLoan | null;
  onLend: () => void;
  onReturn: (loan: KeyLoan) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const lent = keyItem.status === "lent" && loan;
  const overdue = loan ? isOverdue(loan) : false;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        lent && (overdue ? "key-blink-red" : "key-blink-amber")
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            lent ? (overdue ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400") : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          )}>
            <KeyRound className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{keyItem.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{keyItem.code}</p>
          </div>
        </div>
        {!lent && (
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {(keyItem.location || keyItem.unit) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {keyItem.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {keyItem.location}</span>}
          {keyItem.unit && <span className="inline-flex items-center gap-1"><Home className="h-3.5 w-3.5" /> {keyItem.unit}</span>}
        </div>
      )}
      {keyItem.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{keyItem.description}</p>}

      <div className="mt-3 flex-1" />

      {lent && loan ? (
        <div className={cn(
          "mt-2 space-y-2 rounded-lg border p-3",
          overdue ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"
        )}>
          <div className="flex items-center justify-between">
            <Badge className={cn("gap-1 border-0 text-white", overdue ? "bg-red-500" : "bg-amber-500")}>
              <Clock className="h-3 w-3" /> Pendente de Devolução
            </Badge>
            <span className={cn("text-xs font-semibold", overdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
              há {formatDurationBetween(loan.lent_at)}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" /> Com <strong>{loan.employee_name}</strong></p>
            <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Entregue por {loan.lent_by_name ?? "—"}</p>
            {loan.expected_return_at && (
              <p className={cn("flex items-center gap-1.5", overdue && "font-semibold text-red-600 dark:text-red-400")}>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Previsão: {formatDateTime(loan.expected_return_at)}
              </p>
            )}
          </div>
          <Button size="sm" className="w-full" onClick={() => onReturn(loan)}>
            <RotateCcw className="h-4 w-4" /> Registrar devolução
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <Badge className="gap-1 border-0 bg-emerald-500 text-white"><CheckCircle2 className="h-3 w-3" /> Disponível</Badge>
          <Button size="sm" onClick={onLend}>
            <ArrowRightLeft className="h-4 w-4" /> Emprestar
          </Button>
        </div>
      )}
    </div>
  );
}

function LendDialog({ keyItem, employees, onClose }: { keyItem: KeyItem; employees: Employee[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [lentAt, setLentAt] = useState(toLocalInput());
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await lendKey({
        key_id: keyItem.id,
        employee_id: employeeId,
        lent_at: lentAt ? new Date(lentAt).toISOString() : new Date().toISOString(),
        expected_return_at: expected ? new Date(expected).toISOString() : null,
        lend_notes: notes || null,
      });
      if (res.ok) { toast.success("Chave emprestada."); onClose(); }
      else toast.error(res.error ?? "Erro ao emprestar.");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" hideClose>
        <DialogHeader className="space-y-0">
          <div className="relative -mx-6 -mt-6 overflow-hidden rounded-t-lg bg-gradient-to-br from-amber-600 to-amber-800 px-6 pb-5 pt-6 text-white">
            <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 hover:bg-white/25" aria-label="Fechar"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><ArrowRightLeft className="h-5 w-5" /></span>
              <div>
                <DialogTitle className="text-lg font-bold">Emprestar chave</DialogTitle>
                <p className="text-sm text-white/80">{keyItem.name} · <span className="font-mono">{keyItem.code}</span></p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Funcionário *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
              <SelectContent>
                {employees.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum funcionário ativo. Cadastre em Funcionários.</div>}
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}{e.role_title ? ` — ${e.role_title}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data/hora da retirada *</Label>
              <Input type="datetime-local" value={lentAt} onChange={(e) => setLentAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Previsão de devolução</Label>
              <Input type="datetime-local" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observações da retirada..." />
          </div>
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            O empréstimo será registrado no seu nome como Controlador(a) de Acesso responsável pela entrega.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button onClick={submit} disabled={pending || !employeeId}>
            {pending ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />} Confirmar empréstimo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReturnDialog({ loan, keyItem, onClose }: { loan: KeyLoan; keyItem: KeyItem; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [returnedAt, setReturnedAt] = useState(toLocalInput());
  const [notes, setNotes] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await returnKey({
        loan_id: loan.id,
        returned_at: returnedAt ? new Date(returnedAt).toISOString() : new Date().toISOString(),
        return_notes: notes || null,
      });
      if (res.ok) { toast.success("Devolução registrada."); onClose(); }
      else toast.error(res.error ?? "Erro ao registrar devolução.");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" hideClose>
        <DialogHeader className="space-y-0">
          <div className="relative -mx-6 -mt-6 overflow-hidden rounded-t-lg bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 pb-5 pt-6 text-white">
            <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 hover:bg-white/25" aria-label="Fechar"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><RotateCcw className="h-5 w-5" /></span>
              <div>
                <DialogTitle className="text-lg font-bold">Registrar devolução</DialogTitle>
                <p className="text-sm text-white/80">{keyItem.name} · <span className="font-mono">{keyItem.code}</span></p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-xs">
            <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" /> Emprestada para <strong>{loan.employee_name}</strong></p>
            <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Entregue por {loan.lent_by_name ?? "—"}</p>
            <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Retirada em {formatDateTime(loan.lent_at)} · há {formatDurationBetween(loan.lent_at)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Data/hora da devolução *</Label>
            <Input type="datetime-local" value={returnedAt} onChange={(e) => setReturnedAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Estado da chave, ocorrências..." />
          </div>
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Você será registrado(a) como Controlador(a) de Acesso que recebeu a devolução. A chave voltará a ficar "Disponível".
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Confirmar devolução
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryTable({ loans }: { loans: KeyLoan[] }) {
  const columns: Column<KeyLoan>[] = [
    {
      key: "key",
      header: "Chave",
      render: (l) => (
        <div>
          <p className="text-sm font-medium">{l.key_name ?? "—"}</p>
          <p className="font-mono text-xs text-muted-foreground">{l.key_code ?? "—"}</p>
        </div>
      ),
    },
    { key: "employee_name", header: "Funcionário", render: (l) => <span className="text-sm">{l.employee_name}</span> },
    {
      key: "controllers",
      header: "Controlador (entrega / recebe)",
      render: (l) => (
        <div className="text-xs">
          <p><span className="text-muted-foreground">Entregou:</span> {l.lent_by_name ?? "—"}</p>
          <p><span className="text-muted-foreground">Recebeu:</span> {l.returned_by_name ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "lent_at",
      header: "Retirada",
      sortable: true,
      sortValue: (l) => l.lent_at,
      render: (l) => <span className="text-xs">{formatDateTime(l.lent_at)}</span>,
    },
    {
      key: "returned_at",
      header: "Devolução",
      render: (l) => <span className="text-xs">{l.returned_at ? formatDateTime(l.returned_at) : "—"}</span>,
    },
    {
      key: "duration",
      header: "Tempo",
      render: (l) => <span className="text-xs font-medium">{formatDurationBetween(l.lent_at, l.returned_at)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (l) =>
        l.status === "open" ? (
          <Badge className="border-0 bg-amber-500 text-white">Pendente</Badge>
        ) : (
          <Badge className="border-0 bg-emerald-500 text-white">Devolvida</Badge>
        ),
    },
  ];

  return (
    <DataTable
      data={loans}
      columns={columns}
      rowKey={(l) => l.id}
      searchAccessor={(l) => `${l.key_name ?? ""} ${l.key_code ?? ""} ${l.employee_name} ${l.lent_by_name ?? ""} ${l.returned_by_name ?? ""}`}
      searchPlaceholder="Buscar por chave, funcionário ou controlador..."
      emptyMessage="Nenhum empréstimo registrado ainda."
    />
  );
}
