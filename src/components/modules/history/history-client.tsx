"use client";

import { useMemo, useState } from "react";
import {
  Printer,
  FileDown,
  FileSpreadsheet,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/utils";
import { PERSON_TYPE_LABELS, PAGE_SIZE } from "@/lib/constants";
import { exportToPDF, exportToExcel, type ExportColumn } from "@/lib/export";
import { logExport } from "@/app/(app)/historico/actions";
import { LogDetailDialog } from "@/components/modules/history/log-detail-dialog";
import type { AccessLogWithDestinations } from "@/app/(app)/acessos/page";

interface Filters {
  q: string;
  personType: string;
  status: string;
  porter: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY: Filters = {
  q: "",
  personType: "all",
  status: "all",
  porter: "all",
  dateFrom: "",
  dateTo: "",
};

export function HistoryClient({ logs, porters }: { logs: AccessLogWithDestinations[]; porters: string[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [detailLog, setDetailLog] = useState<AccessLogWithDestinations | null>(null);

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(filters.dateFrom + "T00:00:00") : null;
    const to = filters.dateTo ? new Date(filters.dateTo + "T23:59:59") : null;
    return logs.filter((l) => {
      if (q) {
        const hay = `${l.person_name} ${l.person_cpf ?? ""} ${l.resident_responsible ?? ""} ${l.residence_label ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.personType !== "all" && l.person_type !== filters.personType) return false;
      if (filters.status !== "all" && l.status !== filters.status) return false;
      if (filters.porter !== "all" && l.entry_porter_name !== filters.porter) return false;
      const entry = new Date(l.entry_at);
      if (from && entry < from) return false;
      if (to && entry > to) return false;
      return true;
    });
  }, [logs, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeFilters =
    filters.q ||
    filters.personType !== "all" ||
    filters.status !== "all" ||
    filters.porter !== "all" ||
    filters.dateFrom ||
    filters.dateTo;

  const exportColumns: ExportColumn[] = [
    { header: "Nome", key: "person_name" },
    { header: "CPF", key: "person_cpf" },
    { header: "Tipo", key: "type" },
    { header: "Responsável", key: "resident_responsible" },
    { header: "Residência", key: "residence_label" },
    { header: "Entrada", key: "entry" },
    { header: "Saída", key: "exit" },
    { header: "Porteiro (entrada)", key: "entry_porter_name" },
    { header: "Porteiro (saída)", key: "exit_porter_name" },
    { header: "Status", key: "status" },
  ];

  function exportRows() {
    return filtered.map((l) => ({
      person_name: l.person_name,
      person_cpf: l.person_cpf ?? "",
      type: PERSON_TYPE_LABELS[l.person_type],
      resident_responsible: l.resident_responsible ?? "",
      residence_label: l.residence_label ?? "",
      entry: formatDateTime(l.entry_at),
      exit: l.exit_at ? formatDateTime(l.exit_at) : "",
      entry_porter_name: l.entry_porter_name ?? "",
      exit_porter_name: l.exit_porter_name ?? "",
      status: l.status === "inside" ? "Dentro" : "Fora",
    }));
  }

  function handlePDF() {
    exportToPDF("Histórico de Acessos", exportColumns, exportRows());
    void logExport("pdf", filtered.length);
  }
  function handleExcel() {
    exportToExcel("Histórico de Acessos", exportColumns, exportRows());
    void logExport("excel", filtered.length);
  }

  return (
    <>
      <PageHeader title="Histórico de Acessos" description="Consulte, filtre, imprima e exporte todos os registros.">
        <Button variant="outline" onClick={() => window.print()} className="no-print">
          <Printer /> Imprimir
        </Button>
        <Button variant="outline" onClick={handlePDF} className="no-print">
          <FileDown /> PDF
        </Button>
        <Button variant="outline" onClick={handleExcel} className="no-print">
          <FileSpreadsheet /> Excel
        </Button>
      </PageHeader>

      <Card className="mb-4 no-print">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
            {activeFilters ? (
              <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => setFilters(EMPTY)}>
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 lg:col-span-3">
              <Label>Pesquisa (nome, CPF, responsável, residência)</Label>
              <Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Digite para filtrar..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de pessoa</Label>
              <Select value={filters.personType} onValueChange={(v) => set("personType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="resident">Morador</SelectItem>
                  <SelectItem value="visitor">Visitante</SelectItem>
                  <SelectItem value="service_provider">Prestador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="inside">Dentro</SelectItem>
                  <SelectItem value="outside">Fora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Porteiro</Label>
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
              <TableHead>Pessoa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Responsável / Residência</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Porteiro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="no-print"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
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
                    <Badge variant="outline">{PERSON_TYPE_LABELS[l.person_type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{l.resident_responsible ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{l.residence_label ?? ""}</p>
                  </TableCell>
                  <TableCell className="text-sm">{formatDateTime(l.entry_at)}</TableCell>
                  <TableCell className="text-sm">{l.exit_at ? formatDateTime(l.exit_at) : "—"}</TableCell>
                  <TableCell className="text-sm">
                    <p>{l.entry_porter_name ?? "—"}</p>
                    {l.exit_porter_name && (
                      <p className="text-xs text-muted-foreground">Saída: {l.exit_porter_name}</p>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                  <TableCell className="no-print text-right">
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

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row no-print">
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
