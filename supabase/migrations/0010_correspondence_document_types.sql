-- ==========================================================================
-- CHControl - Tipo de documento (RG/CPF/CNPJ) nos campos de documento do
-- Livro de Correspondências (entregador, destinatário, quem retirou).
-- ==========================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'correspondence_document_kind') then
    create type public.correspondence_document_kind as enum ('rg', 'cpf', 'cnpj');
  end if;
end $$;

alter table public.correspondences
  add column if not exists deliverer_document_type public.correspondence_document_kind not null default 'cpf',
  add column if not exists recipient_document_type public.correspondence_document_kind not null default 'cpf',
  add column if not exists delivered_to_document_type public.correspondence_document_kind not null default 'cpf';
