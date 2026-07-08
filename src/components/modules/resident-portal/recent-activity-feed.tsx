"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, initials } from "@/lib/utils";
import { PERSON_TYPE_LABELS, VISITOR_CATEGORY_LABELS } from "@/lib/constants";
import type { AccessLog } from "@/lib/database.types";

interface RecentActivityFeedProps {
  initialLogs: AccessLog[];
  residentId: string;
}

export function RecentActivityFeed({ initialLogs, residentId }: RecentActivityFeedProps) {
  const [logs, setLogs] = useState(initialLogs);
  const knownIds = useRef(new Set(initialLogs.map((l) => l.id)));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`resident-activity-${residentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "access_log_destinations",
          filter: `resident_id=eq.${residentId}`,
        },
        async (payload) => {
          const accessLogId = (payload.new as { access_log_id: string }).access_log_id;
          if (knownIds.current.has(accessLogId)) return;
          const { data } = await supabase.from("access_logs").select("*").eq("id", accessLogId).single();
          if (data) {
            knownIds.current.add(data.id);
            setLogs((prev) => [data as AccessLog, ...prev].slice(0, 30));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "access_logs" },
        (payload) => {
          const updated = payload.new as AccessLog;
          if (!knownIds.current.has(updated.id)) return;
          setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [residentId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Atividade recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {logs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma atividade recente relacionada a você.
            </p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(log.person_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate font-medium">{log.person_name}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {log.person_category ? VISITOR_CATEGORY_LABELS[log.person_category] ?? log.person_category : PERSON_TYPE_LABELS[log.person_type]}
                  </Badge>
                  {log.status === "inside" ? (
                    <Badge variant="success" className="text-[10px]">Dentro</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Saiu</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Entrada {formatDateTime(log.entry_at)}
                  {log.exit_at ? ` · Saída ${formatDateTime(log.exit_at)}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
