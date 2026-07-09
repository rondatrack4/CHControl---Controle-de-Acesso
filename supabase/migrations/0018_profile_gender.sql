-- Gênero do perfil, usado para flexionar o rótulo do papel
-- (Controlador de Acesso / Controladora de Acesso).
alter table public.profiles
  add column if not exists gender text check (gender in ('male', 'female'));
