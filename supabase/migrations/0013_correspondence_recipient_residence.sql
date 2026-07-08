-- ==========================================================================
-- CHControl - Padroniza o endereço do destinatário da correspondência no
-- mesmo modelo usado para o morador (Bloco/Apartamento ou Quadra/Lote).
-- ==========================================================================
alter table public.correspondences add column if not exists recipient_residence_type public.residence_type not null default 'apartamento';
alter table public.correspondences add column if not exists recipient_quadra text;
alter table public.correspondences add column if not exists recipient_lote text;
