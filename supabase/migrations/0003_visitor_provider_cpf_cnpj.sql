-- ==========================================================================
-- CHControl - Suporte a CPF ou CNPJ para visitantes e prestadores de serviço
-- Permite identificar visitantes/prestadores por pessoa jurídica (CNPJ).
-- ==========================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cpf_cnpj_kind') then
    create type public.cpf_cnpj_kind as enum ('cpf', 'cnpj');
  end if;
end $$;

alter table public.visitors
  add column if not exists cpf_type public.cpf_cnpj_kind not null default 'cpf';

alter table public.service_providers
  add column if not exists cpf_type public.cpf_cnpj_kind not null default 'cpf';
