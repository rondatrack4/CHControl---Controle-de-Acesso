-- ==========================================================================
-- CHControl Desktop — schema SQLite (espelha o schema Postgres/Supabase para
-- uso 100% offline). Cada instalação representa UM único condomínio, então
-- não há RLS aqui: o controle de acesso é feito na camada de aplicação
-- (Server Actions), e a tabela `companies` sempre terá exatamente uma linha.
--
-- Convenções da tradução Postgres -> SQLite:
--   - enums                 -> TEXT + CHECK (col IN (...))
--   - jsonb                 -> TEXT (JSON.stringify/JSON.parse feito pelo shim)
--   - uuid                  -> TEXT (gerado via crypto.randomUUID() no app)
--   - timestamptz / date    -> TEXT (ISO 8601, gerado pelo app)
--   - text[]                -> TEXT (JSON array serializado)
--   - RLS / policies        -> nenhuma (single-tenant, sem necessidade)
--   - triggers de updated_at -> nenhum; o shim seta updated_at em todo update
-- ==========================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- companies (linha única — o condomínio desta instalação)
-- ----------------------------------------------------------------------------
CREATE TABLE companies (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  cnpj       TEXT,
  address    TEXT,
  city       TEXT,
  state      TEXT,
  zip        TEXT,
  phone      TEXT,
  email      TEXT,
  logo_url   TEXT,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- profiles (porteiros/admins) — ganha password_hash (não existe na nuvem,
-- onde a senha vive no Supabase Auth).
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
  id            TEXT PRIMARY KEY,
  company_id    TEXT REFERENCES companies(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'porter' CHECK (role IN ('superadmin', 'admin', 'porter', 'resident')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  resident_id   TEXT REFERENCES residents(id) ON DELETE CASCADE,
  photo_url     TEXT,
  gender        TEXT CHECK (gender IN ('male', 'female')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX profiles_company_id_idx ON profiles(company_id);
CREATE INDEX profiles_resident_id_idx ON profiles(resident_id);
CREATE UNIQUE INDEX profiles_email_idx ON profiles(email);

-- ----------------------------------------------------------------------------
-- sessions (substitui o Supabase Auth — cookie httpOnly guarda o token)
-- ----------------------------------------------------------------------------
CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_profile_id_idx ON sessions(profile_id);

-- ----------------------------------------------------------------------------
-- residents (moradores)
-- ----------------------------------------------------------------------------
CREATE TABLE residents (
  id                    TEXT PRIMARY KEY,
  company_id            TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  cpf                   TEXT NOT NULL,
  cpf_type              TEXT NOT NULL DEFAULT 'cpf' CHECK (cpf_type IN ('cpf', 'cnpj')),
  document_type         TEXT NOT NULL DEFAULT 'rg' CHECK (document_type IN ('rg', 'cnh')),
  document_number       TEXT,
  phone                 TEXT,
  phone_type            TEXT NOT NULL DEFAULT 'fixo' CHECK (phone_type IN ('fixo', 'whatsapp')),
  phone_secondary        TEXT,
  phone_secondary_type   TEXT NOT NULL DEFAULT 'fixo' CHECK (phone_secondary_type IN ('fixo', 'whatsapp')),
  email                 TEXT,
  photo_url             TEXT,
  residence_type        TEXT NOT NULL DEFAULT 'apartamento' CHECK (residence_type IN ('lote', 'apartamento')),
  block                 TEXT,
  apartment             TEXT,
  quadra                TEXT,
  lote                  TEXT,
  residences            TEXT NOT NULL DEFAULT '[]',       -- JSON: ResidenceEntry[]
  family_contacts       TEXT NOT NULL DEFAULT '[]',       -- JSON: FamilyContact[]
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes                 TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (company_id, cpf)
);
CREATE INDEX residents_company_id_idx ON residents(company_id);

-- ----------------------------------------------------------------------------
-- visitors
-- ----------------------------------------------------------------------------
CREATE TABLE visitors (
  id                  TEXT PRIMARY KEY,
  company_id          TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  company_name        TEXT,
  cpf                 TEXT,
  cpf_type            TEXT NOT NULL DEFAULT 'cpf' CHECK (cpf_type IN ('cpf', 'cnpj')),
  document_type       TEXT NOT NULL DEFAULT 'rg' CHECK (document_type IN ('rg', 'cnh')),
  document_number     TEXT,
  document_photo_url  TEXT,
  phone               TEXT,
  photo_url           TEXT,
  resident_id         TEXT REFERENCES residents(id) ON DELETE SET NULL,
  category            TEXT NOT NULL DEFAULT 'visitante' CHECK (category IN
                        ('visitante', 'prestador_servico', 'uber', 'delivery', 'funcionario', 'corretor', 'familiar', 'outro')),
  vehicle_plate       TEXT,
  vehicle_brand       TEXT,
  vehicle_model       TEXT,
  vehicle_color       TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX visitors_company_id_idx ON visitors(company_id);
CREATE INDEX visitors_resident_id_idx ON visitors(resident_id);

-- ----------------------------------------------------------------------------
-- service_providers
-- ----------------------------------------------------------------------------
CREATE TABLE service_providers (
  id                  TEXT PRIMARY KEY,
  company_id          TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  company_name        TEXT,
  cpf                 TEXT,
  cpf_type            TEXT NOT NULL DEFAULT 'cpf' CHECK (cpf_type IN ('cpf', 'cnpj')),
  document_type       TEXT NOT NULL DEFAULT 'rg' CHECK (document_type IN ('rg', 'cnh')),
  document_number     TEXT,
  document_photo_url  TEXT,
  phone               TEXT,
  photo_url           TEXT,
  vehicle_plate       TEXT,
  vehicle_brand       TEXT,
  vehicle_model       TEXT,
  vehicle_color       TEXT,
  service_type        TEXT,
  category            TEXT NOT NULL DEFAULT 'prestador_servico' CHECK (category IN
                        ('visitante', 'prestador_servico', 'uber', 'delivery', 'funcionario', 'corretor', 'familiar', 'outro')),
  resident_id         TEXT REFERENCES residents(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX service_providers_company_id_idx ON service_providers(company_id);
CREATE INDEX service_providers_resident_id_idx ON service_providers(resident_id);

-- ----------------------------------------------------------------------------
-- access_logs (entrada/saída, com snapshot completo da pessoa no momento
-- da entrada — ver migration 0015 do Postgres para o motivo)
-- ----------------------------------------------------------------------------
CREATE TABLE access_logs (
  id                     TEXT PRIMARY KEY,
  company_id             TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  person_type            TEXT NOT NULL CHECK (person_type IN ('resident', 'visitor', 'service_provider')),
  person_id              TEXT NOT NULL,
  person_name            TEXT NOT NULL,
  person_cpf             TEXT,
  person_category        TEXT,
  person_document_type   TEXT CHECK (person_document_type IN ('rg', 'cnh')),
  person_document_number TEXT,
  person_phone           TEXT,
  person_company_name    TEXT,
  person_service_type    TEXT,
  vehicle_plate          TEXT,
  vehicle_brand          TEXT,
  vehicle_model          TEXT,
  vehicle_color          TEXT,
  resident_responsible   TEXT,
  residence_label        TEXT,
  entry_at               TEXT NOT NULL,
  exit_at                TEXT,
  entry_porter_id        TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  exit_porter_id         TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  entry_porter_name      TEXT,
  exit_porter_name       TEXT,
  status                 TEXT NOT NULL DEFAULT 'inside' CHECK (status IN ('inside', 'outside')),
  notes                  TEXT,
  reason                 TEXT,
  service_description    TEXT,
  expected_exit_at       TEXT,
  priority               TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgente')),
  exit_notes             TEXT,
  exit_photos            TEXT NOT NULL DEFAULT '[]',  -- JSON array de URLs
  created_at             TEXT NOT NULL
);
CREATE INDEX access_logs_company_id_idx ON access_logs(company_id);
CREATE INDEX access_logs_status_idx ON access_logs(company_id, status);
CREATE INDEX access_logs_entry_at_idx ON access_logs(company_id, entry_at);
CREATE INDEX access_logs_person_idx ON access_logs(company_id, person_type, person_id);
-- Regra de negócio: não permitir duas entradas EM ABERTO para a mesma pessoa
-- (índice único parcial, suportado pelo SQLite).
CREATE UNIQUE INDEX access_logs_open_unique ON access_logs(company_id, person_type, person_id)
  WHERE status = 'inside';

-- ----------------------------------------------------------------------------
-- access_log_destinations
-- ----------------------------------------------------------------------------
CREATE TABLE access_log_destinations (
  id                TEXT PRIMARY KEY,
  access_log_id     TEXT NOT NULL REFERENCES access_logs(id) ON DELETE CASCADE,
  company_id        TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  resident_id       TEXT REFERENCES residents(id) ON DELETE SET NULL,
  location_label    TEXT NOT NULL,
  internal_location TEXT,
  service_note      TEXT,
  notes             TEXT,
  sequence          INTEGER NOT NULL DEFAULT 0,
  arrived_at        TEXT,
  completed_at      TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX access_log_destinations_access_log_idx ON access_log_destinations(access_log_id);
CREATE INDEX access_log_destinations_company_id_idx ON access_log_destinations(company_id);
CREATE INDEX access_log_destinations_resident_id_idx ON access_log_destinations(resident_id);

-- ----------------------------------------------------------------------------
-- audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id         TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  user_name  TEXT,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  details    TEXT NOT NULL DEFAULT '{}',  -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX audit_logs_company_id_idx ON audit_logs(company_id, created_at);
CREATE INDEX audit_logs_action_idx ON audit_logs(company_id, action);

-- ----------------------------------------------------------------------------
-- notifications (existe localmente por paridade de schema — o Portal do
-- Morador é cloud-only, então nada aqui dispara notificação real hoje;
-- fica pronto caso um dia o app desktop precise gerar alertas locais)
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
  id                 TEXT PRIMARY KEY,
  company_id         TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  resident_id        TEXT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  type               TEXT NOT NULL,
  title              TEXT NOT NULL,
  body               TEXT,
  access_log_id      TEXT REFERENCES access_logs(id) ON DELETE SET NULL,
  correspondence_id  TEXT REFERENCES correspondences(id) ON DELETE SET NULL,
  read_at            TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX notifications_company_id_idx ON notifications(company_id);
CREATE INDEX notifications_resident_id_idx ON notifications(resident_id, created_at);

-- ----------------------------------------------------------------------------
-- correspondences (Livro de Correspondências)
-- registration_number é calculado pela aplicação (não é coluna gerada como
-- no Postgres, que usa bigserial + generated always as).
-- ----------------------------------------------------------------------------
CREATE TABLE correspondences (
  id                          TEXT PRIMARY KEY,
  company_id                  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  seq_number                  INTEGER NOT NULL,
  registration_number         TEXT NOT NULL,
  type                        TEXT NOT NULL DEFAULT 'pacote',
  carrier                     TEXT,
  sender_company              TEXT,
  deliverer_name              TEXT,
  deliverer_document          TEXT,
  deliverer_document_type     TEXT NOT NULL DEFAULT 'cpf' CHECK (deliverer_document_type IN ('rg', 'cpf', 'cnpj')),
  deliverer_phone             TEXT,
  tracking_code               TEXT,
  received_at                 TEXT NOT NULL,
  resident_id                 TEXT REFERENCES residents(id) ON DELETE SET NULL,
  recipient_name              TEXT,
  recipient_residence_type    TEXT NOT NULL DEFAULT 'apartamento' CHECK (recipient_residence_type IN ('lote', 'apartamento')),
  recipient_block             TEXT,
  recipient_apartment         TEXT,
  recipient_quadra            TEXT,
  recipient_lote              TEXT,
  recipient_tower             TEXT,
  recipient_unit              TEXT,
  recipient_document          TEXT,
  recipient_document_type     TEXT NOT NULL DEFAULT 'cpf' CHECK (recipient_document_type IN ('rg', 'cpf', 'cnpj')),
  recipient_phone              TEXT,
  recipient_whatsapp           TEXT,
  recipient_email              TEXT,
  status                      TEXT NOT NULL DEFAULT 'recebido' CHECK (status IN
                                ('recebido', 'em_armazenamento', 'aguardando_retirada', 'entregue', 'recusado', 'devolvido', 'extraviado', 'cancelado')),
  priority                    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  location_note               TEXT,
  notes                       TEXT,
  entry_photos                TEXT NOT NULL DEFAULT '[]',
  entry_signature_url         TEXT,
  entry_porter_id             TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  entry_porter_name            TEXT,
  delivered_at                 TEXT,
  delivered_to_name            TEXT,
  delivered_to_document        TEXT,
  delivered_to_document_type   TEXT NOT NULL DEFAULT 'cpf' CHECK (delivered_to_document_type IN ('rg', 'cpf', 'cnpj')),
  delivered_to_phone           TEXT,
  delivered_notes              TEXT,
  delivery_signature_url       TEXT,
  delivery_porter_id            TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  delivery_porter_name          TEXT,
  created_at                    TEXT NOT NULL,
  updated_at                    TEXT NOT NULL,
  UNIQUE (company_id, registration_number)
);
CREATE INDEX correspondences_company_status_idx ON correspondences(company_id, status);
CREATE INDEX correspondences_resident_idx ON correspondences(resident_id);
CREATE INDEX correspondences_received_at_idx ON correspondences(company_id, received_at);

-- ----------------------------------------------------------------------------
-- recurring_authorizations (acessos recorrentes)
-- ----------------------------------------------------------------------------
CREATE TABLE recurring_authorizations (
  id                      TEXT PRIMARY KEY,
  company_id              TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  person_type             TEXT NOT NULL CHECK (person_type IN ('resident', 'visitor', 'service_provider')),
  person_id               TEXT NOT NULL,
  person_name             TEXT NOT NULL,
  person_document         TEXT,
  category_label          TEXT,
  destination_resident_id TEXT REFERENCES residents(id) ON DELETE SET NULL,
  destination_label       TEXT,
  start_date              TEXT NOT NULL,
  end_date                TEXT,
  recurrence_note         TEXT,
  weekday_schedule        TEXT NOT NULL DEFAULT '[]',  -- JSON: WeekdayScheduleEntry[]
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes                   TEXT,
  created_by              TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);
CREATE INDEX recurring_auth_company_idx ON recurring_authorizations(company_id);
CREATE INDEX recurring_auth_person_idx ON recurring_authorizations(person_type, person_id);
CREATE INDEX recurring_auth_end_date_idx ON recurring_authorizations(end_date);

-- ==========================================================================
-- Tabelas exclusivas do app desktop (não existem na nuvem)
-- ==========================================================================

-- Credenciais pendentes: staging entre `admin.auth.admin.createUser()` e o
-- INSERT em `profiles` que a app faz logo em seguida (mesma sequência de
-- duas chamadas do Supabase Admin API real) — o shim consome esta linha
-- automaticamente ao inserir o profile com o mesmo id.
CREATE TABLE pending_credentials (
  profile_id    TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Configuração da instalação (linha única, id sempre = 1)
CREATE TABLE install_config (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  company_id          TEXT NOT NULL,
  supabase_url        TEXT NOT NULL,
  supabase_anon_key   TEXT NOT NULL,
  sync_key            TEXT,             -- chave/role restrita usada só pelo sync worker
  configured_at       TEXT NOT NULL
);

-- Fila de sincronização (outbox transacional)
CREATE TABLE outbox (
  id            TEXT PRIMARY KEY,
  table_name    TEXT NOT NULL,
  record_id     TEXT NOT NULL,
  operation     TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  payload       TEXT NOT NULL,          -- JSON: snapshot pós-escrita
  media_paths   TEXT,                   -- JSON array de caminhos locais de mídia referenciados
  created_at    TEXT NOT NULL,
  synced_at     TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT
);
CREATE INDEX outbox_pending_idx ON outbox(synced_at) WHERE synced_at IS NULL;

-- Mapeamento de mídia local -> URL final no Supabase Storage, após sync
CREATE TABLE media_uploads (
  local_path  TEXT PRIMARY KEY,
  remote_url  TEXT,
  uploaded_at TEXT
);

-- Metadados do motor de sincronização (checkpoints de pull, etc.)
CREATE TABLE sync_meta (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT
);

CREATE TABLE schema_version (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
INSERT INTO schema_version (version, applied_at) VALUES (1, datetime('now'));
