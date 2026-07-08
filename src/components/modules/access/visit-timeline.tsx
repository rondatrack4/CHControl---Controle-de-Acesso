import { LogIn, LogOut, MapPin, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { AccessLogDestination } from "@/lib/database.types";

interface VisitTimelineProps {
  entryAt: string;
  exitAt: string | null;
  destinations: AccessLogDestination[];
}

interface TimelineEvent {
  time: string;
  label: string;
  icon: typeof LogIn;
}

export function VisitTimeline({ entryAt, exitAt, destinations }: VisitTimelineProps) {
  const events: TimelineEvent[] = [{ time: entryAt, label: "Entrada registrada", icon: LogIn }];

  const sorted = [...destinations].sort((a, b) => a.sequence - b.sequence);
  for (const d of sorted) {
    if (d.arrived_at) {
      events.push({ time: d.arrived_at, label: `Chegou ao destino: ${d.location_label}`, icon: MapPin });
    }
    if (d.completed_at) {
      events.push({ time: d.completed_at, label: `Concluído: ${d.location_label}`, icon: CheckCircle2 });
    }
  }
  if (exitAt) {
    events.push({ time: exitAt, label: "Saída registrada", icon: LogOut });
  }

  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="space-y-4">
      {events.map((e, i) => {
        const Icon = e.icon;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </div>
              {i < events.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium">{e.label}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(e.time)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
