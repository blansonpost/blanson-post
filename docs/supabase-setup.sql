-- The Blanson Post — Supabase setup
--
-- Run this ONCE in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- Then fill in SUPABASE_URL and SUPABASE_ANON_KEY in shared/config.js.
--
-- What this sets up:
--   profiles   who each account is, and what they are allowed to do
--   articles   the stories themselves
--   photos     a storage bucket for uploaded images
--
-- The rules below are the important part. They are enforced by the database
-- itself, so they hold even if someone reads the site's JavaScript and tries to
-- call the API directly. Never put the "service_role" key in the website — it
-- ignores every rule on this page.

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  role       text not null default 'writer' check (role in ('writer','editor','advisor')),
  created_at timestamptz not null default now()
);

-- New sign-ups start as writers with no special powers.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── articles ────────────────────────────────────────────────────────────────
create table if not exists public.articles (
  id          text primary key,
  slug        text not null,
  title       text not null default '',
  section     text not null default 'campus',
  author      text not null default '',
  body        text not null default '',
  excerpt     text not null default '',
  rating      numeric,
  rating_max  integer default 5,
  status      text not null default 'draft' check (status in ('draft','review','published')),
  images      jsonb not null default '[]'::jsonb,
  photos      jsonb not null default '[]'::jsonb,
  author_id   uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists articles_status_idx  on public.articles (status);
create index if not exists articles_section_idx on public.articles (section);
create unique index if not exists articles_slug_idx on public.articles (slug);

-- Stamp author_id and updated_at server-side rather than trusting the browser.
create or replace function public.stamp_article()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.author_id is null then new.author_id := auth.uid(); end if;
  return new;
end $$;

drop trigger if exists articles_stamp on public.articles;
create trigger articles_stamp
  before insert or update on public.articles
  for each row execute function public.stamp_article();

-- ── who can do what ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.articles enable row level security;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('editor','advisor')
  );
$$;

-- profiles: everyone signed in can see who's who; nobody can promote themselves.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- articles: the public sees published stories only.
drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles
  for select to anon, authenticated using (status = 'published');

-- writers see their own drafts; editors see everything.
drop policy if exists articles_staff_read on public.articles;
create policy articles_staff_read on public.articles
  for select to authenticated using (author_id = auth.uid() or public.is_editor());

drop policy if exists articles_insert on public.articles;
create policy articles_insert on public.articles
  for insert to authenticated with check (author_id = auth.uid() or public.is_editor());

-- A writer may edit their own work but may NOT publish it. Only an editor can
-- move a story to 'published' — that is the whole point of the review step.
drop policy if exists articles_update_own on public.articles;
create policy articles_update_own on public.articles
  for update to authenticated
  using (author_id = auth.uid() and status <> 'published')
  with check (author_id = auth.uid() and status in ('draft','review'));

drop policy if exists articles_update_editor on public.articles;
create policy articles_update_editor on public.articles
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists articles_delete_own on public.articles;
create policy articles_delete_own on public.articles
  for delete to authenticated
  using ((author_id = auth.uid() and status = 'draft') or public.is_editor());

-- ── photo storage ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists photos_public_read on storage.objects;
create policy photos_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'photos');

drop policy if exists photos_staff_write on storage.objects;
create policy photos_staff_write on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');

drop policy if exists photos_staff_delete on storage.objects;
create policy photos_staff_delete on storage.objects
  for delete to authenticated using (bucket_id = 'photos' and public.is_editor());

-- ── after running this ──────────────────────────────────────────────────────
-- 1. Authentication -> Providers -> Email: turn OFF "Enable email signups".
--    Accounts should be created by you, not by anyone who finds the URL.
-- 2. Authentication -> Users -> Add user, for each writer.
-- 3. Make yourself an editor (swap in your own email):
--
--      update public.profiles set role = 'advisor', name = 'Your Name'
--      where id = (select id from auth.users where email = 'you@example.com');
