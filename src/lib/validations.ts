import { z } from "zod";

const optionalString = z.string().trim().optional().nullable();

export const VISITOR_CATEGORIES = [
  "visitante",
  "prestador_servico",
  "uber",
  "delivery",
  "funcionario",
  "corretor",
  "familiar",
  "outro",
] as const;

const residenceEntrySchema = z.object({
  residence_type: z.enum(["lote", "apartamento"]),
  block: optionalString,
  apartment: optionalString,
  quadra: optionalString,
  lote: optionalString,
});

const familyContactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do familiar."),
  phone: z.string().trim().min(1, "Informe o telefone do familiar."),
});

export const residentSchema = z.object({
  full_name: z.string().trim().min(3, "Nome deve ter ao menos 3 caracteres."),
  cpf: z.string().trim().min(11, "Documento inválido."),
  cpf_type: z.enum(["cpf", "cnpj"]).default("cpf"),
  document_type: z.enum(["rg", "cnh"]),
  document_number: optionalString,
  phone: optionalString,
  phone_type: z.enum(["fixo", "whatsapp"]).default("fixo"),
  phone_secondary: optionalString,
  phone_secondary_type: z.enum(["fixo", "whatsapp"]).default("fixo"),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")).nullable(),
  photo_url: optionalString,
  residences: z.array(residenceEntrySchema).min(1, "Informe ao menos uma residência."),
  family_contacts: z.array(familyContactSchema).default([]),
  status: z.enum(["active", "inactive"]),
  notes: optionalString,
});

export const visitorSchema = z.object({
  full_name: z.string().trim().min(3, "Nome deve ter ao menos 3 caracteres."),
  company_name: optionalString,
  cpf: optionalString,
  cpf_type: z.enum(["cpf", "cnpj"]),
  document_type: z.enum(["rg", "cnh"]),
  document_number: optionalString,
  phone: optionalString,
  photo_url: optionalString,
  resident_id: z.string().uuid().optional().nullable(),
  category: z.enum(VISITOR_CATEGORIES).default("visitante"),
  vehicle_plate: optionalString,
  vehicle_brand: optionalString,
  vehicle_model: optionalString,
  vehicle_color: optionalString,
  document_photo_url: optionalString,
  status: z.enum(["active", "inactive"]),
});

export const serviceProviderSchema = z.object({
  full_name: z.string().trim().min(3, "Nome deve ter ao menos 3 caracteres."),
  company_name: optionalString,
  cpf: optionalString,
  cpf_type: z.enum(["cpf", "cnpj"]),
  document_type: z.enum(["rg", "cnh"]),
  document_number: optionalString,
  phone: optionalString,
  photo_url: optionalString,
  vehicle_plate: optionalString,
  vehicle_brand: optionalString,
  vehicle_model: optionalString,
  vehicle_color: optionalString,
  document_photo_url: optionalString,
  service_type: optionalString,
  resident_id: z.string().uuid().optional().nullable(),
  category: z.enum(VISITOR_CATEGORIES).default("prestador_servico"),
  status: z.enum(["active", "inactive"]),
});

// --- Destino de uma visita (multi-destino) ---
export const destinationSchema = z.object({
  resident_id: z.string().uuid().optional().nullable(),
  location_label: z.string().trim().min(1, "Informe o destino."),
  internal_location: optionalString,
  service_note: optionalString,
  notes: optionalString,
});
export type DestinationInput = z.infer<typeof destinationSchema>;

// --- Registro de entrada (pessoa + visita + destinos) ---
export const entryPersonSchema = z.object({
  person_type: z.enum(["visitor", "service_provider"]),
  existing_person_id: z.string().uuid().optional().nullable(),
  full_name: z.string().trim().min(3, "Nome deve ter ao menos 3 caracteres."),
  cpf: optionalString,
  cpf_type: z.enum(["cpf", "cnpj"]).default("cpf"),
  document_type: z.enum(["rg", "cnh"]).default("rg"),
  document_number: optionalString,
  phone: optionalString,
  photo_url: optionalString,
  company_name: optionalString,
  service_type: optionalString,
  vehicle_plate: optionalString,
  vehicle_brand: optionalString,
  vehicle_model: optionalString,
  vehicle_color: optionalString,
  category: z.enum(VISITOR_CATEGORIES),
});
export type EntryPersonInput = z.infer<typeof entryPersonSchema>;

export const registerEntrySchema = z.object({
  person: entryPersonSchema,
  reason: optionalString,
  service_description: optionalString,
  notes: optionalString,
  expected_exit_at: optionalString,
  priority: z.enum(["normal", "urgente"]).default("normal"),
  destinations: z.array(destinationSchema).min(1, "Adicione ao menos um destino."),
});
export type RegisterEntryInput = z.infer<typeof registerEntrySchema>;

