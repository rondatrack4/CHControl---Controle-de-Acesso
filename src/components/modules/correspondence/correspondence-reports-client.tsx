"use client";

import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportToPDF, exportToExcel, exportToCSV, type ExportColumn } from "@/lib/export";
import { formatDateTime, recipientResidenceLabel } from "@/lib/utils";
import type { Correspondence } from "@/lib/database.types";

const PRESETS = [
  { value: "all", label: "Histórico completo" },
  { value: "entregues", label: "Entregues" },
  { value: "pendentes", label: "Pendentes" },
  { value: "atrasadas", label: "Atrasadas (≥7 dias)" },
  { value: "extraviadas", label: "Extraviadas" },
  { value: "devolvidas", label: "Devolvidas" },
];

function topCounts(items: (string | null)[], limit = 5) {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item) continue;
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function CorrespondenceReportsClient({ correspondences }: { correspondences: Correspondence[] }) {
  const [preset, setPreset] = useState("all");

  const filtered = useMemo(() => {
    const days = (c: Correspondence) => Math.floor((Date.now() - new Date(c.received_at).getTime()) / 86400000);
    switch (preset) {
      case "entregues":
        return correspondences.filter((c) => c.status === "entregue");
      case "pendentes":
        return correspondences.filter((c) => ["recebido", "em_armazenamento", "aguardando_retirada"].includes(c.status));
      case "atrasadas":
        return correspondences.filter(
          (c) => ["recebido", "em_armazenamento", "aguardando_retirada"].includes(c.status) && days(c) >= 7
        );
      case "extraviadas":
        return correspondences.filter((c) => c.status === "extraviado");
      case "devolvidas":
        return correspondences.filter((c) => c.status === "devolvido");
      default:
        return correspondences;
    }
  }, [correspondences, preset]);

  const stats = useMemo(() => {
    const delivered = correspondences.filter((c) => c.delivered_at);
    const avgDays =
      delivered.length > 0
        ? delivered.reduce((sum, c) => sum + (new Date(c.delivered_at!).getTime() - new Date(c.received_at).getTime()), 0) /
          delivered.length /
          86400000
        : 0;
    return {
      byCarrier: topCounts(correspondences.map((c) => c.carrier)),
      byResident: topCounts(correspondences.map((c) => c.recipient_name)),
      byBlock: topCounts(correspondences.map((c) => {
        const label = recipientResidenceLabel(c);
        return label === "—" ? null : label;
      })),
      byPorter: topCounts(correspondences.map((c) => c.entry_porter_name)),
      avgDays,
    };
  }, [correspondences]);

  const exportColumns: ExportColumn[] = [
    { header: "Código", key: "code" },
    { header: "Destinatário", key: "recipient" },
    { header: "Residência", key: "location" },
    { header: "Tipo", key: "type" },
    { header: "Transportadora", key: "carrier" },
    { header: "Recebimento", key: "received" },
    { header: "Entrega", key: "delivered" },
    { header: "Status", key: "status" },
  ];

  function exportRows() {
    return filtered.map((c) => ({
      code: c.registration_number,
      recipient: c.recipient_name ?? "",
      location: recipientResidenceLabel(c),
      type: c.type,
      carrier: c.carrier ?? "",
      received: formatDateTime(c.received_at),
      delivered: c.delivered_at ? formatDateTime(c.delivered_at) : "",
      status: c.status,
    }));
  }

  const title = PRESETS.find((p) => p.value === preset)?.label ?? "Relatório";

  return (
    <>
      <PageHeader title="Relatórios de Correspondências" description="Recebidas, entregues, pendentes e estatísticas.">
        <Button variant="outline" onClick={() => exportToPDF(title, exportColumns, exportRows())}>
          <FileDown /> PDF
        </Button>
        <Button variant="outline" onClick={() => exportToExcel(title, exportColumns, exportRows())}>
          <FileSpreadsheet /> Excel
        </Button>
        <Button variant="outline" onClick={() => exportToCSV(title, exportColumns, exportRows())}>
          <FileText /> CSV
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tempo médio de retirada</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats.avgDays.toFixed(1)} dias</CardContent>
        </Card>
        {[
          { label: "Mais recebidas — Transportadora", data: stats.byCarrier },
          { label: "Mais recebidas — Morador", data: stats.byResident },
          { label: "Mais recebidas — Residência", data: stats.byBlock },
          { label: "Mais recebidas — Controlador(a)", data: stats.byPorter },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{s.label}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {s.data.length === 0 && <p className="text-muted-foreground">Sem dados.</p>}
              {s.data.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="truncate">{name}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                preset === p.value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {p.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Transportadora</TableHead>
              <TableHead>Recebimento</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, 200).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.registration_number}</TableCell>
                  <TableCell className="text-sm">{c.recipient_name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell className="text-sm">{c.carrier ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDateTime(c.received_at)}</TableCell>
                  <TableCell className="text-sm">{c.delivered_at ? formatDateTime(c.delivered_at) : "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filtered.length > 200 && (
          <p className="border-t p-3 text-center text-xs text-muted-foreground">
            Mostrando 200 de {filtered.length} registros. Exporte para ver a lista completa.
          </p>
        )}
      </div>
    </>
  );
}
