"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter, X, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { LogDetailDialog } from "@/components/modules/history/log-detail-dialog";
import { formatDateTime, todayISO } from "@/lib/utils";
import { PERSON_TYPE_LABELS, VISITOR_CATEGORY_LABELS, PAGE_SIZE } from "@/lib/constants";
import type { AccessLogWithDestinations } from "@/app/(app)/acessos/page";

const QUICK_FILTERS = ["hoje", "ontem", "semana", "mes", "personalizado"] as const;
type QuickFilter = (typeof QUICK_FILTERS)[number];
const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  semana: "Esta semana",
  mes: "Este mês",
  personalizado: "Personalizado",
};

function rangeFor(filter: QuickFilter): { from: string; to: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (filter === "hoje") {
    return { from: todayISO(), to: todayISO() };
  }
  if (filter === "ontem") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const iso = y.toISOString().slice(0, 10);
    return { from: iso, to: iso };
  }
  if (filter === "semana") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { from: start.toISOString().slice(0, 10), to: todayISO() };
  }
  if (filter === "mes") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { from: start.toISOString().slice(0, 10), to: todayISO() };
  }
  return null;
}

export function ResidentHistoryClient({ logs }: { logs: AccessLogWithDestinations[] }) {
  const [quick, setQuick] = useState<QuickFilter | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detailLog, setDetailLog] = useState<AccessLogWithDestinations | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const viewId = searchParams.get("view");
    if (!viewId) return;
    const match = logs.find((l) => l.id === viewId);
    if (match) setDetailLog(match);
  }, [searchParams, logs]);

  function selectQuick(f: QuickFilter) {
    setQuick(f);
    setPage(1);
    if (f !== "personalizado") {
      const range = rangeFor(f);
      if (range) {
        setDateFrom(range.from);
        setDateTo(range.to);
      }
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    return logs.filter((l) => {
      if (q) {
        const hay = `${l.person_name} ${l.person_cpf ?? ""} ${l.person_category ?? ""} ${l.residence_label ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const entry = new Date(l.entry_at);
      if (from && entry < from) return false;
      if (to && entry > to) return false;
      return true;
    });
  }, [logs, query, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = query || dateFrom || dateTo;

  return (
    <>
      <PageHeader title="Histórico" description="Visitas e entregas relacionadas a você." />

      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7"
                onClick={() => {
                  setQuick(null);
                  setDateFrom("");
                  setDateTo("");
                  setQuery("");
                }}
              >
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => selectQuick(f)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  quick === f ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {QUICK_FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Buscar por nome, documento ou tipo</Label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite para filtrar..." />
            </div>
            <div className="space-y-1.5">
              <Label>Data inicial</Label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setQuick("personalizado"); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Data final</Label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setQuick("personalizado"); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="font-medium">{l.person_name}</p>
                    <p className="text-xs text-muted-foreground">{l.person_cpf ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {l.person_category ? VISITOR_CATEGORY_LABELS[l.person_category] ?? l.person_category : PERSON_TYPE_LABELS[l.person_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{l.residence_label ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDateTime(l.entry_at)}</TableCell>
                  <TableCell className="text-sm">{l.exit_at ? formatDateTime(l.exit_at) : "—"}</TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDetailLog(l)} aria-label="Ver detalhes">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LogDetailDialog open={!!detailLog} onOpenChange={(o) => !o && setDetailLog(null)} log={detailLog} />

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
    </>
  );
}
