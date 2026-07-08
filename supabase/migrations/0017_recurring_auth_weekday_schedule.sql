-- ==========================================================================
-- CHControl - Horário permitido por dia da semana para acessos recorrentes.
-- Substitui o campo de texto livre por uma grade estruturada (dia + horário
-- de início/fim), selecionável, por dia da semana.
-- ==========================================================================
alter table public.recurring_authorizations add column if not exists weekday_schedule jsonb not null default '[]'::jsonb;
