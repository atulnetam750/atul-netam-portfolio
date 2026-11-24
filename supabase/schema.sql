-- Atul Netam Portfolio 2.0 — run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
drop policy if exists "Admins can read own admin record" on public.admin_users;
create policy "Admins can read own admin record" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.site_profile (
  id text primary key check (id = 'main'),
  headline text not null default 'Video Journalist & Cameraman',
  about text not null default '',
  location text not null default 'Narayanpur, Chhattisgarh',
  updated_at timestamptz not null default now()
);
alter table public.site_profile enable row level security;
drop policy if exists "Public can read profile" on public.site_profile;
create policy "Public can read profile" on public.site_profile for select to anon, authenticated using (true);
drop policy if exists "Admins can manage profile" on public.site_profile;
create policy "Admins can manage profile" on public.site_profile for all to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  category text not null check (char_length(category) between 1 and 80),
  description text not null default '',
  url text,
  image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.portfolio_projects enable row level security;
drop policy if exists "Public reads published projects" on public.portfolio_projects;
create policy "Public reads published projects" on public.portfolio_projects
  for select to anon, authenticated using (published = true or exists (
    select 1 from public.admin_users a where a.user_id = (select auth.uid())
  ));
drop policy if exists "Admins manage projects" on public.portfolio_projects;
create policy "Admins manage projects" on public.portfolio_projects for all to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 180),
  message text not null check (char_length(message) between 1 and 3000),
  status text not null default 'new' check (status in ('new','read')),
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
drop policy if exists "Visitors can send contact messages" on public.contact_messages;
create policy "Visitors can send contact messages" on public.contact_messages
  for insert to anon, authenticated with check (status = 'new');
drop policy if exists "Admins can read messages" on public.contact_messages;
create policy "Admins can read messages" on public.contact_messages for select to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
drop policy if exists "Admins can update messages" on public.contact_messages;
create policy "Admins can update messages" on public.contact_messages for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Private schema for AI quota accounting; not exposed through the public Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.ai_usage (
  client_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 0,
  primary key (client_hash, bucket_start)
);
revoke all on private.ai_usage from public, anon, authenticated;

create or replace function public.consume_ai_quota(p_client_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  insert into private.ai_usage(client_hash, bucket_start, request_count)
  values (p_client_hash, v_bucket, 1)
  on conflict (client_hash, bucket_start)
  do update set request_count = private.ai_usage.request_count + 1
  returning request_count into v_count;
  return v_count <= 12;
end;
$$;
revoke all on function public.consume_ai_quota(text) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(text) to service_role;

insert into public.site_profile(id, headline, about, location)
values ('main','Video Journalist & Cameraman','IBC24 News Network • Photography • Videography • Ground Reporting','Narayanpur, Chhattisgarh, India')
on conflict (id) do nothing;

-- After creating your own Auth user in Supabase Dashboard, replace the email below and run:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL'
-- on conflict do nothing;
