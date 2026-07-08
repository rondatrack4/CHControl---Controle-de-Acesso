-- ==========================================================================
-- CHControl - Schema inicial
-- SaaS multi-tenant de controle de acesso para condomínios.
--
-- Isolamento de dados: toda tabela de negócio possui `company_id` e é
-- protegida por Row Level Security (RLS). Um porteiro só enxerga as linhas
-- da própria empresa. O superadmin (gestor da plataforma) enxerga tudo.
-- ==========================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "unaccent" with schema extensions;

-- ----------------------------------------------------------------------------
-- Tipos enumerados
-- ----------------------------------------------------------------------------
create type public.company_status   as enum ('active', 'inactive');
create type public.user_role        as enum ('superadmin', 'admin', 'porter');
create type public.user_status      as enum ('active', 'inactive');
create type public.document_type    as enum ('rg', 'cnh');
create type public.residence_type   as enum ('lote', 'apartamento');
create type public.record_status    as enum ('active', 'inactive');
create type public.person_type      as enum ('resident', 'visitor', 'service_provider');
create type public.access_status    as enum ('inside', 'outside');

-- ----------------------------------------------------------------------------
-- Empresas (condomínios) — a raiz do tenant
-- ----------------------------------------------------------------------------
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  cnpj        text,
  address     text,
  city        text,
  state       text,
  zip         text,
  phone       text,
  email       text,
  logo_url    text,
  status      public.company_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Perfis de usuário (porteiros / administradores) — 1:1 com auth.users
-- ----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  role        public.user_role not null default 'porter',
  status      public.user_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_company_id_idx on public.profiles(company_id);

-- ----------------------------------------------------------------------------
-- Moradores
-- ----------------------------------------------------------------------------
create table public.residents (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  full_name       text not null,
  cpf             text not null,
  document_type   public.document_type not null default 'rg',
  document_number text,
  phone           text,
  email           text,
  photo_url       text,
  residence_type  public.residence_type not null default 'apartamento',
  block           text,   -- Bloco
  apartment       text,   -- Apartamento
  quadra          text,   -- Quadra
  lote            text,   -- Lote
  status          public.record_status not null default 'active',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (company_id, cpf)
);
create index residents_company_id_idx on public.residents(company_id);
create index residents_name_idx on public.residents using gin (to_tsvector('simple', coalesce(full_name, '')));

-- ----------------------------------------------------------------------------
-- Visitantes (vinculados a um morador responsável)
-- ----------------------------------------------------------------------------
create table public.visitors (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  full_name       text not null,
  cpf             text,
  document_type   public.document_type not null default 'rg',
  document_number text,
  phone           text,
  photo_url       text,
  resident_id     uuid references public.residents(id) on delete set null,
  status          public.record_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index visitors_company_id_idx on public.visitors(company_id);
create index visitors_resident_id_idx on public.visitors(resident_id);

-- ----------------------------------------------------------------------------
-- Prestadores de serviço (vinculados a um morador responsável)
-- ----------------------------------------------------------------------------
create table public.service_providers (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  full_name       text not null,
  company_name    text,   -- Empresa do prestador
  cpf             text,
  document_type   public.document_type not null default 'rg',
  document_number text,
  phone           text,
  photo_url       text,
  vehicle_plate   text,
  service_type    text,
  resident_id     uuid references public.residents(id) on delete set null,
  status          public.record_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index service_providers_company_id_idx on public.service_providers(company_id);
create index service_providers_resident_id_idx on public.service_providers(resident_id);

-- ----------------------------------------------------------------------------
-- Registros de acesso (entrada / saída)
-- person_id é polimórfico: referencia residents/visitors/service_providers
-- conforme person_type. Snapshot de dados desnormalizado para histórico
-- imutável (o nome/residência ficam preservados mesmo se o cadastro mudar).
-- ----------------------------------------------------------------------------
create table public.access_logs (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id) on delete cascade,
  person_type            public.person_type not null,
  person_id              uuid not null,
  -- snapshot para histórico
  person_name            text not null,
  person_cpf             text,
  resident_responsible   text,   -- nome do morador responsável (visitante/prestador)
  residence_label        text,   -- ex.: "Bloco B / Apto 302" ou "Quadra 5 / Lote 12"
  -- entrada / saída
  entry_at               timestamptz not null default now(),
  exit_at                timestamptz,
  entry_porter_id        uuid references public.profiles(id) on delete set null,
  exit_porter_id         uuid references public.profiles(id) on delete set null,
  entry_porter_name      text,
  exit_porter_name       text,
  status                 public.access_status not null default 'inside',
  notes                  text,
  created_at             timestamptz not null default now()
);
create index access_logs_company_id_idx on public.access_logs(company_id);
create index access_logs_status_idx on public.access_logs(company_id, status);
create index access_logs_entry_at_idx on public.access_logs(company_id, entry_at desc);
create index access_logs_person_idx on public.access_logs(company_id, person_type, person_id);

-- Regra de negócio: não permitir duas entradas EM ABERTO para a mesma pessoa.
create unique index access_logs_open_unique
  on public.access_logs (company_id, person_type, person_id)
  where (status = 'inside');

-- ----------------------------------------------------------------------------
-- Logs de auditoria
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  user_name   text,
  action      text not null,   -- login, logout, create, update, delete, entry, exit, export
  entity      text,            -- resident, visitor, access_log, ...
  entity_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index audit_logs_company_id_idx on public.audit_logs(company_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs(company_id, action);

-- ==========================================================================
-- Funções auxiliares (SECURITY DEFINER para evitar recursão de RLS)
-- ==========================================================================

-- company_id do usuário autenticado
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- role do usuário autenticado
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'superadmin' from public.profiles where id = auth.uid()), false);
$$;

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_residents_updated_at before update on public.residents
  for each row execute function public.set_updated_at();
