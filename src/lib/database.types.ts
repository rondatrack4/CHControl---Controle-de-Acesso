// Tipos do banco CHControl.
// Mantidos em sincronia com supabase/migrations/0001_init.sql.
// (Podem ser regenerados com: supabase gen types typescript --local)

export type CompanyStatus = "active" | "inactive";
export type UserRole = "superadmin" | "admin" | "porter" | "resident";
export type UserStatus = "active" | "inactive";
export type DocumentType = "rg" | "cnh";
export type ResidenceType = "lote" | "apartamento";
export type RecordStatus = "active" | "inactive";
export type CpfCnpjKind = "cpf" | "cnpj";
export type PhoneKind = "fixo" | "whatsapp";
export type Gender = "male" | "female";

export interface ResidenceEntry {
  residence_type: ResidenceType;
  block: string | null;
  apartment: string | null;
  quadra: string | null;
  lote: string | null;
}

export interface FamilyContact {
  name: string;
  phone: string;
}
export type PersonType = "resident" | "visitor" | "service_provider";
export type AccessStatus = "inside" | "outside";
export type VisitorCategory =
  | "visitante"
  | "prestador_servico"
  | "uber"
  | "delivery"
  | "funcionario"
  | "corretor"
  | "familiar"
  | "outro";
export type VisitPriority = "normal" | "urgente";
export type CorrespondenceStatus =
  | "recebido"
  | "em_armazenamento"
  | "aguardando_retirada"
  | "entregue"
  | "recusado"
  | "devolvido"
  | "extraviado"
  | "cancelado";
export type CorrespondencePriority = "baixa" | "normal" | "alta" | "urgente";
export type CorrespondenceDocumentKind = "rg" | "cpf" | "cnpj";

export interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: CompanyStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  resident_id: string | null;
  photo_url: string | null;
  gender: Gender | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  company_id: string;
  unit_type: ResidenceType;
  block: string | null;
  apartment: string | null;
  quadra: string | null;
  lote: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface Resident {
  id: string;
  company_id: string;
  full_name: string;
  cpf: string;
  cpf_type: CpfCnpjKind;
  document_type: DocumentType;
  document_number: string | null;
  phone: string | null;
  phone_type: PhoneKind;
  phone_secondary: string | null;
  phone_secondary_type: PhoneKind;
  email: string | null;
  photo_url: string | null;
  residence_type: ResidenceType;
  block: string | null;
  apartment: string | null;
  quadra: string | null;
  lote: string | null;
  residences: ResidenceEntry[];
  family_contacts: FamilyContact[];
  status: RecordStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Visitor {
  id: string;
  company_id: string;
  full_name: string;
  company_name: string | null;
  cpf: string | null;
  cpf_type: CpfCnpjKind;
  document_type: DocumentType;
  document_number: string | null;
  phone: string | null;
  photo_url: string | null;
  resident_id: string | null;
  category: VisitorCategory;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  document_photo_url: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceProvider {
  id: string;
  company_id: string;
  full_name: string;
  company_name: string | null;
  cpf: string | null;
  cpf_type: CpfCnpjKind;
  document_type: DocumentType;
  document_number: string | null;
  phone: string | null;
  photo_url: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  document_photo_url: string | null;
  service_type: string | null;
  resident_id: string | null;
  category: VisitorCategory;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface AccessLog {
  id: string;
  company_id: string;
  person_type: PersonType;
  person_id: string;
  person_name: string;
  person_cpf: string | null;
  resident_responsible: string | null;
  residence_label: string | null;
  entry_at: string;
  exit_at: string | null;
  entry_porter_id: string | null;
  exit_porter_id: string | null;
  entry_porter_name: string | null;
  exit_porter_name: string | null;
  status: AccessStatus;
  notes: string | null;
  reason: string | null;
  service_description: string | null;
  expected_exit_at: string | null;
  priority: VisitPriority;
  exit_notes: string | null;
  exit_photos: string[];
  person_category: string | null;
  person_document_type: DocumentType | null;
  person_document_number: string | null;
  person_phone: string | null;
  person_company_name: string | null;
  person_service_type: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  created_at: string;
}

export interface AccessLogDestination {
  id: string;
  access_log_id: string;
  company_id: string;
  resident_id: string | null;
  location_label: string;
  internal_location: string | null;
  service_note: string | null;
  notes: string | null;
  sequence: number;
  arrived_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  company_id: string;
  resident_id: string;
  type: string;
  title: string;
  body: string | null;
  access_log_id: string | null;
  correspondence_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Correspondence {
  id: string;
  company_id: string;
  seq_number: number;
  registration_number: string;
  type: string;
  carrier: string | null;
  sender_company: string | null;
  deliverer_name: string | null;
  deliverer_document: string | null;
  deliverer_document_type: CorrespondenceDocumentKind;
  deliverer_phone: string | null;
  tracking_code: string | null;
  received_at: string;
  resident_id: string | null;
  recipient_name: string | null;
  recipient_residence_type: ResidenceType;
  recipient_block: string | null;
  recipient_apartment: string | null;
  recipient_quadra: string | null;
  recipient_lote: string | null;
  recipient_tower: string | null;
  recipient_unit: string | null;
  recipient_document: string | null;
  recipient_document_type: CorrespondenceDocumentKind;
  recipient_phone: string | null;
  recipient_whatsapp: string | null;
  recipient_email: string | null;
  status: CorrespondenceStatus;
  priority: CorrespondencePriority;
  location_note: string | null;
  notes: string | null;
  entry_photos: string[];
  entry_signature_url: string | null;
  entry_porter_id: string | null;
  entry_porter_name: string | null;
  delivered_at: string | null;
  delivered_to_name: string | null;
  delivered_to_document: string | null;
  delivered_to_document_type: CorrespondenceDocumentKind;
  delivered_to_phone: string | null;
  delivered_notes: string | null;
  delivery_signature_url: string | null;
  delivery_porter_id: string | null;
  delivery_porter_name: string | null;
  created_at: string;
  updated_at: string;
}

export type RecurringAuthStatus = "active" | "inactive";

export interface WeekdayScheduleEntry {
  day: number; // 0 = domingo ... 6 = sábado
  enabled: boolean;
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
}

export interface RecurringAuthorization {
  id: string;
  company_id: string;
  person_type: PersonType;
  person_id: string;
  person_name: string;
  person_document: string | null;
  category_label: string | null;
  destination_resident_id: string | null;
  destination_label: string | null;
  start_date: string;
  end_date: string | null;
  recurrence_note: string | null;
  weekday_schedule: WeekdayScheduleEntry[];
  status: RecurringAuthStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Helper genérico para linhas/insert/update por tabela.
type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      companies: { Row: Row<Company>; Insert: Insert<Company>; Update: Update<Company>; Relationships: [] };
      profiles: { Row: Row<Profile>; Insert: Insert<Profile>; Update: Update<Profile>; Relationships: [] };
      residents: { Row: Row<Resident>; Insert: Insert<Resident>; Update: Update<Resident>; Relationships: [] };
      visitors: { Row: Row<Visitor>; Insert: Insert<Visitor>; Update: Update<Visitor>; Relationships: [] };
      service_providers: { Row: Row<ServiceProvider>; Insert: Insert<ServiceProvider>; Update: Update<ServiceProvider>; Relationships: [] };
      access_logs: { Row: Row<AccessLog>; Insert: Insert<AccessLog>; Update: Update<AccessLog>; Relationships: [] };
      access_log_destinations: { Row: Row<AccessLogDestination>; Insert: Insert<AccessLogDestination>; Update: Update<AccessLogDestination>; Relationships: [] };
      notifications: { Row: Row<Notification>; Insert: Insert<Notification>; Update: Update<Notification>; Relationships: [] };
      audit_logs: { Row: Row<AuditLog>; Insert: Insert<AuditLog>; Update: Update<AuditLog>; Relationships: [] };
      correspondences: { Row: Row<Correspondence>; Insert: Insert<Correspondence>; Update: Update<Correspondence>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      current_company_id: { Args: Record<string, never>; Returns: string };
      current_role_name: { Args: Record<string, never>; Returns: UserRole };
      is_superadmin: { Args: Record<string, never>; Returns: boolean };
      is_resident: { Args: Record<string, never>; Returns: boolean };
      current_resident_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      company_status: CompanyStatus;
      user_role: UserRole;
      user_status: UserStatus;
      document_type: DocumentType;
      residence_type: ResidenceType;
      record_status: RecordStatus;
      person_type: PersonType;
      access_status: AccessStatus;
      cpf_cnpj_kind: CpfCnpjKind;
      phone_kind: PhoneKind;
      visitor_category: VisitorCategory;
      visit_priority: VisitPriority;
      correspondence_status: CorrespondenceStatus;
      correspondence_priority: CorrespondencePriority;
      correspondence_document_kind: CorrespondenceDocumentKind;
    };
    CompositeTypes: Record<string, never>;
  };
}
