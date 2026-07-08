-- ==========================================================================
-- CHControl - Livro de Correspondências
-- Controle de entrada, armazenamento e entrega de correspondências dos
-- moradores. Histórico de movimentação reaproveita audit_logs; notificação
-- ao morador reaproveita a tabela notifications já existente.
-- ==========================================================================

create type public.correspondence_status as enum
  ('recebido', 'em_armazenamento', 'aguardando_retirada', 'entregue', 'recusado', 'devolvido', 'extraviado', 'cancelado');
create type public.correspondence_priority as enum ('baixa', 'normal', 'alta', 'urgente');

create table public.correspondences (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references public.companies(id) on delete cascade,
  seq_number              bigserial not null,
  registration_number     text generated always as ('COR-' || lpad(seq_number::text, 6, '0')) stored,
  type                    text not null default 'pacote',
  carrier                 text,
  sender_company          text,
  deliverer_name          text,
  deliverer_document      text,
  deliverer_phone         text,
  tracking_code           text,
  received_at             timestamptz not null default now(),
  resident_id             uuid references public.residents(id) on delete set null,
  recipient_name          text,
  recipient_block         text,
  recipient_apartment     text,
  recipient_tower         text,
  recipient_unit          text,
  recipient_document      text,
  recipient_phone         text,
  recipient_whatsapp      text,
  recipient_email         text,
  status                  public.correspondence_status not null default 'recebido',
  priority                public.correspondence_priority not null default 'normal',
  location_note           text,
  notes                   text,
  entry_photos            text[] not null default '{}',
  entry_signature_url     text,
  entry_porter_id         uuid references public.profiles(id) on delete set null,
  entry_porter_name       text,
  delivered_at            timestamptz,
  delivered_to_name       text,
  delivered_to_document   text,
  delivered_to_phone      text,
  delivered_notes         text,
  delivery_signature_url  text,
  delivery_porter_id      uuid references public.profiles(id) on delete set null,
  delivery_porter_name    text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index correspondences_registration_number_idx on public.correspondences(company_id, registration_number);
create index correspondences_company_status_idx on public.correspondences(company_id, status);
create index correspondences_resident_idx on public.correspondences(resident_id);
create index correspondences_received_at_idx on public.correspondences(company_id, received_at desc);

create trigger trg_correspondences_updated_at before update on public.correspondences
  for each row execute function public.set_updated_at();

alter table public.correspondences enable row level security;

create policy correspondences_company_all on public.correspondences
  for all
  using (company_id = public.current_company_id() or public.is_superadmin())
  with check (company_id = public.current_company_id() or public.is_superadmin());

create policy correspondences_resident_select on public.correspondences
  for select
  using (public.is_resident() and resident_id = public.current_resident_id());

-- ----------------------------------------------------------------------------
-- Notificação in-app ao morador (reaproveita notifications + Realtime já
-- configurados; a UI do sino de notificações não precisa de nenhuma mudança).
-- ----------------------------------------------------------------------------
alter table public.notifications add column if not exists correspondence_id uuid references public.correspondences(id) on delete set null;

create or replace function public.notify_correspondence_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.resident_id is not null then
    insert into public.notifications (company_id, resident_id, type, title, body, correspondence_id)
    values (
      new.company_id,
      new.resident_id,
      'correspondence',
      'Você recebeu uma correspondência',
      concat_ws(' · ', new.type, new.carrier, new.tracking_code),
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_correspondence_received
  after insert on public.correspondences
  for each row execute function public.notify_correspondence_received();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'correspondences'
  ) then
    alter publication supabase_realtime add table public.correspondences;
  end if;
end $$;
