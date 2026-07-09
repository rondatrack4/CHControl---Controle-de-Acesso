"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Car, Home, IdCard, Phone, Wrench, FileText, Clock, Flag, X } from "lucide-react";
import { initials, formatDateTime } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS, VISIT_PRIORITY_LABELS } from "@/lib/constants";
import { PhotoWithViewer } from "@/components/shared/photo-viewer";
import { VisitTimeline } from "@/components/modules/access/visit-timeline";
import type { AccessLogDestination, DocumentType } from "@/lib/database.types";

export interface PersonDetail {
  name: string;
  photoUrl: string | null;
  typeLabel: string;
  cpf: string | null;
  documentType: DocumentType;
  documentNumber: string | null;
  phone: string | null;
  companyName?: string | null;
  serviceType?: string | null;
  vehiclePlate?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
  residentName?: string | null;
  residenceLabel?: string | null;
}

export interface VisitInfo {
  reason?: string | null;
  notes?: string | null;
  serviceDescription?: string | null;
  expectedExitAt?: string | null;
  priority?: string | null;
  entryPorterName?: string | null;
}

interface PersonDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: PersonDetail | null;
  timeline?: { entryAt: string; exitAt: string | null; destinations: AccessLogDestination[] };
  visit?: VisitInfo;
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

export function PersonDetailDialog({ open, onOpenChange, person, timeline, visit }: PersonDetailDialogProps) {
  if (!person) return null;

  const vehicleInfo = [person.vehicleBrand, person.vehicleModel, person.vehicleColor]
    .filter(Boolean)
    .join(" · ");

  const hasVisitDetails =
    visit && (visit.reason || visit.notes || visit.serviceDescription || visit.expectedExitAt || visit.entryPorterName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" hideClose>
        <DialogHeader className="space-y-0">
          {/* Banner */}
          <div className="relative -mx-6 -mt-6 overflow-hidden rounded-t-lg bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 px-6 pb-6 pt-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-sky-300/10 blur-3xl" />

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/80 backdrop-blur-sm transition-all hover:bg-white/25 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex items-center gap-5">
              {person.photoUrl ? (
                <PhotoWithViewer
                  photoUrl={person.photoUrl}
                  photoAlt={person.name}
                  className="h-24 w-24 shrink-0 rounded-2xl ring-2 ring-white/30"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-semibold text-white ring-2 ring-white/30">
                  {initials(person.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/30">{person.typeLabel}</Badge>
                  {visit?.priority === "urgente" && (
                    <Badge variant="destructive">Urgente</Badge>
                  )}
                </div>
                <DialogTitle className="truncate text-2xl font-bold text-white">{person.name}</DialogTitle>
                {person.companyName && (
                  <p className="mt-1 truncate text-sm text-blue-100/90">{person.companyName}</p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {/* Dados do cadastro */}
          <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <InfoRow icon={<IdCard className="h-4 w-4" />}>
              {person.cpf || "CPF não informado"}
              {person.documentNumber && (
                <span className="text-muted-foreground">
                  {" "}· {DOCUMENT_TYPE_LABELS[person.documentType]} {person.documentNumber}
                </span>
              )}
            </InfoRow>
            {person.phone && (
              <InfoRow icon={<Phone className="h-4 w-4" />}>{person.phone}</InfoRow>
            )}
            {person.serviceType && (
              <InfoRow icon={<Wrench className="h-4 w-4" />}>{person.serviceType}</InfoRow>
            )}
            {person.residentName && (
              <InfoRow icon={<Home className="h-4 w-4" />}>
                Resp.: {person.residentName}
                {person.residenceLabel && (
                  <span className="text-muted-foreground"> · {person.residenceLabel}</span>
                )}
              </InfoRow>
            )}
            {person.vehiclePlate && (
              <InfoRow icon={<Car className="h-4 w-4" />}>
                <span className="font-mono">{person.vehiclePlate}</span>
                {vehicleInfo && <span className="text-muted-foreground"> · {vehicleInfo}</span>}
              </InfoRow>
            )}
          </section>

          {/* Detalhes da visita */}
          {hasVisitDetails && (
            <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Detalhes da visita</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Motivo da visita</p>
                  <p>{visit?.reason || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <p>{visit?.priority ? VISIT_PRIORITY_LABELS[visit.priority] ?? visit.priority : "Normal"}</p>
                </div>
                {visit?.expectedExitAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Previsão de saída</p>
                    <p className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDateTime(visit.expectedExitAt)}
                    </p>
                  </div>
                )}
                {visit?.entryPorterName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Registrado por</p>
                    <p>{visit.entryPorterName}</p>
                  </div>
                )}
              </div>
              {visit?.serviceDescription && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Descrição do serviço</p>
                  <p>{visit.serviceDescription}</p>
                </div>
              )}
              {visit?.notes && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="whitespace-pre-wrap">{visit.notes}</p>
                </div>
              )}
            </section>
          )}

          {/* Linha do tempo */}
          {timeline && (
            <section className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Linha do tempo</h3>
              </div>
              <VisitTimeline entryAt={timeline.entryAt} exitAt={timeline.exitAt} destinations={timeline.destinations} />
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
