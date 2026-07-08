import Link from "next/link";
import { LogIn, Mail, UserPlus, BarChart3, Sunrise, Sun, MoonStar } from "lucide-react";

interface DashboardHeroProps {
  firstName: string;
  companyName: string | null;
  dateLabel: string;
  timeLabel: string;
  period: "morning" | "afternoon" | "night";
}

const QUICK_ACTIONS = [
  { href: "/acessos?novo=entrada", label: "Registrar entrada", icon: LogIn },
  { href: "/correspondencias?novo=1", label: "Nova correspondência", icon: Mail },
  { href: "/moradores?novo=1", label: "Novo morador", icon: UserPlus },
  { href: "/correspondencias/relatorios", label: "Relatórios", icon: BarChart3 },
];

const PERIOD_META = {
  morning: { label: "Bom dia", icon: Sunrise },
  afternoon: { label: "Boa tarde", icon: Sun },
  night: { label: "Boa noite", icon: MoonStar },
} as const;

export function DashboardHero({ firstName, companyName, dateLabel, timeLabel, period }: DashboardHeroProps) {
  const { label: periodLabel, icon: PeriodIcon } = PERIOD_META[period];

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0b1220_0%,#111d38_45%,#0b1220_100%)] p-6 shadow-lg sm:p-8">
      {/* Textura de pontos sutil para dar profundidade profissional */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-blue-100/80 backdrop-blur-sm">
            <PeriodIcon className="h-3.5 w-3.5 text-amber-300" />
            <span className="capitalize">{dateLabel}</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>{timeLabel}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {periodLabel}, {firstName}
          </h1>
          {companyName && <p className="mt-1.5 text-sm font-medium text-blue-200/70">{companyName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm font-medium text-white/90 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.12] hover:shadow-lg"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-200 transition-colors group-hover:bg-blue-500/30 group-hover:text-white">
                <a.icon className="h-3.5 w-3.5" />
              </span>
              <span className="whitespace-nowrap">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
