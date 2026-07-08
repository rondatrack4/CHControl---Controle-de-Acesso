-- ==========================================================================
-- CHControl - Portal do Morador (Fase A)
-- Vínculo profiles -> residents, helpers de RLS para o papel 'resident',
-- políticas de leitura restritas e tabela de notificações com trigger.
-- ==========================================================================

-- ----------------------------------------------------------------------------
-- profiles.resident_id: link de login -> cadastro de morador
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists resident_id uuid references public.residents(id) on delete cascade;
create index if not exists profiles_resident_id_idx on public.profiles(resident_id);

-- ----------------------------------------------------------------------------
-- Helpers SECURITY DEFINER (mesmo padrão de current_company_id/is_superadmin)
-- ----------------------------------------------------------------------------
create or replace function public.is_resident()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'resident' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.current_resident_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select resident_id from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- residents: morador lê apenas o próprio cadastro
-- ----------------------------------------------------------------------------
create policy residents_self_select on public.residents
  for select
  using (public.is_resident() and id = public.current_resident_id());

-- ----------------------------------------------------------------------------
-- access_logs: morador lê apenas visitas com destino ligado a ele.
-- ----------------------------------------------------------------------------
create policy access_logs_resident_select on public.access_logs
  for select
  using (
    public.is_resident()
    and exists (
      select 1 from public.access_log_destinations d
      where d.access_log_id = access_logs.id
        and d.resident_id = public.current_resident_id()
    )
  );

-- ----------------------------------------------------------------------------
-- access_log_destinations: morador lê apenas os próprios destinos
-- ----------------------------------------------------------------------------
create policy access_log_destinations_resident_select on public.access_log_destinations
  for select
  using (public.is_resident() and resident_id = public.current_resident_id());

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table public.notifications (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  resident_id    uuid not null references public.residents(id) on delete cascade,
  type           text not null,
  title          text not null,
  body           text,
  access_log_id  uuid references public.access_logs(id) on delete set null,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index notifications_company_id_idx on public.notifications(company_id);
create index notifications_resident_id_idx on public.notifications(resident_id, created_at desc);
create index notifications_unread_idx on public.notifications(resident_id) where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_resident_select on public.notifications
  for select
  using (public.is_resident() and resident_id = public.current_resident_id());

create policy notifications_resident_update on public.notifications
  for update
  using (public.is_resident() and resident_id = public.current_resident_id())
  with check (public.is_resident() and resident_id = public.current_resident_id());

create policy notifications_company_select on public.notifications
  for select
  using (company_id = public.current_company_id() or public.is_superadmin());

-- ----------------------------------------------------------------------------
-- Trigger: cria notificação quando um destino é criado (chegada para um
-- morador) e quando uma saída é registrada (exit_at passa a não-nulo).
-- ----------------------------------------------------------------------------
create or replace function public.notify_destination_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.access_logs%rowtype;
begin
  if new.resident_id is null then
    return new;
  end if;
  select * into v_log from public.access_logs where id = new.access_log_id;
  if v_log.id is null then
    return new;
  end if;
  insert into public.notifications (company_id, resident_id, type, title, body, access_log_id)
  values (
    new.company_id,
    new.resident_id,
    'arrival',
    v_log.person_name || ' chegou',
    coalesce(new.location_label, v_log.residence_label),
    v_log.id
  );
  return new;
end;
$$;

create trigger trg_notify_destination_created
  after insert on public.access_log_destinations
  for each row execute function public.notify_destination_created();

create or replace function public.notify_access_exit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d record;
begin
  if new.exit_at is not null and old.exit_at is null then
    for d in
      select distinct resident_id from public.access_log_destinations
      where access_log_id = new.id and resident_id is not null
    loop
      insert into public.notifications (company_id, resident_id, type, title, body, access_log_id)
      values (
        new.company_id,
        d.resident_id,
        'departure',
        new.person_name || ' saiu',
        new.residence_label,
        new.id
      );
    end loop;
  end if;
  return new;
end;
$$;

create trigger trg_notify_access_exit
  after update on public.access_logs
  for each row execute function public.notify_access_exit();

-- ----------------------------------------------------------------------------
-- Realtime: garantir que as tabelas usadas pelo portal do morador estão
-- na publicação supabase_realtime (necessário para postgres_changes).
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'access_log_destinations'
  ) then
    alter publication supabase_realtime add table public.access_log_destinations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'access_logs'
  ) then
    alter publication supabase_realtime add table public.access_logs;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
