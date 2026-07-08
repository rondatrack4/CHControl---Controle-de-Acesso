-- ==========================================================================
-- CHControl - Contatos adicionais do morador: telefone secundário, tipo de
-- telefone (fixo/whatsapp), contatos de familiares e múltiplas residências
-- (um morador pode ter mais de uma unidade no mesmo condomínio).
-- ==========================================================================
create type public.phone_kind as enum ('fixo', 'whatsapp');

alter table public.residents add column if not exists phone_type public.phone_kind not null default 'fixo';
alter table public.residents add column if not exists phone_secondary text;
alter table public.residents add column if not exists phone_secondary_type public.phone_kind not null default 'fixo';
alter table public.residents add column if not exists family_contacts jsonb not null default '[]'::jsonb;
alter table public.residents add column if not exists residences jsonb not null default '[]'::jsonb;

-- Backfill: garante que todo morador já cadastrado tenha ao menos a
-- residência primária (colunas existentes) refletida na nova lista.
update public.residents
set residences = jsonb_build_array(
  jsonb_build_object(
    'residence_type', residence_type,
    'block', block,
    'apartment', apartment,
    'quadra', quadra,
    'lote', lote
  )
)
where residences = '[]'::jsonb;
