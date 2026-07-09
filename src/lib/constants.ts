import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserCog,
  Home,
  Wrench,
  LogIn,
  History,
  Building2,
  ScrollText,
  FileBarChart,
  PackageSearch,
  Repeat,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/database.types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[]; // se ausente, visível a todos os autenticados
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Controle de Acesso", href: "/acessos", icon: LogIn },
  { label: "Moradores", href: "/moradores", icon: Users },
  { label: "Visitantes", href: "/visitantes", icon: UserPlus },
  { label: "Prestadores", href: "/prestadores", icon: Wrench },
  { label: "Unidades", href: "/unidades", icon: Home },
  { label: "Recorrente", href: "/recorrentes", icon: Repeat },
  { label: "Monitoramento", href: "/monitoramento", icon: Activity },
  { label: "Correspondências", href: "/correspondencias", icon: PackageSearch },
  { label: "Histórico", href: "/historico", icon: History },
  { label: "Auditoria", href: "/auditoria", icon: ScrollText },
  { label: "Usuários", href: "/usuarios", icon: UserCog, roles: ["superadmin", "admin"] },
  { label: "Empresas", href: "/empresas", icon: Building2, roles: ["superadmin"] },
];

export const RESIDENT_NAV_ITEMS: NavItem[] = [
  { label: "Início", href: "/portal", icon: LayoutDashboard },
  { label: "Correspondências", href: "/portal/correspondencias", icon: PackageSearch },
  { label: "Histórico", href: "/portal/historico", icon: History },
  { label: "Relatórios", href: "/portal/relatorios", icon: FileBarChart },
];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  rg: "RG",
  cnh: "CNH",
};

export const RESIDENCE_TYPE_LABELS: Record<string, string> = {
  lote: "Quadra/Lote",
  apartamento: "Bloco/Apartamento",
};

export const PHONE_KIND_LABELS: Record<string, string> = {
  fixo: "Telefone Fixo",
  whatsapp: "WhatsApp",
};

export const PERSON_TYPE_LABELS: Record<string, string> = {
  resident: "Morador",
  visitor: "Visitante",
  service_provider: "Prestador",
};

export const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAY_SHORT_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Opções de horário para os selects de início/fim, em intervalos de 30 minutos. */
export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

export const VISITOR_CATEGORY_LABELS: Record<string, string> = {
  visitante: "Visitante",
  prestador_servico: "Prestador de Serviço",
  uber: "Uber",
  delivery: "Delivery",
  funcionario: "Funcionário",
  corretor: "Corretor",
  familiar: "Familiar",
  outro: "Outro",
};

/** Categorias que usam o cadastro de prestador (empresa/serviço/veículo). Demais caem em "visitante". */
export const CATEGORY_TO_PERSON_TYPE: Record<string, "visitor" | "service_provider"> = {
  visitante: "visitor",
  prestador_servico: "service_provider",
  uber: "visitor",
  delivery: "visitor",
  funcionario: "visitor",
  corretor: "visitor",
  familiar: "visitor",
  outro: "visitor",
};

export const VISIT_PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  urgente: "Urgente",
};

export const ACCESS_STATUS_LABELS: Record<string, string> = {
  inside: "Dentro",
  outside: "Fora",
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
};

/** Rótulo do papel de acesso, flexionado conforme o gênero quando disponível. */
export function porterLabel(gender?: string | null): string {
  if (gender === "male") return "Controlador de Acesso";
  if (gender === "female") return "Controladora de Acesso";
  return "Controlador(a) de Acesso";
}

/** Rótulo de qualquer papel do sistema (usa gênero para o papel de controlador). */
export function roleLabel(role: string, gender?: string | null): string {
  const map: Record<string, string> = {
    superadmin: "Superadministrador",
    admin: "Administrador",
    resident: "Morador",
  };
  if (role === "porter") return porterLabel(gender);
  return map[role] ?? role;
}

export const PAGE_SIZE = 10;

// --- Correspondências ---

export const CORRESPONDENCE_TYPE_SUGGESTIONS = [
  "Carta",
  "Envelope",
  "Envelope Registrado",
  "Sedex",
  "PAC",
  "Carta Registrada",
  "Caixa Pequena",
  "Caixa Média",
  "Caixa Grande",
  "Pacote",
  "Encomenda",
  "Documento",
  "Revista",
  "Jornal",
  "Malote",
  "Delivery",
  "Mercado Livre",
  "Shopee",
  "Amazon",
  "Correios",
  "Outro",
];

export const CARRIER_SUGGESTIONS = [
  "Correios",
  "Sedex",
  "PAC",
  "Mercado Livre",
  "Shopee",
  "Amazon",
  "DHL",
  "FedEx",
  "Jadlog",
  "Loggi",
  "Total Express",
  "iFood",
  "Rappi",
];

export const CORRESPONDENCE_STATUS_LABELS: Record<string, string> = {
  recebido: "Recebido",
  em_armazenamento: "Em Armazenamento",
  aguardando_retirada: "Aguardando Retirada",
  entregue: "Entregue",
  recusado: "Recusado",
  devolvido: "Devolvido",
  extraviado: "Extraviado",
  cancelado: "Cancelado",
};

export const CORRESPONDENCE_PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export const CORRESPONDENCE_DOCUMENT_KIND_LABELS: Record<string, string> = {
  rg: "RG",
  cpf: "CPF",
  cnpj: "CNPJ",
};
