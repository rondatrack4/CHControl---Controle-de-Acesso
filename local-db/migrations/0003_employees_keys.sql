-- ============================================================================
-- 0003 — Funcionários do condomínio + Controle de Chaves
-- Espelha o Postgres. Aplicado de forma idempotente por ensureSchema() no
-- local-client (CREATE TABLE IF NOT EXISTS a cada boot), então também vale
-- para bancos já existentes.
-- ============================================================================

-- Funcionários do condomínio (zeladoria, limpeza, manutenção, etc.)
CREATE TABLE IF NOT EXISTS employees (
  id                    TEXT PRIMARY KEY,
  company_id            TEXT NOT NULL,
  full_name             TEXT NOT NULL,
  company_name          TEXT,                       -- empresa/terceirizada
  role_title            TEXT,                        -- cargo/função
  marital_status        TEXT,                        -- estado civil
  cpf                   TEXT,
  cpf_type              TEXT NOT NULL DEFAULT 'cpf' CHECK (cpf_type IN ('cpf','cnpj')),
  document_type         TEXT NOT NULL DEFAULT 'rg' CHECK (document_type IN ('rg','cnh')),
  document_number       TEXT,
  document_photo_url    TEXT,
  document_criminal_url TEXT,                        -- antecedentes criminais
  document_address_url  TEXT,                        -- comprovante de endereço
  photo_url             TEXT,
  -- contato
  phone                 TEXT,                        -- telefone fixo
  mobile                TEXT,                        -- celular
  whatsapp              TEXT,
  email                 TEXT,
  -- endereço
  cep                   TEXT,
  street                TEXT,
  number                TEXT,
  complement            TEXT,
  neighborhood          TEXT,
  city                  TEXT,
  -- veículo
  vehicle_type          TEXT,
  vehicle_plate         TEXT,
  vehicle_brand         TEXT,
  vehicle_model         TEXT,
  vehicle_color         TEXT,
  notes                 TEXT,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
CREATE INDEX IF NOT EXISTS employees_company_id_idx ON employees(company_id);

-- Chaves controladas na portaria
CREATE TABLE IF NOT EXISTS keys (
  id             TEXT PRIMARY KEY,
  company_id     TEXT NOT NULL,
  code           TEXT NOT NULL,                       -- código da chave
  name           TEXT NOT NULL,                       -- nome da chave
  location       TEXT,                                -- local (onde a fechadura fica)
  unit           TEXT,                                -- unidade vinculada
  description    TEXT,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','lent','inactive')),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
CREATE INDEX IF NOT EXISTS keys_company_id_idx ON keys(company_id);

-- Empréstimos de chave (também é o histórico completo)
CREATE TABLE IF NOT EXISTS key_loans (
  id                 TEXT PRIMARY KEY,
  company_id         TEXT NOT NULL,
  key_id             TEXT NOT NULL,
  key_code           TEXT,                            -- snapshot p/ histórico
  key_name           TEXT,
  employee_id        TEXT,
  employee_name      TEXT NOT NULL,                   -- snapshot
  -- controlador de acesso que ENTREGOU
  lent_by_id         TEXT,
  lent_by_name       TEXT,
  -- controlador de acesso que RECEBEU na devolução
  returned_by_id     TEXT,
  returned_by_name   TEXT,
  lent_at            TEXT NOT NULL,                   -- data/hora da retirada
  expected_return_at TEXT,                            -- previsão de devolução
  returned_at        TEXT,                            -- data/hora da devolução
  lend_notes         TEXT,                            -- observações da retirada
  return_notes       TEXT,                            -- observações da devolução
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','returned')),
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (key_id) REFERENCES keys(id)
);
CREATE INDEX IF NOT EXISTS key_loans_company_id_idx ON key_loans(company_id);
CREATE INDEX IF NOT EXISTS key_loans_key_id_idx ON key_loans(key_id);
CREATE INDEX IF NOT EXISTS key_loans_status_idx ON key_loans(status);
