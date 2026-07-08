"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, CalendarDays, Users, Clock, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#8b5cf6", "#ef4444"];
const CORRESPONDENCE_COLORS: Record<string, string> = {
  Recebido: "#2563eb",
  "Em Armazenamento": "#8b5cf6",
  "Aguardando Retirada": "#f59e0b",
  Entregue: "#16a34a",
  Outros: "#ef4444",
};

interface ChartsProps {
  entriesPerDay: { label: string; entradas: number }[];
  entriesPerMonth: { label: string; entradas: number }[];
  accessTypes: { name: string; value: number }[];
  peakHours: { hora: string; acessos: number }[];
  correspondenceStatus: { name: string; value: number }[];
}

function sum(items: { value: number }[] | { entradas: number }[] | { acessos: number }[]) {
  return items.reduce((acc: number, item) => {
    if ("value" in item) return acc + item.value;
    if ("entradas" in item) return acc + item.entradas;
    return acc + item.acessos;
  }, 0);
}

function ChartCardHeader({
  icon: Icon,
  title,
  total,
  totalLabel,
}: {
  icon: React.ElementType;
  title: string;
  total: number;
  totalLabel: string;
}) {
  return (
    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </CardTitle>
      <Badge variant="outline" className="font-semibold">
        {total} {totalLabel}
      </Badge>
    </CardHeader>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  fontSize: 12,
  border: "1px solid hsl(var(--border))",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

export function DashboardCharts({
  entriesPerDay,
  entriesPerMonth,
  accessTypes,
  peakHours,
  correspondenceStatus,
}: ChartsProps) {
  const accessTypesTotal = sum(accessTypes);
  const correspondenceTotal = sum(correspondenceStatus);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <ChartCardHeader
          icon={TrendingUp}
          title="Entradas por dia (últimos 14 dias)"
          total={sum(entriesPerDay)}
          totalLabel="no período"
        />
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={entriesPerDay} margin={{ left: -20, right: 8 }}>
              <defs>
                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#2563eb", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="entradas"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#colorEntradas)"
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <ChartCardHeader icon={CalendarDays} title="Entradas por mês" total={sum(entriesPerMonth)} totalLabel="em 6 meses" />
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={entriesPerMonth} margin={{ left: -20, right: 8 }}>
              <defs>
                <linearGradient id="colorMonthBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
              <Bar dataKey="entradas" fill="url(#colorMonthBar)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <ChartCardHeader icon={Users} title="Tipos de acesso" total={accessTypesTotal} totalLabel="registros" />
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={accessTypes}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                cornerRadius={6}
                label={(e) => `${e.name}: ${e.value}`}
                fontSize={12}
              >
                {accessTypes.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <ChartCardHeader
          icon={Clock}
          title="Horários de maior movimentação"
          total={sum(peakHours)}
          totalLabel="acessos"
        />
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={peakHours} margin={{ left: -20, right: 8 }}>
              <defs>
                <linearGradient id="colorHoursBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="hora" fontSize={10} tickLine={false} axisLine={false} interval={1} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(22,163,74,0.06)" }} />
              <Bar dataKey="acessos" fill="url(#colorHoursBar)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <ChartCardHeader
          icon={Package}
          title="Correspondências por status"
          total={correspondenceTotal}
          totalLabel="correspondências"
        />
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={correspondenceStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                cornerRadius={6}
                label={(e) => `${e.name}: ${e.value}`}
                fontSize={12}
              >
                {correspondenceStatus.map((entry, i) => (
                  <Cell key={i} fill={CORRESPONDENCE_COLORS[entry.name] ?? COLORS[i % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
