"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { VisitTimeline } from "@/components/modules/access/visit-timeline";
import { formatDateTime } from "@/lib/utils";
import { PERSON_TYPE_LABELS, VISITOR_CATEGORY_LABELS, VISIT_PRIORITY_LABELS } from "@/lib/constants";
import type { AccessLogWithDestinations } from "@/app/(app)/acessos/page";

interface LogDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: AccessLogWithDestinations | null;
}

export function LogDetailDialog({ open, onOpenChange, log }: LogDetailDialogProps) {
  if (!log) return null;

  const destinations = [...log.destinations].sort((a, b) => a.sequence - b.sequence);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{log.person_name}</DialogTitle>
          <DialogDescription>
            <span className="mr-1.5 inline-flex items-center gap-1.5">
              <Badge variant="outline">
                {log.person_category ? VISITOR_CATEGORY_LABELS[log.person_category] ?? log.person_category : PERSON_TYPE_LABELS[log.person_type]}
              </Badge>
              <StatusBadge status={log.status} />
              {log.priority === "urgente" && <Badge variant="destructive">Urgente</Badge>}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <section className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Documento</p>
              <p>{log.person_cpf ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Motivo da visita</p>
              <p>{log.reason ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Controlador(a) (entrada)</p>
              <p>{log.entry_porter_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Controlador(a) (saída)</p>
              <p>{log.exit_porter_name ?? "—"}</p>
            </div>
            {log.expected_exit_at && (
              <div>
                <p className="text-xs text-muted-foreground">Previsão de saída</p>
                <p>{formatDateTime(log.expected_exit_at)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Prioridade</p>
              <p>{VISIT_PRIORITY_LABELS[log.priority] ?? log.priority}</p>
            </div>
          </section>

          {(log.service_description || log.notes) && (
            <section className="space-y-2 text-sm">
              {log.service_description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Descrição do serviço</p>
                  <p>{log.service_description}</p>
                </div>
              )}
              {log.notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Observações (entrada)</p>
                  <p>{log.notes}</p>
                </div>
              )}
            </section>
          )}

          {destinations.length > 0 && (
            <section className="space-y-2">
              <p className="text-sm font-semibold">Destinos</p>
              <div className="space-y-2">
                {destinations.map((d) => (
                  <div key={d.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{d.location_label}</p>
                    {d.internal_location && (
                      <p className="text-xs text-muted-foreground">Local interno: {d.internal_location}</p>
                    )}
                    {d.service_note && <p className="text-xs text-muted-foreground">Serviço: {d.service_note}</p>}
                    {d.notes && <p className="text-xs text-muted-foreground">Obs.: {d.notes}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(log.exit_notes || log.exit_photos.length > 0) && (
            <section className="space-y-2 rounded-lg border border-dashed p-4">
              <p className="text-sm font-semibold">Saída</p>
              {log.exit_notes && (
                <div className="text-sm">
                  <p className="text-xs font-semibold text-muted-foreground">Observações da saída</p>
                  <p>{log.exit_notes}</p>
                </div>
              )}
              {log.exit_photos.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Fotos</p>
                  <div className="flex flex-wrap gap-2">
                    {log.exit_photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Foto de saída ${i + 1}`}
                          className="h-20 w-20 rounded-md border object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section>
            <p className="mb-2 text-sm font-semibold">Linha do tempo</p>
            <VisitTimeline entryAt={log.entry_at} exitAt={log.exit_at} destinations={log.destinations} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
