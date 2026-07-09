import { Users, UserPlus, Wrench, LogIn, LogOut, DoorOpen, PackageCheck, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { StatCard } from "@/components/shared/stat-card";
import { DashboardHero } from "@/components/modules/dashboard/dashboard-hero";
import { DashboardCharts } from "@/components/modules/dashboard/dashboard-charts";
import { InsideNowCard } from "@/components/modules/dashboard/inside-now-card";
import { PendingCorrespondenceCard } from "@/components/modules/dashboard/pending-correspondence-card";
import { ActivityFeedCard } from "@/components/modules/dashboard/activity-feed-card";
import { CORRESPONDENCE_STATUS_LABELS } from "@/lib/constants";
import type { AccessLog, AccessLogDestination, AuditLog, Correspondence } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const PT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PENDING_CORRESPONDENCE_STATUSES = ["recebido", "em_armazenamento", "aguardando_retirada"];

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const [
    residentsCount,
    visitorsCount,
    providersCount,
    entriesToday,
    exitsToday,
    { data: recentLogs },
    insideRes,
    pendingCorrespondenceRes,
    correspondenceTodayCount,
    { data: correspondenceStatusRows },
    { data: recentAudit },
  ] = await Promise.all([
    supabase.from("residents").select("*", { count: "exact", head: true }),
    supabase.from("visitors").select("*", { count: "exact", head: true }),
    supabase.from("service_providers").select("*", { count: "exact", head: true }),
    supabase.from("access_logs").select("*", { count: "exact", head: true }).gte("entry_at", todayStart.toISOString()),
    supabase.from("access_logs").select("*", { count: "exact", head: true }).gte("exit_at", todayStart.toISOString()),
    supabase.from("access_logs").select("*").gte("entry_at", since.toISOString()).order("entry_at"),
    supabase
      .from("access_logs")
      .select("*", { count: "exact" })
      .eq("status", "inside")
      .order("entry_at", { ascending: false })
      .limit(8),
    supabase
      .from("correspondences")
      .select("*", { count: "exact" })
      .in("status", PENDING_CORRESPONDENCE_STATUSES)
      .order("received_at", { ascending: true })
      .limit(6),
    supabase
      .from("correspondences")
      .select("*", { count: "exact", head: true })
      .gte("received_at", todayStart.toISOString()),
    supabase.from("correspondences").select("status"),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8),
  ]);

  const logs = (recentLogs as AccessLog[]) ?? [];
  const insideLogs = (insideRes.data as (AccessLog & { destinations?: AccessLogDestination[] })[]) ?? [];
  const pendingCorrespondence = (pendingCorrespondenceRes.data as Correspondence[]) ?? [];
  const auditLogs = (recentAudit as AuditLog[]) ?? [];

  // Entradas/saídas de ontem, para calcular a variação mostrada nos cards.
  const entriesYesterday = logs.filter((l) => {
    const e = new Date(l.entry_at);
    return e >= yesterdayStart && e < todayStart;
  }).length;
  const exitsYesterday = logs.filter((l) => {
    if (!l.exit_at) return false;
    const e = new Date(l.exit_at);
    return e >= yesterdayStart && e < todayStart;
  }).length;

  // Entradas por dia (últimos 14 dias)
  const days: { label: string; entradas: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const count = logs.filter((l) => {
      const e = new Date(l.entry_at);
      return e >= d && e < next;
    }).length;
    days.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, entradas: count });
  }

  // Entradas por mês (últimos 6 meses)
  const months: { label: string; entradas: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - i);
    const next = new Date(d);
    next.setMonth(d.getMonth() + 1);
    const count = logs.filter((l) => {
      const e = new Date(l.entry_at);
      return e >= d && e < next;
    }).length;
    months.push({ label: PT_MONTHS[d.getMonth()], entradas: count });
  }

  // Tipos de acesso
  const typeCounts = { resident: 0, visitor: 0, service_provider: 0 };
  logs.forEach((l) => {
    typeCounts[l.person_type]++;
  });
  const accessTypes = [
    { name: "Moradores", value: typeCounts.resident },
    { name: "Visitantes", value: typeCounts.visitor },
    { name: "Prestadores", value: typeCounts.service_provider },
  ].filter((t) => t.value > 0);

  // Horários de pico
  const hourBuckets = new Array(24).fill(0);
  logs.forEach((l) => {
    hourBuckets[new Date(l.entry_at).getHours()]++;
  });
  const peakHours = hourBuckets.map((acessos, h) => ({
    hora: `${String(h).padStart(2, "0")}h`,
    acessos,
  }));

  // Correspondências por status
  const statusGroups: Record<string, number> = {};
  (correspondenceStatusRows as { status: string }[] | null)?.forEach((row) => {
    const label = ["recusado", "devolvido", "extraviado", "cancelado"].includes(row.status)
      ? "Outros"
      : CORRESPONDENCE_STATUS_LABELS[row.status] ?? "Outros";
    statusGroups[label] = (statusGroups[label] ?? 0) + 1;
  });
  const correspondenceStatus = Object.entries(statusGroups).map(([name, value]) => ({ name, value }));

  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const timeLabel = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const firstName = session.profile.full_name.split(" ")[0] || "Controlador(a)";
  const hour = now.getHours();
  const period: "morning" | "afternoon" | "night" = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "night";

  return (
    <>
      <DashboardHero
        firstName={firstName}
        companyName={session.company?.name ?? null}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        period={period}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Dentro do condomínio"
          value={insideRes.count ?? insideLogs.length}
          icon={DoorOpen}
          accent="green"
          live
          hint="Pessoas presentes agora"
        />
        <StatCard
          label="Entradas hoje"
          value={entriesToday.count ?? 0}
          icon={LogIn}
          accent="blue"
          trend={{ diff: (entriesToday.count ?? 0) - entriesYesterday, label: `${entriesYesterday} ontem` }}
        />
        <StatCard
          label="Saídas hoje"
          value={exitsToday.count ?? 0}
          icon={LogOut}
          accent="red"
          trend={{ diff: (exitsToday.count ?? 0) - exitsYesterday, label: `${exitsYesterday} ontem` }}
        />
        <StatCard
          label="Correspondências pendentes"
          value={pendingCorrespondenceRes.count ?? 0}
          icon={PackageCheck}
          accent="amber"
          hint="Aguardando retirada"
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Moradores" value={residentsCount.count ?? 0} icon={Users} accent="blue" />
        <StatCard label="Visitantes" value={visitorsCount.count ?? 0} icon={UserPlus} accent="violet" />
        <StatCard label="Prestadores" value={providersCount.count ?? 0} icon={Wrench} accent="amber" />
        <StatCard label="Correspondências hoje" value={correspondenceTodayCount.count ?? 0} icon={Mail} accent="green" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <InsideNowCard logs={insideLogs} />
        <PendingCorrespondenceCard items={pendingCorrespondence} />
      </div>

      <div className="mb-6">
        <ActivityFeedCard logs={auditLogs} />
      </div>

      <DashboardCharts
        entriesPerDay={days}
        entriesPerMonth={months}
        accessTypes={accessTypes}
        peakHours={peakHours}
        correspondenceStatus={correspondenceStatus}
      />
    </>
  );
}