create trigger set_visitors_updated_at before update on public.visitors
  for each row execute function public.set_updated_at();
create trigger set_service_providers_updated_at before update on public.service_providers
  for each row execute function public.set_updated_at();

-- ==========================================================================
-- Row Level Security
-- ==========================================================================
alter table public.companies         enable row level security;
alter table public.profiles          enable row level security;
alter table public.residents         enable row level security;
alter table public.visitors          enable row level security;
alter table public.service_providers enable row level security;
alter table public.access_logs       enable row level security;
alter table public.audit_logs        enable row level security;

-- ------- companies -------
-- Superadmin gerencia todas; demais usuários leem apenas a própria empresa.
create policy companies_superadmin_all on public.companies
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy companies_select_own on public.companies
  for select using (id = public.current_company_id());

-- ------- profiles -------
-- Cada usuário lê o próprio perfil; superadmin lê/gerencia todos;
-- usuários leem colegas da mesma empresa (para exibir nomes de porteiros).
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_company_select on public.profiles
  for select using (company_id = public.current_company_id());
create policy profiles_superadmin_all on public.profiles
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ------- macro para tabelas por empresa -------
-- residents
create policy residents_company_all on public.residents
  for all
  using (company_id = public.current_company_id() or public.is_superadmin())
  with check (company_id = public.current_company_id() or public.is_superadmin());

-- visitors
create policy visitors_company_all on public.visitors
  for all
  using (company_id = public.current_company_id() or public.is_superadmin())
  with check (company_id = public.current_company_id() or public.is_superadmin());

-- service_providers
create policy service_providers_company_all on public.service_providers
  for all
  using (company_id = public.current_company_id() or public.is_superadmin())
  with check (company_id = public.current_company_id() or public.is_superadmin());

-- access_logs
create policy access_logs_company_all on public.access_logs
  for all
  using (company_id = public.current_company_id() or public.is_superadmin())
  with check (company_id = public.current_company_id() or public.is_superadmin());

-- audit_logs — inserção livre para usuários autenticados da empresa; leitura por empresa.
create policy audit_logs_company_select on public.audit_logs
  for select using (company_id = public.current_company_id() or public.is_superadmin());
create policy audit_logs_company_insert on public.audit_logs
  for insert with check (company_id = public.current_company_id() or public.is_superadmin());

-- ==========================================================================
-- Storage: bucket público para fotos e logos
-- ==========================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');
create policy "media_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'media');
create policy "media_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media');
