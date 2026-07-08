import { requireResident } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardKpis } from "@/components/modules/resident-portal/dashboard-kpis";
import { RecentActivityFeed } from "@/components/modules/resident-portal/recent-activity-feed";
import { NotificationBell } from "@/components/modules/resident-portal/notification-bell";
import type { AccessLog, Notification } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await requireResident();
  const residentId = session.profile.resident_id!;
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [logsRes, notificationsRes] = await Promise.all([
    supabase
      .from("access_logs")
      .select("*, destinations:access_log_destinations!inner(*)")
      .eq("destinations.resident_id", residentId)
      .gte("entry_at", since.toISOString())
      .order("entry_at", { ascending: false })
      .limit(50),
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const logs = (logsRes.data as AccessLog[]) ?? [];
  const notifications = (notificationsRes.data as Notification[]) ?? [];

  const insideNow = logs.filter((l) => l.status === "inside").length;
  const entriesToday = logs.filter((l) => new Date(l.entry_at) >= todayStart).length;
  const exitsToday = logs.filter((l) => l.exit_at && new Date(l.exit_at) >= todayStart).length;
  const deliveriesToday = logs.filter(
    (l) => l.person_category === "delivery" && new Date(l.entry_at) >= todayStart
  ).length;

  return (
    <>
      <PageHeader title="Início" description="Visão geral das visitas relacionadas a você.">
        <NotificationBell initialNotifications={notifications} residentId={residentId} />
      </PageHeader>

      <div className="space-y-6">
        <DashboardKpis
          insideNow={insideNow}
          entriesToday={entriesToday}
          exitsToday={exitsToday}
          deliveriesToday={deliveriesToday}
        />
        <RecentActivityFeed initialLogs={logs.slice(0, 20)} residentId={residentId} />
      </div>
    </>
  );
}
