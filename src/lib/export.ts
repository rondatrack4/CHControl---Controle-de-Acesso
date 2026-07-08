import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
}

/** Exporta um conjunto de linhas para PDF (paisagem). */
export function exportToPDF(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, string | number>[]
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`${slug(title)}.pdf`);
}

/** Exporta um conjunto de linhas para Excel (.xlsx). */
export function exportToExcel(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, string | number>[]
) {
  const data = rows.map((r) => {
    const obj: Record<string, string | number> = {};
    columns.forEach((c) => {
      obj[c.header] = r[c.key] ?? "";
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, `${slug(title)}.xlsx`);
}

/** Exporta um conjunto de linhas para CSV (download direto no navegador). */
export function exportToCSV(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, string | number>[]
) {
  const escape = (val: string | number) => {
    const s = String(val ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(r[c.key] ?? "")).join(",")).join("\n");
  const csv = "﻿" + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(title)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
