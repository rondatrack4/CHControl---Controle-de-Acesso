-- ==========================================================================
-- CHControl - Seed de demonstração (apenas para ambiente LOCAL)
-- Cria: 1 empresa demo, 1 superadmin, 1 porteiro e dados de exemplo.
--
-- Logins de demonstração (senha: chcontrol123):
--   superadmin@chcontrol.dev   -> superadmin (gerencia empresas)
--   portaria@chcontrol.dev     -> porteiro (empresa demo)
-- ==========================================================================

-- ---- IDs fixos para referência ----
-- empresa:     11111111-1111-1111-1111-111111111111
-- superadmin:  aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- porteiro:    bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

-- ---------- Auth users ----------
-- Obs.: as colunas de token (confirmation_token, recovery_token, ...) precisam
-- ser string vazia (não NULL), senão o GoTrue falha no login com
-- "Database error querying schema".
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated',
   'superadmin@chcontrol.dev', extensions.crypt('chcontrol123', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Super Admin"}', false,
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated',
   'portaria@chcontrol.dev', extensions.crypt('chcontrol123', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"João Porteiro"}', false,
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
values
  (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"superadmin@chcontrol.dev"}', 'email', now(), now(), now()),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","email":"portaria@chcontrol.dev"}', 'email', now(), now(), now())
on conflict do nothing;

-- ---------- Empresa demo ----------
insert into public.companies (id, name, cnpj, address, city, state, zip, phone, email, status)
values ('11111111-1111-1111-1111-111111111111', 'Condomínio Residencial Jardim das Flores',
        '12.345.678/0001-90', 'Av. das Palmeiras, 1000', 'São Paulo', 'SP', '01000-000',
        '(11) 3000-0000', 'contato@jardimdasflores.com.br', 'active')
on conflict (id) do nothing;

-- ---------- Perfis ----------
insert into public.profiles (id, company_id, full_name, email, role, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'Super Admin', 'superadmin@chcontrol.dev', 'superadmin', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'João Porteiro', 'portaria@chcontrol.dev', 'porter', 'active')
on conflict (id) do nothing;

-- ---------- Moradores de exemplo ----------
insert into public.residents (id, company_id, full_name, cpf, document_type, document_number, phone, email, residence_type, block, apartment, quadra, lote, status)
values
  ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Maria Silva Santos', '111.222.333-44', 'rg', '12.345.678-9', '(11) 99999-0001', 'maria@email.com', 'apartamento', 'B', '302', null, null, 'active'),
  ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Carlos Eduardo Oliveira', '222.333.444-55', 'cnh', '098765432', '(11) 99999-0002', 'carlos@email.com', 'lote', null, null, '5', '12', 'active'),
  ('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Ana Paula Costa', '333.444.555-66', 'rg', '23.456.789-0', '(11) 99999-0003', 'ana@email.com', 'apartamento', 'A', '101', null, null, 'active')
on conflict (id) do nothing;

-- ---------- Visitante de exemplo ----------
insert into public.visitors (id, company_id, full_name, cpf, document_type, document_number, phone, resident_id, status)
values
  ('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Pedro Henrique Lima', '444.555.666-77', 'rg', '34.567.890-1', '(11) 98888-0001', 'c1111111-1111-1111-1111-111111111111', 'active')
on conflict (id) do nothing;

-- ---------- Prestador de exemplo ----------
insert into public.service_providers (id, company_id, full_name, company_name, cpf, document_type, document_number, phone, vehicle_plate, service_type, resident_id, status)
values
  ('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Roberto Encanador', 'HidroFix Ltda', '555.666.777-88', 'cnh', '112233445', '(11) 97777-0001', 'ABC1D23', 'Encanamento', 'c2222222-2222-2222-2222-222222222222', 'active')
on conflict (id) do nothing;
