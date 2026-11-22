-- Run once in the Supabase SQL Editor for the private Link Vault project.
create table if not exists public.vault_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  payload text not null,
  iv text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  kdf_salt text not null,
  wrapped_key text not null,
  wrapped_key_iv text not null
);

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
