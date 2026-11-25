-- Run this migration in Supabase SQL Editor before deploying the updated app.
alter table public.vault_settings add column if not exists key_check text;
alter table public.vault_settings add column if not exists key_check_iv text;

-- These columns stage all newly encrypted records. Existing ciphertext remains intact
-- until finish_vault_key_rotation atomically promotes every staged row.
alter table public.vault_links add column if not exists next_payload text;
alter table public.vault_links add column if not exists next_iv text;

create or replace function public.finish_vault_key_rotation(
  p_kdf_salt text,
  p_wrapped_key text,
  p_wrapped_key_iv text,
  p_key_check text,
  p_key_check_iv text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.vault_settings where user_id = owner_id) then
    raise exception 'Vault settings not found';
  end if;

  if exists (
    select 1 from public.vault_links
    where user_id = owner_id and (next_payload is null or next_iv is null)
  ) then
    raise exception 'Key rotation is incomplete; no records were changed';
  end if;

  update public.vault_links
  set payload = next_payload,
      iv = next_iv,
      next_payload = null,
      next_iv = null
  where user_id = owner_id;

  update public.vault_settings
  set kdf_salt = p_kdf_salt,
      wrapped_key = p_wrapped_key,
      wrapped_key_iv = p_wrapped_key_iv,
      key_check = p_key_check,
      key_check_iv = p_key_check_iv
  where user_id = owner_id;
end;
$$;

revoke all on function public.finish_vault_key_rotation(text,text,text,text,text) from public, anon;
grant execute on function public.finish_vault_key_rotation(text,text,text,text,text) to authenticated;
