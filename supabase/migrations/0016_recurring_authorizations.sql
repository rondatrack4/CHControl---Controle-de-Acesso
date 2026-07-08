-- ==========================================================================
-- CHControl - Acessos recorrentes: autorizações de entrada permanente/periódica
-- para moradores, visitantes ou prestadores já cadastrados (ex.: diarista,
-- babá, familiar com acesso livre), com data de início e validade.
-- ==========================================================================
create table public.recurring_authorizations (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references public.companies(id) on delete cascade,
  person_type             public.person_type not null,
  person_id               uuid not null,
  person_name             text not null,
  person_document         text,
  category_label          text,
  destination_resident_id uuid references public.residents(id) on delete set null,
  destination_label       text,
  start_date              date not null default current_date,
  end_date                date,
  recurrence_note         text,
  status                  text not null default 'active' check (status in ('active', 'inactive')),
  notes                   text,
  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index recurring_auth_company_idx on public.recurring_authorizations(company_id);
create index recurring_auth_person_idx on public.recurring_authorizations(person_type, person_id);
create index recurring_auth_end_date_idx on public.recurring_authorizations(end_date);

create trigger set_updated_at before update on public.recurring_authorizations
  for each row execute function public.set_updated_at();

alter table public.recurring_authorizations enable row level security;
create policy recurring_auth_company_all on public.recurring_authorizations
  for all using (company_id = public.current_company_id() or public.is_superadmin())
  with check (company_id = public.current_company_id() or public.is_superadmin());

alter publication supabase_realtime add table public.recurring_authorizations;
