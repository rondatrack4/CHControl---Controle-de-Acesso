-- ==========================================================================
-- CHControl - Campo "empresa" em visitors
-- Categorias como Uber/Delivery/Corretor também podem ter uma empresa
-- associada (ex.: "Uber", "iFood"), não só prestadores de serviço.
-- ==========================================================================
alter table public.visitors add column if not exists company_name text;
