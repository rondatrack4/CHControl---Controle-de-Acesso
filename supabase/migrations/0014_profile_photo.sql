-- ==========================================================================
-- CHControl - Foto de perfil do usuário (porteiro/admin/superadmin/morador).
-- ==========================================================================
alter table public.profiles add column if not exists photo_url text;
