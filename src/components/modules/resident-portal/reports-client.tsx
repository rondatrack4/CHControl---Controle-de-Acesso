"use client";

import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/utils";
import { PERSON_TYPE_LABELS, VISITOR_CATEGORY_LABELS } from "@/lib/constants";
import { exportToPDF, exportToExcel, exportToCSV, type ExportColumn } from "@/lib/export";
import type { AccessLog } from "@/lib/database.types";

const REPORT_PRESETS = [
  { value: "all", label: "Histórico completo" },
  { value: "visitante", label: "Visitantes" },
  { value: "prestador_servico", label: "Prestadores" },
  { value: "uber", label: "Uber" },
  { value: "delivery", label: "Entregas" },
  { value: "funcionario", label: "Funcionários" },
  { value: "inside", label: "Permanência (dentro agora)" },
];

export function ResidentReportsClient({ logs }: { logs: AccessLog[] }) {
  const [preset, setPreset] = useState("all");

  const filtered = useMemo(() => {
    if (preset === "all") return logs;
    if (preset === "inside") return logs.filter((l) => l.status === "inside");
    return logs.filter((l) => l.person_category === preset);
  }, [logs, preset]);

  const exportColumns: ExportColumn[] = [
    { header: "Nome", key: "person_name" },
    { header: "Documento", key: "person_cpf" },
    { header: "Tipo", key: "type" },
    { header: "Destino", key: "residence_label" },
    { header: "Entrada", key: "entry" },
    { header: "Saída", key: "exit" },
    { header: "Status", key: "status" },
  ];

  function exportRows() {
    return filtered.map((l) => ({
      person_name: l.person_name,
      person_cpf: l.person_cpf ?? "",
      type: l.person_category ? VISITOR_CATEGORY_LABELS[l.person_category] ?? l.person_category : PERSON_TYPE_LABELS[l.person_type],
      residence_label: l.residence_label ?? "",
      entry: formatDateTime(l.entry_at),
      exit: l.exit_at ? formatDateTime(l.exit_at) : "",
      status: l.status === "inside" ? "Dentro" : "Fora",
    }));
  }

  const title = REPORT_PRESETS.find((p) => p.value === preset)?.label ?? "Relatório";

  return (
    <>
      <PageHeader title="Relatórios" description="Gere relatórios das visitas relacionadas a você.">
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

      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {REPORT_PRESETS.map((p) => (
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
              <TableHead>Pessoa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, 200).map((l) => (
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
