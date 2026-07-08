"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import JsBarcode from "jsbarcode";
import {
  Package,
  PackagePlus,
  PackageCheck,
  Pencil,
  Trash2,
  Printer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCorrespondenceHistory } from "@/app/(app)/correspondencias/actions";
import { formatDateTime, recipientResidenceLabel } from "@/lib/utils";
import { CORRESPONDENCE_PRIORITY_LABELS } from "@/lib/constants";
import type { AuditLog, Correspondence } from "@/lib/database.types";

interface CorrespondenceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correspondence: Correspondence | null;
  readOnly?: boolean;
}

const HISTORY_ACTION_LABELS: Record<string, string> = {
  create: "Correspondência recebida",
  update: "Dados atualizados",
  status_change: "Status alterado",
  deliver: "Entregue",
  duplicate: "Duplicada a partir de outro registro",
  delete: "Excluída",
};

export function CorrespondenceDetailDialog({
  open,
  onOpenChange,
  correspondence,
  readOnly,
}: CorrespondenceDetailDialogProps) {
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [mounted, setMounted] = useState(false);
  const code = correspondence?.tracking_code || correspondence?.registration_number || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !correspondence) return;
    getCorrespondenceHistory(correspondence.id).then(setHistory).catch(() => setHistory([]));
  }, [open, correspondence]);

  // Callback ref: desenha o código de barras assim que o <svg> monta, sem
  // depender de timing de useEffect/useRef (mais robusto entre remontagens).
  function drawBarcode(el: SVGSVGElement | null) {
    if (!el || !code) return;
    try {
      JsBarcode(el, code, { format: "CODE128", width: 1.4, height: 40, displayValue: true, fontSize: 11 });
    } catch {
      // código inválido para CODE128 (ex.: caracteres não suportados) — ignora silenciosamente
    }
  }

  if (!correspondence) return null;

  function printView(mode: "etiqueta" | "comprovante") {
    document.body.setAttribute("data-print-mode", mode);
    window.print();
    setTimeout(() => document.body.removeAttribute("data-print-mode"), 500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{correspondence.registration_number}</DialogTitle>
          <DialogDescription>Detalhes completos, fotos, assinaturas e histórico.</DialogDescription>
        </DialogHeader>

        <div className="-mt-2 flex items-center gap-1.5">
          <Badge variant="outline">{correspondence.type}</Badge>
          <StatusBadge status={correspondence.status} />
          {correspondence.priority !== "normal" && (
            <Badge variant={correspondence.priority === "urgente" ? "destructive" : "outline"}>
              {CORRESPONDENCE_PRIORITY_LABELS[correspondence.priority]}
            </Badge>
          )}
        </div>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <section className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Destinatário</p>
              <p>{correspondence.recipient_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Residência</p>
              <p>{recipientResidenceLabel(correspondence)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transportadora</p>
              <p>{correspondence.carrier ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remetente</p>
              <p>{correspondence.sender_company ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido em</p>
              <p>{formatDateTime(correspondence.received_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Porteiro (recebimento)</p>
              <p>{correspondence.entry_porter_name ?? "—"}</p>
            </div>
            {correspondence.location_note && (
              <div>
                <p className="text-xs text-muted-foreground">Localização</p>
                <p>{correspondence.location_note}</p>
              </div>
            )}
            {correspondence.delivered_at && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Entregue em</p>
                  <p>{formatDateTime(correspondence.delivered_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Retirado por</p>
                  <p>{correspondence.delivered_to_name ?? "—"}</p>
                </div>
              </>
            )}
            {correspondence.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Observações</p>
                <p>{correspondence.notes}</p>
              </div>
            )}
          </section>

          <section className="rounded-lg border p-4">
            <svg ref={drawBarcode} className="w-full" />
          </section>

          {correspondence.entry_photos.length > 0 && (
            <section className="space-y-2">
              <p className="text-sm font-semibold">Fotos</p>
              <div className="flex flex-wrap gap-2">
                {correspondence.entry_photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-md border object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {(correspondence.entry_signature_url || correspondence.delivery_signature_url) && (
            <section className="grid gap-4 sm:grid-cols-2">
              {correspondence.entry_signature_url && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Assinatura (recebimento)</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={correspondence.entry_signature_url} alt="Assinatura recebimento" className="h-16 rounded-md border bg-white object-contain" />
                </div>
              )}
              {correspondence.delivery_signature_url && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Assinatura (entrega)</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={correspondence.delivery_signature_url} alt="Assinatura entrega" className="h-16 rounded-md border bg-white object-contain" />
                </div>
              )}
            </section>
          )}

          <section>
            <p className="mb-2 text-sm font-semibold">Linha do tempo</p>
            <div className="space-y-3">
              {history.length === 0 && <p className="text-sm text-muted-foreground">Sem movimentações registradas.</p>}
              {history.map((h) => (
                <div key={h.id} className="flex gap-3 text-sm">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {h.action === "deliver" ? <PackageCheck className="h-3.5 w-3.5" /> : h.action === "create" ? <PackagePlus className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="font-medium">{HISTORY_ACTION_LABELS[h.action] ?? h.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.user_name ?? "—"} · {formatDateTime(h.created_at)}
                      {typeof h.details?.from_status === "string" && typeof h.details?.to_status === "string"
                        ? ` · ${h.details.from_status} → ${h.details.to_status}`
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {!readOnly && (
          <div className="mt-2 flex flex-wrap gap-2 no-print">
            <Button variant="outline" size="sm" onClick={() => printView("etiqueta")}>
              <Printer className="h-4 w-4" /> Imprimir etiqueta
            </Button>
            <Button variant="outline" size="sm" onClick={() => printView("comprovante")}>
              <Printer className="h-4 w-4" /> Imprimir comprovante
            </Button>
          </div>
        )}
      </DialogContent>

      {/* Conteúdo exclusivo de impressão — renderizado via portal direto no
          <body> para que o CSS de impressão (que oculta todo o resto da
          página) não acabe ocultando esta própria área, já que ela precisa
          ser irmã direta do body, não uma descendente aninhada. */}
      {mounted &&
        createPortal(
          <div id="correspondence-print-area" className="hidden">
            <div className="print-etiqueta">
              <p className="text-lg font-bold">{correspondence.registration_number}</p>
              <p>{correspondence.recipient_name}</p>
              <p>{recipientResidenceLabel(correspondence)}</p>
              <svg ref={drawBarcode} />
            </div>
            <div className="print-comprovante">
              <h2>Comprovante — {correspondence.registration_number}</h2>
              <p>Destinatário: {correspondence.recipient_name ?? "—"}</p>
              <p>Tipo: {correspondence.type} · Transportadora: {correspondence.carrier ?? "—"}</p>
              <p>Recebido em: {formatDateTime(correspondence.received_at)} por {correspondence.entry_porter_name ?? "—"}</p>
              {correspondence.delivered_at && (
                <p>
                  Entregue em: {formatDateTime(correspondence.delivered_at)} para {correspondence.delivered_to_name ?? "—"}
                  {" "}por {correspondence.delivery_porter_name ?? "—"}
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </Dialog>
  );
}
