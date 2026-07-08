"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Filter, Search, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CorrespondenceDetailDialog } from "@/components/modules/correspondence/correspondence-detail-dialog";
import { formatDateTime } from "@/lib/utils";
import type { Correspondence } from "@/lib/database.types";

const PENDING_STATUSES = new Set(["recebido", "em_armazenamento", "aguardando_retirada"]);

export function ResidentCorrespondenceClient({ correspondences }: { correspondences: Correspondence[] }) {
  const [query, setQuery] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [viewing, setViewing] = useState<Correspondence | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const viewId = searchParams.get("view");
    if (!viewId) return;
    const match = correspondences.find((c) => c.id === viewId);
    if (match) setViewing(match);
  }, [searchParams, correspondences]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return correspondences.filter((c) => {
      if (onlyPending && !PENDING_STATUSES.has(c.status)) return false;
      if (q) {
        const hay = `${c.type} ${c.carrier ?? ""} ${c.tracking_code ?? ""} ${c.registration_number}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [correspondences, query, onlyPending]);

  const pendingCount = correspondences.filter((c) => PENDING_STATUSES.has(c.status)).length;

  return (
    <>
      <PageHeader title="Correspondências" description="Encomendas e correspondências recebidas para você." />

      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
            {(query || onlyPending) && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7"
                onClick={() => {
                  setQuery("");
                  setOnlyPending(false);
                }}
              >
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por tipo, transportadora ou código..." className="pl-9" />
            </div>
            <button
              onClick={() => setOnlyPending((v) => !v)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                onlyPending ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Só pendentes ({pendingCount})
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Transportadora</TableHead>
              <TableHead>Recebimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhuma correspondência encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.registration_number}</TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell className="text-sm">{c.carrier ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDateTime(c.received_at)}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewing(c)} aria-label="Ver detalhes">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CorrespondenceDetailDialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} correspondence={viewing} readOnly />
    </>
  );
}
