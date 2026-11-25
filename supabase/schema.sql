-- Run once in the Supabase SQL Editor for the private Link Vault project.
create table if not exists public.vault_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  payload text not null,
  iv text not null,
  next_payload text,
  next_iv text,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  kdf_salt text not null,
  wrapped_key text not null,
  wrapped_key_iv text not null,
  key_check text,
  key_check_iv text
);

alter table public.vault_links add column if not exists next_payload text;
alter table public.vault_links add column if not exists next_iv text;
alter table public.vault_settings add column if not exists key_check text;
alter table public.vault_settings add column if not exists key_check_iv text;

alter table public.vault_links enable row level security;
alter table public.vault_settings enable row level security;

drop policy if exists "Owners can manage their links" on public.vault_links;
create policy "Owners can manage their links" on public.vault_links
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Owners can manage their settings" on public.vault_settings;
create policy "Owners can manage their settings" on public.vault_settings
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.vault_links from anon;
revoke all on public.vault_settings from anon;
grant select, insert, update, delete on public.vault_links to authenticated;
grant select, insert, update, delete on public.vault_settings to authenticated;

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
  if owner_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.vault_settings where user_id = owner_id) then
    raise exception 'Vault settings not found';
  end if;
  if exists (select 1 from public.vault_links where user_id = owner_id and (next_payload is null or next_iv is null)) then
    raise exception 'Key rotation is incomplete; no records were changed';
  end if;
  update public.vault_links set payload = next_payload, iv = next_iv, next_payload = null, next_iv = null where user_id = owner_id;
  update public.vault_settings set kdf_salt = p_kdf_salt, wrapped_key = p_wrapped_key, wrapped_key_iv = p_wrapped_key_iv,
    key_check = p_key_check, key_check_iv = p_key_check_iv where user_id = owner_id;
end;
$$;

revoke all on function public.finish_vault_key_rotation(text,text,text,text,text) from public, anon;
grant execute on function public.finish_vault_key_rotation(text,text,text,text,text) to authenticated;
