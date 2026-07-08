import { PackageCheck, PackageOpen, PackagePlus, Clock, CalendarRange } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

interface CorrespondenceDashboardKpisProps {
  receivedToday: number;
  pending: number;
  deliveredToday: number;
  awaitingPickup: number;
  monthTotal: number;
}

export function CorrespondenceDashboardKpis({
  receivedToday,
  pending,
  deliveredToday,
  awaitingPickup,
  monthTotal,
}: CorrespondenceDashboardKpisProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="Recebidas hoje" value={receivedToday} icon={PackagePlus} accent="blue" />
      <StatCard label="Pendentes" value={pending} icon={Clock} accent="amber" />
      <StatCard label="Entregues hoje" value={deliveredToday} icon={PackageCheck} accent="green" />
      <StatCard label="Aguardando retirada" value={awaitingPickup} icon={PackageOpen} accent="violet" />
      <StatCard label="Total do mês" value={monthTotal} icon={CalendarRange} accent="blue" />
    </div>
  );
}
