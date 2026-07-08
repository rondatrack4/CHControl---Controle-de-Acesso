-- ==========================================================================
-- CHControl - Redesenho do fluxo de entrada de acesso
-- Categorias de visitante, metadados ricos por visita, múltiplos destinos
-- por entrada (access_log_destinations).
-- ==========================================================================

-- ----------------------------------------------------------------------------
-- Novos tipos enumerados
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'visitor_category') then
    create type public.visitor_category as enum (
      'visitante', 'prestador_servico', 'uber', 'delivery',
      'funcionario', 'corretor', 'familiar', 'outro'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'visit_priority') then
    create type public.visit_priority as enum ('normal', 'urgente');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- visitors: categoria + campos de veículo (hoje só service_providers tem)
-- ----------------------------------------------------------------------------
alter table public.visitors
  add column if not exists category public.visitor_category not null default 'visitante',
  add column if not exists vehicle_plate text,
  add column if not exists vehicle_brand text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_color text;

-- service_providers ganha a mesma coluna de categoria por consistência de busca
-- cross-table (ver searchKnownPersons); seu default reflete o cadastro atual.
alter table public.service_providers
  add column if not exists category public.visitor_category not null default 'prestador_servico';

-- ----------------------------------------------------------------------------
-- access_logs: metadados ricos por visita (nível-visita, não por destino)
-- ----------------------------------------------------------------------------
alter table public.access_logs
  add column if not exists reason               text,
  add column if not exists service_description  text,
  add column if not exists expected_exit_at      timestamptz,
  add column if not exists priority              public.visit_priority not null default 'normal',
  add column if not exists exit_notes            text,
  add column if not exists exit_photos           text[] not null default '{}',
  add column if not exists person_category       text;

-- ----------------------------------------------------------------------------
-- access_log_destinations: N destinos por 1 access_log
-- ----------------------------------------------------------------------------
create table public.access_log_destinations (
  id                 uuid primary key default gen_random_uuid(),
  access_log_id      uuid not null references public.access_logs(id) on delete cascade,
  company_id         uuid not null references public.companies(id) on delete cascade,
  resident_id        uuid references public.residents(id) on delete set null,
  location_label     text not null,
  internal_location  text,
  service_note       text,
  notes              text,
  sequence           int not null default 0,
  arrived_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now()
);
create index access_log_destinations_access_log_idx on public.access_log_destinations(access_log_id);
create index access_log_destinations_company_id_idx on public.access_log_destinations(company_id);
create index access_log_destinations_resident_id_idx on public.access_log_destinations(resident_id);

alter table public.access_log_destinations enable row level security;

create policy access_log_destinations_company_all on public.access_log_destinations
  for all
  using (company_id = public.current_company_id() or public.is_superadmin())
  with check (company_id = public.current_company_id() or public.is_superadmin());
