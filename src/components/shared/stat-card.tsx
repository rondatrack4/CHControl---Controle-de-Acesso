import { type LucideIcon, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: "blue" | "green" | "amber" | "red" | "violet";
  hint?: string;
  /** Diferença numérica frente a um período de referência (ex.: ontem). Omitir quando não aplicável. */
  trend?: { diff: number; label?: string };
  /** Indicador de "ao vivo" (ponto pulsante), usado para métricas em tempo real como ocupação atual. */
  live?: boolean;
}

const ACCENTS: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const GLOW: Record<string, string> = {
  blue: "from-blue-500/10",
  green: "from-emerald-500/10",
  amber: "from-amber-500/10",
  red: "from-red-500/10",
  violet: "from-violet-500/10",
};

export function StatCard({ label, value, icon: Icon, accent = "blue", hint, trend, live }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent", GLOW[accent])} />
      <CardContent className="relative flex items-center gap-4 p-5">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", ACCENTS[accent])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {live && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && trend.diff !== 0 && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-semibold",
                  trend.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.diff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(trend.diff)}
              </span>
            )}
            {trend && trend.diff === 0 && (
              <span className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
                <Minus className="h-3 w-3" />
              </span>
            )}
          </div>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
          {trend?.label && <p className="truncate text-xs text-muted-foreground">{trend.label}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
