-- ==========================================================================
-- CHControl - Snapshot completo da pessoa no momento da entrada.
-- Antes, ao reaproveitar um cadastro existente (existing_person_id), o
-- formulário de entrada sobrescrevia o cadastro permanente do visitante ou
-- prestador com qualquer ajuste feito apenas para aquela visita (ex.: veículo
-- diferente no dia). Agora esses ajustes ficam só no registro de acesso,
-- sem alterar o cadastro original.
-- ==========================================================================
alter table public.access_logs add column if not exists person_document_type public.document_type;
alter table public.access_logs add column if not exists person_document_number text;
alter table public.access_logs add column if not exists person_phone text;
alter table public.access_logs add column if not exists person_company_name text;
alter table public.access_logs add column if not exists person_service_type text;
alter table public.access_logs add column if not exists vehicle_plate text;
alter table public.access_logs add column if not exists vehicle_brand text;
alter table public.access_logs add column if not exists vehicle_model text;
alter table public.access_logs add column if not exists vehicle_color text;
