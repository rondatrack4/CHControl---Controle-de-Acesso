-- Tabela de unidades (quadra/lote) centralizadas
CREATE TABLE IF NOT EXISTS units (
  id                TEXT PRIMARY KEY,
  company_id        TEXT NOT NULL,
  unit_type         TEXT NOT NULL CHECK (unit_type IN ('apartamento', 'lote')),
  block             TEXT,
  apartment         TEXT,
  quadra            TEXT,
  lote              TEXT,
  owner_name        TEXT,
  owner_phone       TEXT,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE (company_id, unit_type, block, apartment, quadra, lote),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX idx_units_company ON units(company_id);
CREATE INDEX idx_units_type ON units(unit_type);
