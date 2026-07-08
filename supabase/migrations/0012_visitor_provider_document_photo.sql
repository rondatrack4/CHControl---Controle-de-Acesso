-- ==========================================================================
-- CHControl - Foto do documento (ou PDF) de visitantes e prestadores de
-- serviço, para conferência posterior pela portaria.
-- ==========================================================================
alter table public.visitors add column if not exists document_photo_url text;
alter table public.service_providers add column if not exists document_photo_url text;
