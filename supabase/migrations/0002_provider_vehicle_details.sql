-- ==========================================================================
-- CHControl - Detalhes do veículo do prestador de serviço
-- Adiciona marca, modelo e cor ao veículo já cadastrado (placa).
-- ==========================================================================

alter table public.service_providers
  add column if not exists vehicle_brand text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_color text;
