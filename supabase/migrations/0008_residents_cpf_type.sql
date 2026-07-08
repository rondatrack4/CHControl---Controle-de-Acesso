-- ==========================================================================
-- CHControl - Suporte a CPF ou CNPJ também para moradores
-- (ex.: proprietário pessoa jurídica).
-- ==========================================================================
alter table public.residents add column if not exists cpf_type public.cpf_cnpj_kind not null default 'cpf';