export const registerExitSchema = z.object({
  access_log_id: z.string().uuid(),
  exit_notes: optionalString,
  exit_photos: z.array(z.string()).optional().default([]),
  confirm_all_destinations: z.boolean().default(true),
  completed_destination_ids: z.array(z.string().uuid()).optional().default([]),
});
export type RegisterExitInput = z.infer<typeof registerExitSchema>;

// --- Correspondências ---
export const CORRESPONDENCE_STATUSES = [
  "recebido",
  "em_armazenamento",
  "aguardando_retirada",
  "entregue",
  "recusado",
  "devolvido",
  "extraviado",
  "cancelado",
] as const;
export const CORRESPONDENCE_PRIORITIES = ["baixa", "normal", "alta", "urgente"] as const;
export const CORRESPONDENCE_DOCUMENT_KINDS = ["rg", "cpf", "cnpj"] as const;

export const correspondenceSchema = z.object({
  type: z.string().trim().min(1, "Selecione o tipo."),
  carrier: optionalString,
  sender_company: optionalString,
  deliverer_name: optionalString,
  deliverer_document: optionalString,
  deliverer_document_type: z.enum(CORRESPONDENCE_DOCUMENT_KINDS).default("cpf"),
  deliverer_phone: optionalString,
  tracking_code: optionalString,
  received_at: z.string().min(1, "Informe a data/hora de recebimento."),
  resident_id: z.string().uuid().optional().nullable(),
  recipient_name: optionalString,
  recipient_residence_type: z.enum(["lote", "apartamento"]).default("apartamento"),
  recipient_block: optionalString,
  recipient_apartment: optionalString,
  recipient_quadra: optionalString,
  recipient_lote: optionalString,
  recipient_tower: optionalString,
  recipient_unit: optionalString,
  recipient_document: optionalString,
  recipient_document_type: z.enum(CORRESPONDENCE_DOCUMENT_KINDS).default("cpf"),
  recipient_phone: optionalString,
  recipient_whatsapp: optionalString,
  recipient_email: optionalString,
  status: z.enum(CORRESPONDENCE_STATUSES).default("recebido"),
  priority: z.enum(CORRESPONDENCE_PRIORITIES).default("normal"),
  location_note: optionalString,
  notes: optionalString,
  entry_photos: z.array(z.string()).optional().default([]),
  entry_signature_url: optionalString,
});
export type CorrespondenceInput = z.infer<typeof correspondenceSchema>;

export const deliverCorrespondenceSchema = z.object({
  correspondence_id: z.string().uuid(),
  delivered_to_name: z.string().trim().min(2, "Informe o nome de quem retirou."),
  delivered_to_document: optionalString,
  delivered_to_document_type: z.enum(CORRESPONDENCE_DOCUMENT_KINDS).default("cpf"),
  delivered_to_phone: optionalString,
  delivered_notes: optionalString,
  delivery_signature_url: optionalString,
});
export type DeliverCorrespondenceInput = z.infer<typeof deliverCorrespondenceSchema>;

export const companySchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter ao menos 3 caracteres."),
  cnpj: optionalString,
  address: optionalString,
  city: optionalString,
  state: optionalString,
  zip: optionalString,
  phone: optionalString,
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")).nullable(),
  logo_url: optionalString,
  status: z.enum(["active", "inactive"]),
});

export const createCompanySchema = companySchema.extend({
  porter_name: z.string().trim().min(3, "Nome do porteiro obrigatório."),
  porter_email: z.string().trim().email("E-mail do porteiro inválido."),
  porter_password: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
});

export type ResidentInput = z.infer<typeof residentSchema>;
export type VisitorInput = z.infer<typeof visitorSchema>;
export type ServiceProviderInput = z.infer<typeof serviceProviderSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

// --- Acessos recorrentes ---
export const weekdayScheduleEntrySchema = z.object({
  day: z.number().min(0).max(6),
  enabled: z.boolean(),
  start_time: z.string(),
  end_time: z.string(),
});
export type WeekdayScheduleEntryInput = z.infer<typeof weekdayScheduleEntrySchema>;

export const recurringAuthSchema = z.object({
  person_type: z.enum(["resident", "visitor", "service_provider"]),
  person_id: z.string().uuid("Selecione uma pessoa cadastrada."),
  person_name: z.string().trim().min(1),
  person_document: optionalString,
  category_label: optionalString,
  destination_resident_id: z.string().uuid().optional().nullable(),
  destination_label: optionalString,
  start_date: z.string().min(1, "Informe a data de início."),
  end_date: optionalString,
  recurrence_note: optionalString,
  weekday_schedule: z.array(weekdayScheduleEntrySchema).default([]),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: optionalString,
});
export type RecurringAuthInput = z.infer<typeof recurringAuthSchema>;
