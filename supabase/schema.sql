-- Nimantran schema. Run this once in the Supabase SQL editor.

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  n1 text not null check (char_length(n1) between 1 and 80),
  n2 text not null default '' check (char_length(n2) <= 80),
  occ text not null default 'wedding',
  lang text not null default 'en' check (lang in ('en','hi','mr')),
  date_text text not null default '' check (char_length(date_text) <= 60),
  time_text text not null default '' check (char_length(time_text) <= 40),
  venue text not null default '' check (char_length(venue) <= 160),
  msg text not null default '' check (char_length(msg) <= 500),
  design text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.invites(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  name_key text not null,
  resp text not null check (resp in ('yes','maybe','no')),
  guests int not null default 1 check (guests between 1 and 20),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invite_id, name_key)
);

create table if not exists public.views (
  id bigint generated always as identity primary key,
  invite_id uuid not null references public.invites(id) on delete cascade,
  visitor text not null check (char_length(visitor) <= 64),
  created_at timestamptz not null default now()
);
create index if not exists views_invite_idx on public.views (invite_id, created_at);

alter table public.invites enable row level security;
alter table public.rsvps enable row level security;
alter table public.views enable row level security;

-- Hosts manage only their own invitations.
create policy "owner reads invites" on public.invites for select using (owner = auth.uid());
create policy "owner inserts invites" on public.invites for insert with check (owner = auth.uid());
create policy "owner updates invites" on public.invites for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "owner deletes invites" on public.invites for delete using (owner = auth.uid());

-- Hosts read replies and views of their own invitations.
-- Guests never touch these tables directly: replies and views are written
-- by the functions in guest_functions.sql, which validate input first.
create policy "owner reads rsvps" on public.rsvps for select
  using (exists (select 1 from public.invites i where i.id = invite_id and i.owner = auth.uid()));
create policy "owner reads views" on public.views for select
  using (exists (select 1 from public.invites i where i.id = invite_id and i.owner = auth.uid()));
