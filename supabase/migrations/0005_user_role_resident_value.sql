-- ==========================================================================
-- CHControl - Novo valor de enum user_role: 'resident'
-- Precisa estar em migration isolada: ALTER TYPE ... ADD VALUE não pode
-- ser usado na mesma transação que uma query que referencia o novo valor.
-- ==========================================================================
alter type public.user_role add value if not exists 'resident';
