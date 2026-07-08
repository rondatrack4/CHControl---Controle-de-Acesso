import { Activity, AlertCircle, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatElapsed } from "@/lib/utils";
import type { AccessLog } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const now = new Date();
  const lastHourStart = new Date(now.getTime() - 60 * 60 * 1000);
  const lastDayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    insideCountRes,
    entriesLastHourRes,
    entriesLastDayRes,
    recentEntriesRes,
  ] = await Promise.all([
    supabase
      .from("access_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "inside"),
    supabase
      .from("access_logs")
      .select("*", { count: "exact", head: true })
      .gte("entry_at", lastHourStart.toISOString()),
    supabase
      .from("access_logs")
      .select("*", { count: "exact", head: true })
      .gte("entry_at", lastDayStart.toISOString()),
    supabase
      .from("access_logs")
      .select("*")
      .order("entry_at", { ascending: false })
      .limit(20),
  ]);

  const insideCount = insideCountRes.count ?? 0;
  const entriesLastHour = entriesLastHourRes.count ?? 0;
  const entriesLastDay = entriesLastDayRes.count ?? 0;
  const recentEntries = (recentEntriesRes.data as AccessLog[]) ?? [];

  // Calcular tendência horária
  const avgPerHour = entriesLastDay / 24;
  const trend = entriesLastHour > avgPerHour ? "up" : "down";
  const trendPercent = Math.round(((entriesLastHour - avgPerHour) / avgPerHour) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monitoramento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status em tempo real da portaria e atividades recentes.
        </p>
      </div>

      {/* Cards de Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoas Dentro</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insideCount}</div>
            <p className="text-xs text-muted-foreground">
              Presentes no condomínio agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas (1h)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entriesLastHour}</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                Média: {Math.round(avgPerHour)}/hora
              </span>
              <Badge variant={trend === "up" ? "default" : "secondary"} className="text-[10px]">
                {trend === "up" ? "↑" : "↓"} {Math.abs(trendPercent)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas (24h)</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entriesLastDay}</div>
            <p className="text-xs text-muted-foreground">
              Total das últimas 24h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Entradas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>
            Últimas entradas registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEntries.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhuma atividade recent
              </p>
            ) : (
              recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{entry.person_name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{entry.residence_label || "—"}</span>
                      {entry.vehicle_plate && (
                        <span>Placa: {entry.vehicle_plate}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <span>{formatDateTime(entry.entry_at)}</span>
                    <span className="font-medium text-green-600">
                      Há {formatElapsed(entry.entry_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
