"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Car, Home, IdCard, Phone, Wrench } from "lucide-react";
import { initials } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
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

interface PersonDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: PersonDetail | null;
  timeline?: { entryAt: string; exitAt: string | null; destinations: AccessLogDestination[] };
}

export function PersonDetailDialog({ open, onOpenChange, person, timeline }: PersonDetailDialogProps) {
  if (!person) return null;

  const vehicleInfo = [person.vehicleBrand, person.vehicleModel, person.vehicleColor]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes</DialogTitle>
          <DialogDescription>Informações completas do cadastro.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src={person.photoUrl ?? undefined} alt={person.name} />
            <AvatarFallback className="text-2xl">{initials(person.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{person.name}</p>
            <Badge variant="outline" className="mt-1">{person.typeLabel}</Badge>
          </div>
          {person.companyName && (
            <p className="text-sm text-muted-foreground">{person.companyName}</p>
          )}
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex items-center gap-2">
            <IdCard className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              {person.cpf || "CPF não informado"}
              {person.documentNumber && (
                <span className="text-muted-foreground">
                  {" "}
                  · {DOCUMENT_TYPE_LABELS[person.documentType]} {person.documentNumber}
                </span>
              )}
            </span>
          </div>
          {person.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{person.phone}</span>
            </div>
          )}
          {person.serviceType && (
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{person.serviceType}</span>
            </div>
          )}
          {person.residentName && (
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                Resp.: {person.residentName}
                {person.residenceLabel && (
                  <span className="text-muted-foreground"> · {person.residenceLabel}</span>
                )}
              </span>
            </div>
          )}
          {person.vehiclePlate && (
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {person.vehiclePlate}
                {vehicleInfo && <span className="text-muted-foreground"> · {vehicleInfo}</span>}
              </span>
            </div>
          )}
        </div>

        {timeline && (
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold">Linha do tempo</p>
            <VisitTimeline entryAt={timeline.entryAt} exitAt={timeline.exitAt} destinations={timeline.destinations} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
