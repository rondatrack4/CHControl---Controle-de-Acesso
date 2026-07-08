"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Search, DoorOpen, Eye, Car, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { PersonDetailDialog, type PersonDetail } from "@/components/modules/access/person-detail-dialog";
import { EntryFormDialog } from "@/components/modules/access/entry-form-dialog";
import { ExitFormDialog } from "@/components/modules/access/exit-form-dialog";
import { formatDateTime, formatElapsed, initials, residenceLabel } from "@/lib/utils";
import { PERSON_TYPE_LABELS, VISITOR_CATEGORY_LABELS } from "@/lib/constants";
import type { Resident, ServiceProvider, Visitor, Unit } from "@/lib/database.types";
import type { AccessLogWithDestinations } from "@/app/(app)/acessos/page";

type VisitorRow = Visitor & { resident: Resident | null };
type ProviderRow = ServiceProvider & { resident: Resident | null };

interface AccessClientProps {
  visitors: VisitorRow[];
  providers: ProviderRow[];
  inside: AccessLogWithDestinations[];
  residents: Resident[];
  units?: Unit[];
}

export function AccessClient({ visitors, providers, inside, residents, units = [] }: AccessClientProps) {
  const [insideQuery, setInsideQuery] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
  const [exitLog, setExitLog] = useState<AccessLogWithDestinations | null>(null);
  const [detailPerson, setDetailPerson] = useState<PersonDetail | null>(null);
  const [detailTimeline, setDetailTimeline] = useState<{ entryAt: string; exitAt: string | null; destinations: AccessLogWithDestinations["destinations"] } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("novo") === "entrada") {
      setEntryOpen(true);
      router.replace("/acessos");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Mapa para recuperar foto/dados completos de quem está dentro do condomínio.
  const personMap = useMemo(() => {
    const map = new Map<string, PersonDetail>();
    for (const v of visitors) {
      map.set(`visitor:${v.id}`, {
        name: v.full_name,
        photoUrl: v.photo_url,
        typeLabel: VISITOR_CATEGORY_LABELS[v.category] ?? PERSON_TYPE_LABELS.visitor,
        cpf: v.cpf,
        documentType: v.document_type,
        documentNumber: v.document_number,
        phone: v.phone,
        companyName: v.company_name,
        vehiclePlate: v.vehicle_plate,
        vehicleBrand: v.vehicle_brand,
        vehicleModel: v.vehicle_model,
        vehicleColor: v.vehicle_color,
        residentName: v.resident?.full_name ?? null,
        residenceLabel: v.resident ? residenceLabel(v.resident) : null,
      });
    }
    for (const p of providers) {
      map.set(`service_provider:${p.id}`, {
        name: p.full_name,
        photoUrl: p.photo_url,
        typeLabel: VISITOR_CATEGORY_LABELS[p.category] ?? PERSON_TYPE_LABELS.service_provider,
        cpf: p.cpf,
        documentType: p.document_type,
        documentNumber: p.document_number,
        phone: p.phone,
        companyName: p.company_name,
        serviceType: p.service_type,
        vehiclePlate: p.vehicle_plate,
        vehicleBrand: p.vehicle_brand,
        vehicleModel: p.vehicle_model,
        vehicleColor: p.vehicle_color,
        residentName: p.resident?.full_name ?? null,
        residenceLabel: p.resident ? residenceLabel(p.resident) : null,
      });
    }
    return map;
  }, [visitors, providers]);

  const filteredInside = useMemo(() => {
    const q = insideQuery.trim().toLowerCase();
    if (!q) return inside;
    return inside.filter((log) =>
      `${log.person_name} ${log.resident_responsible ?? ""} ${log.residence_label ?? ""} ${log.person_category ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [inside, insideQuery]);

  function openDetail(log: AccessLogWithDestinations) {
    const base = personMap.get(`${log.person_type}:${log.person_id}`);
    // Prioriza o snapshot da própria entrada — reflete o que valeu para esta visita,
    // mesmo que o cadastro tenha sido ajustado apenas para este registro.
    const person: PersonDetail = {
      name: log.person_name,
      photoUrl: base?.photoUrl ?? null,
      typeLabel: log.person_category
        ? VISITOR_CATEGORY_LABELS[log.person_category] ?? base?.typeLabel ?? PERSON_TYPE_LABELS[log.person_type]
        : base?.typeLabel ?? PERSON_TYPE_LABELS[log.person_type],
      cpf: log.person_cpf,
      documentType: log.person_document_type ?? base?.documentType ?? "rg",
      documentNumber: log.person_document_number ?? base?.documentNumber ?? null,
      phone: log.person_phone ?? base?.phone ?? null,
      companyName: log.person_company_name ?? base?.companyName ?? null,
      serviceType: log.person_service_type ?? base?.serviceType ?? null,
      vehiclePlate: log.vehicle_plate ?? base?.vehiclePlate ?? null,
      vehicleBrand: log.vehicle_brand ?? base?.vehicleBrand ?? null,
      vehicleModel: log.vehicle_model ?? base?.vehicleModel ?? null,
      vehicleColor: log.vehicle_color ?? base?.vehicleColor ?? null,
      residentName: base?.residentName ?? null,
      residenceLabel: base?.residenceLabel ?? null,
    };
    setDetailPerson(person);
    setDetailTimeline({ entryAt: log.entry_at, exitAt: log.exit_at, destinations: log.destinations });
    setDetailOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Controle de Acesso"
        description="Registre entradas e saídas de visitantes e prestadores."
      >
        <Button onClick={() => setEntryOpen(true)}>
          <LogIn /> Registrar Entrada
        </Button>
      </PageHeader>

      <div className="grid gap-6">
        {/* Atualmente dentro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-emerald-600" /> Dentro do condomínio
              <Badge variant="secondary" className="ml-1">{inside.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={insideQuery}
                onChange={(e) => setInsideQuery(e.target.value)}
                placeholder="Buscar por nome, morador ou categoria..."
                className="pl-9"
              />
            </div>

            <div className="max-h-[560px] space-y-2 overflow-y-auto">
              {filteredInside.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {inside.length === 0
                    ? "Ninguém registrado dentro no momento."
                    : "Nenhum resultado para essa busca."}
                </p>
              )}
              {filteredInside.map((log) => {
                const person = personMap.get(`${log.person_type}:${log.person_id}`);
                // Prioriza o veículo registrado nesta entrada (pode ter sido ajustado só para a visita).
                const vehiclePlate = log.vehicle_plate ?? person?.vehiclePlate;
                return (
                  <div key={log.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={person?.photoUrl ?? undefined} alt={log.person_name} />
                        <AvatarFallback>{initials(log.person_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate font-medium">{log.person_name}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {log.person_category ? VISITOR_CATEGORY_LABELS[log.person_category] ?? log.person_category : PERSON_TYPE_LABELS[log.person_type]}
                          </Badge>
                          {log.priority === "urgente" && (
                            <Badge variant="destructive" className="text-[10px]">Urgente</Badge>
                          )}
                          {vehiclePlate && (
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              <Car className="h-3 w-3" /> {vehiclePlate}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {log.destinations.length > 1
                            ? `${log.destinations.length} destinos`
                            : log.residence_label ?? "—"}
                          {" · Entrada "}
                          {formatDateTime(log.entry_at)}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" title="Visualizar" onClick={() => openDetail(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> Há {formatElapsed(log.entry_at)}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setExitLog(log)}>
                        Saída
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <EntryFormDialog open={entryOpen} onOpenChange={setEntryOpen} residents={residents} units={units} inside={inside} />
      <ExitFormDialog open={!!exitLog} onOpenChange={(o) => !o && setExitLog(null)} log={exitLog} />
      <PersonDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        person={detailPerson}
        timeline={detailTimeline ?? undefined}
      />
    </>
  );
}
