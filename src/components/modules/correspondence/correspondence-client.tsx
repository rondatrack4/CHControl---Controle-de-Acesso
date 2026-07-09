"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Truck,
  Copy,
  Trash2,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CorrespondenceDashboardKpis } from "@/components/modules/correspondence/correspondence-dashboard-kpis";
import { CorrespondenceFormDialog } from "@/components/modules/correspondence/correspondence-form-dialog";
import { DeliverDialog } from "@/components/modules/correspondence/deliver-dialog";
import { CorrespondenceDetailDialog } from "@/components/modules/correspondence/correspondence-detail-dialog";
import { duplicateCorrespondence, deleteCorrespondence } from "@/app/(app)/correspondencias/actions";
import { cn, formatDateTime, formatElapsed, initials, recipientResidenceLabel } from "@/lib/utils";
import { CORRESPONDENCE_STATUS_LABELS, PAGE_SIZE } from "@/lib/constants";
import type { Correspondence, Resident } from "@/lib/database.types";

const PENDING_STATUSES = new Set(["recebido", "em_armazenamento", "aguardando_retirada"]);
const CLOSED_STATUSES = new Set(["entregue", "recusado", "devolvido", "extraviado", "cancelado"]);

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function agingClass(c: Correspondence) {
  if (!PENDING_STATUSES.has(c.status)) return "";
  const days = daysSince(c.received_at);
  if (days >= 30) return "bg-red-50 dark:bg-red-950/30";
  if (days >= 7) return "bg-amber-50 dark:bg-amber-950/20";
  if (days >= 3) return "bg-yellow-50/60 dark:bg-yellow-950/10";
  return "";
}

interface CorrespondenceClientProps {
  correspondences: Correspondence[];
  residents: Resident[];
  porters: string[];
}

interface Filters {
  q: string;
  status: string;
  type: string;
  porter: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = { q: "", status: "all", type: "all", porter: "all", dateFrom: "", dateTo: "" };

export function CorrespondenceClient({ correspondences, residents, porters }: CorrespondenceClientProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Correspondence | null>(null);
  const [delivering, setDelivering] = useState<Correspondence | null>(null);
  const [viewing, setViewing] = useState<Correspondence | null>(null);
  const [toDelete, setToDelete] = useState<Correspondence | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const types = useMemo(() => Array.from(new Set(correspondences.map((c) => c.type))).sort(), [correspondences]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(filters.dateFrom + "T00:00:00") : null;
    const to = filters.dateTo ? new Date(filters.dateTo + "T23:59:59") : null;
    return correspondences.filter((c) => {
      if (q) {
        const hay = `${c.recipient_name ?? ""} ${c.recipient_apartment ?? ""} ${c.recipient_block ?? ""} ${c.recipient_quadra ?? ""} ${c.recipient_lote ?? ""} ${c.tracking_code ?? ""} ${c.registration_number} ${c.carrier ?? ""} ${c.sender_company ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status !== "all" && c.status !== filters.status) return false;
      if (filters.type !== "all" && c.type !== filters.type) return false;
      if (filters.porter !== "all" && c.entry_porter_name !== filters.porter) return false;
      const received = new Date(c.received_at);
      if (from && received < from) return false;
      if (to && received > to) return false;
      return true;
    });
  }, [correspondences, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters =
    filters.q || filters.status !== "all" || filters.type !== "all" || filters.porter !== "all" || filters.dateFrom || filters.dateTo;

  const kpis = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      receivedToday: correspondences.filter((c) => new Date(c.received_at) >= todayStart).length,
      pending: correspondences.filter((c) => PENDING_STATUSES.has(c.status)).length,
      deliveredToday: correspondences.filter((c) => c.delivered_at && new Date(c.delivered_at) >= todayStart).length,
      awaitingPickup: correspondences.filter((c) => c.status === "aguardando_retirada").length,
      monthTotal: correspondences.filter((c) => new Date(c.received_at) >= monthStart).length,
    };
  }, [correspondences]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: Correspondence) {
    setEditing(c);
    setFormOpen(true);
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      openNew();
      router.replace("/correspondencias");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function duplicate(c: Correspondence) {
    startTransition(async () => {
      const res = await duplicateCorrespondence(c.id);
      if (res.ok) toast.success("Correspondência duplicada.");
      else toast.error(res.error ?? "Erro ao duplicar.");
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deleteCorrespondence(toDelete.id);
      if (res.ok) toast.success("Correspondência excluída.");
      else toast.error(res.error ?? "Erro ao excluir.");
      setToDelete(null);
    });
  }

  return (
    <>
      <PageHeader title="Correspondências" description="Livro de correspondências: recebimento, armazenamento e entrega.">
        <Button onClick={openNew}>
          <Plus /> Nova correspondência
        </Button>
      </PageHeader>

      <div className="mb-6">
        <CorrespondenceDashboardKpis {...kpis} />
      </div>

      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
            {hasFilters && (
              <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => setFilters(EMPTY_FILTERS)}>
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-2">
              <Label>Nome, apto, bloco, etiqueta, código, transportadora, remetente</Label>
              <Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Digite para filtrar..." />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(CORRESPONDENCE_STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={filters.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Controlador(a) de Acesso</Label>
              <Select value={filters.porter} onValueChange={(v) => set("porter", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {porters.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data inicial</Label>
              <Input type="date" value={filters.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data final</Label>
              <Input type="date" value={filters.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Morador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Transportadora</TableHead>
              <TableHead>Recebimento</TableHead>
              <TableHead>Aguardando</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                  Nenhuma correspondência encontrada.
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((c) => (
                <TableRow key={c.id} className={cn(agingClass(c))}>
                  <TableCell>
                    <Avatar className="h-9 w-9">
                      {c.entry_photos[0] ? <AvatarImage src={c.entry_photos[0]} /> : null}
                      <AvatarFallback><Package className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs font-medium">{c.registration_number}</p>
                    <p className="text-xs text-muted-foreground">{c.tracking_code ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{c.recipient_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{recipientResidenceLabel(c)}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell className="text-sm">{c.carrier ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDateTime(c.received_at)}</TableCell>
                  <TableCell className="text-sm">
                    {CLOSED_STATUSES.has(c.status) ? "—" : formatElapsed(c.received_at)}
                  </TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-sm">{c.location_note ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.entry_porter_name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button variant="ghost" size="icon" onClick={() => setViewing(c)} aria-label="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {c.status !== "entregue" && (
                        <Button variant="ghost" size="icon" onClick={() => setDelivering(c)} aria-label="Entregar">
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => duplicate(c)} disabled={pending} aria-label="Duplicar">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setToDelete(c)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <span>{filtered.length} registro(s) · Página {currentPage} de {totalPages}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CorrespondenceFormDialog open={formOpen} onOpenChange={setFormOpen} correspondence={editing} residents={residents} />
      <DeliverDialog open={!!delivering} onOpenChange={(o) => !o && setDelivering(null)} correspondence={delivering} />
      <CorrespondenceDetailDialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} correspondence={viewing} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir correspondência"
        description={`Tem certeza que deseja excluir "${toDelete?.registration_number}"? Esta ação não pode ser desfeita.`}
        variant="destructive"
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
