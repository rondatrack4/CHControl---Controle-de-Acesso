import { DoorOpen, LogIn, LogOut, Truck } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

interface DashboardKpisProps {
  insideNow: number;
  entriesToday: number;
  exitsToday: number;
  deliveriesToday: number;
}

export function DashboardKpis({ insideNow, entriesToday, exitsToday, deliveriesToday }: DashboardKpisProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Dentro agora" value={insideNow} icon={DoorOpen} accent="green" />
      <StatCard label="Entradas hoje" value={entriesToday} icon={LogIn} accent="blue" />
      <StatCard label="Saídas hoje" value={exitsToday} icon={LogOut} accent="violet" />
      <StatCard label="Entregas hoje" value={deliveriesToday} icon={Truck} accent="amber" />
    </div>
  );
}
