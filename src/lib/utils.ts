import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata data/hora no padrão brasileiro. */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  // Strings "YYYY-MM-DD" (colunas `date`, sem hora) são interpretadas pelo
  // Date() como meia-noite UTC — em fusos atrás de UTC isso exibe o dia
  // anterior. Nesses casos, monta a data em horário local diretamente.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

/** Máscara simples de CPF: 000.000.000-00 */
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Máscara de CNPJ: 00.000.000/0000-00 */
export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

type ResidenceLike = {
  residence_type?: string | null;
  block?: string | null;
  apartment?: string | null;
  quadra?: string | null;
  lote?: string | null;
};

/** Rótulo de uma única residência (bloco/apto ou quadra/lote). */
export function residenceLabel(r: ResidenceLike): string {
  if (r.residence_type === "lote") {
    const parts = [];
    if (r.quadra) parts.push(`Quadra ${r.quadra}`);
    if (r.lote) parts.push(`Lote ${r.lote}`);
    return parts.join(" / ") || "—";
  }
  const parts = [];
  if (r.block) parts.push(`Bloco ${r.block}`);
  if (r.apartment) parts.push(`Apto ${r.apartment}`);
  return parts.join(" / ") || "—";
}

/** Rótulos de todas as residências de um morador, na ordem cadastrada. */
export function residenceLabels(r: { residences?: ResidenceLike[] } & ResidenceLike): string[] {
  if (r.residences && r.residences.length > 0) return r.residences.map(residenceLabel);
  return [residenceLabel(r)];
}

/** Rótulo de residência do destinatário de uma correspondência (Bloco/Apto ou Quadra/Lote). */
export function recipientResidenceLabel(c: {
  recipient_residence_type?: string | null;
  recipient_block?: string | null;
  recipient_apartment?: string | null;
  recipient_quadra?: string | null;
  recipient_lote?: string | null;
}): string {
  return residenceLabel({
    residence_type: c.recipient_residence_type,
    block: c.recipient_block,
    apartment: c.recipient_apartment,
    quadra: c.recipient_quadra,
    lote: c.recipient_lote,
  });
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Tempo decorrido desde `start` até agora, em formato curto (ex: "2h 15min", "35min"). */
export function formatElapsed(start: string | Date): string {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const ms = Date.now() - startDate.getTime();
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

export type RecurringAuthComputedStatus = "active" | "expiring" | "expired" | "inactive";

/** Deriva o status visível de uma autorização recorrente a partir de status manual + data de validade. */
export function recurringAuthComputedStatus(auth: {
  status: string;
  end_date: string | null;
}): RecurringAuthComputedStatus {
  if (auth.status === "inactive") return "inactive";
  if (!auth.end_date) return "active";
  const today = new Date(todayISO());
  const end = new Date(auth.end_date);
  if (end < today) return "expired";
  const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000);
  if (daysLeft <= 7) return "expiring";
  return "active";
}

/** Resume a grade de horários por dia da semana em um texto curto para exibição em lista. */
export function weekdayScheduleSummary(
  schedule: { day: number; enabled: boolean; start_time: string; end_time: string }[]
): string | null {
  const enabled = schedule.filter((d) => d.enabled).sort((a, b) => a.day - b.day);
  if (enabled.length === 0) return null;

  const shortLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const sameTime = enabled.every((d) => d.start_time === enabled[0].start_time && d.end_time === enabled[0].end_time);

  if (!sameTime) {
    return enabled.map((d) => `${shortLabels[d.day]} ${d.start_time}-${d.end_time}`).join(", ");
  }

  const days = enabled.map((d) => d.day);
  const { start_time, end_time } = enabled[0];
  let daysLabel: string;
  if (days.length === 7) {
    daysLabel = "Todos os dias";
  } else if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) {
    daysLabel = "Segunda a sexta";
  } else {
    daysLabel = days.map((d) => shortLabels[d]).join(", ");
  }
  return `${daysLabel} · ${start_time}-${end_time}`;
}
