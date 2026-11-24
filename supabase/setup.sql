-- Nimantran: complete database setup. Safe to run more than once.
-- Supabase dashboard -> SQL Editor -> New query -> paste ALL of this file -> Run.
-- Then open <your site>/api/health: every line should say "ok".

-- ---------------------------------------------------------------- tables

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

-- Payment state. A new invitation is a draft; it goes live (guests can open it)
-- only after the host pays. Invitations made before payments existed stay live.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invites' and column_name = 'status'
  ) then
    alter table public.invites
      add column status text not null default 'published' check (status in ('draft', 'published'));
    alter table public.invites alter column status set default 'draft';
  end if;
end
$$;
alter table public.invites add column if not exists paid_amount int;          -- rupees paid
alter table public.invites add column if not exists published_at timestamptz;
create index if not exists invites_owner_idx on public.invites (owner, created_at desc);

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

-- One row per Razorpay order. Written only by the server (service role).
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.invites(id) on delete cascade,
  owner uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,
  payment_id text unique,
  design text not null,
  amount int not null check (amount > 0),                 -- paise
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_invite_idx on public.payments (invite_id);

-- ---------------------------------------------------------------- row level security

alter table public.invites enable row level security;
alter table public.rsvps enable row level security;
alter table public.views enable row level security;
alter table public.payments enable row level security;

-- Hosts manage only their own invitations.
drop policy if exists "owner reads invites" on public.invites;
drop policy if exists "owner inserts invites" on public.invites;
drop policy if exists "owner updates invites" on public.invites;
drop policy if exists "owner deletes invites" on public.invites;
create policy "owner reads invites" on public.invites for select to authenticated using (owner = auth.uid());
create policy "owner inserts invites" on public.invites for insert to authenticated with check (owner = auth.uid() and status = 'draft');
create policy "owner updates invites" on public.invites for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "owner deletes invites" on public.invites for delete to authenticated using (owner = auth.uid());

-- Hosts read replies, views and payments of their own invitations.
drop policy if exists "owner reads rsvps" on public.rsvps;
drop policy if exists "owner reads views" on public.views;
drop policy if exists "owner reads payments" on public.payments;
create policy "owner reads rsvps" on public.rsvps for select to authenticated
  using (exists (select 1 from public.invites i where i.id = invite_id and i.owner = auth.uid()));
create policy "owner reads views" on public.views for select to authenticated
  using (exists (select 1 from public.invites i where i.id = invite_id and i.owner = auth.uid()));
create policy "owner reads payments" on public.payments for select to authenticated using (owner = auth.uid());

-- ---------------------------------------------------------------- table access

grant usage on schema public to anon, authenticated, service_role;

-- Hosts may write only the invitation's text and design. The payment columns
-- (status, paid_amount, published_at) can be changed only by the server after
-- Razorpay confirms the payment, so nobody can publish without paying.
revoke insert, update on public.invites from anon, authenticated;
grant select, delete on public.invites to authenticated;
grant insert (owner, slug, n1, n2, occ, lang, date_text, time_text, venue, msg, design) on public.invites to authenticated;
grant update (n1, n2, occ, lang, date_text, time_text, venue, msg, design) on public.invites to authenticated;
revoke insert, update, delete on public.rsvps, public.views, public.payments from anon, authenticated;
grant select on public.rsvps, public.views, public.payments to authenticated;
grant all on public.invites, public.rsvps, public.views, public.payments to service_role;

-- ---------------------------------------------------------------- guest functions
-- Guests never touch the tables directly, and only see invitations that are paid for.

create or replace function public.get_public_invite(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(t)
  from (
    select slug, n1, n2, occ, lang, date_text, time_text, venue, msg, design
    from public.invites
    where slug = p_slug and p_slug ~ '^[a-z0-9]{4,32}$' and status = 'published'
  ) t;
$$;

create or replace function public.submit_rsvp(
  p_slug text, p_name text, p_resp text, p_guests int, p_note text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9]{4,32}$' then return false; end if;
  v_name := left(btrim(coalesce(p_name, '')), 80);
  if v_name = '' then return false; end if;
  if p_resp is null or p_resp not in ('yes', 'maybe', 'no') then return false; end if;

  select id into v_id from public.invites where slug = p_slug and status = 'published';
  if v_id is null then return false; end if;

  -- One reply per guest name per invitation; sending again updates it.
  insert into public.rsvps (invite_id, name, name_key, resp, guests, note, updated_at)
  values (
    v_id,
    v_name,
    lower(regexp_replace(v_name, '\s+', ' ', 'g')),
    p_resp,
    greatest(1, least(20, coalesce(p_guests, 1))),
    left(btrim(coalesce(p_note, '')), 300),
    now()
  )
  on conflict (invite_id, name_key) do update
    set name = excluded.name,
        resp = excluded.resp,
        guests = excluded.guests,
        note = excluded.note,
        updated_at = now();
  return true;
end;
$$;

create or replace function public.record_view(p_slug text, p_visitor text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_owner uuid;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9]{4,32}$' then return false; end if;
  if p_visitor is null or p_visitor = '' or char_length(p_visitor) > 64 then return false; end if;

  select id, owner into v_id, v_owner from public.invites where slug = p_slug and status = 'published';
  if v_id is null then return false; end if;

  -- The host previewing their own invitation is not a guest view.
  if auth.uid() is not null and auth.uid() = v_owner then return false; end if;

  -- Count one view per visitor per 30 minutes.
  if exists (
    select 1 from public.views
    where invite_id = v_id and visitor = p_visitor
      and created_at > now() - interval '30 minutes'
  ) then
    return true;
  end if;

  insert into public.views (invite_id, visitor) values (v_id, p_visitor);
  return true;
end;
$$;

-- ---------------------------------------------------------------- payment confirmation
-- Called only by the server, after it has checked Razorpay's signature.
-- Marks the order paid and publishes its invitation. Calling it again is harmless.

create or replace function public.confirm_payment(p_order_id text, p_payment_id text, p_amount int default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.payments%rowtype;
  v_slug text;
begin
  select * into p from public.payments where order_id = p_order_id for update;
  if not found then return null; end if;
  if p_amount is not null and p_amount <> p.amount then return null; end if;

  if p.status <> 'paid' then
    update public.payments
      set status = 'paid', payment_id = p_payment_id, paid_at = now()
      where id = p.id;
    update public.invites
      set status = 'published',
          design = p.design,
          paid_amount = greatest(coalesce(paid_amount, 0), p.amount / 100),
          published_at = coalesce(published_at, now())
      where id = p.invite_id;
  end if;

  select slug into v_slug from public.invites where id = p.invite_id;
  return jsonb_build_object('invite_id', p.invite_id, 'owner', p.owner, 'slug', v_slug);
end;
$$;

revoke all on function public.get_public_invite(text) from public;
revoke all on function public.submit_rsvp(text, text, text, int, text) from public;
revoke all on function public.record_view(text, text) from public;
revoke all on function public.confirm_payment(text, text, int) from public, anon, authenticated;
grant execute on function public.get_public_invite(text) to anon, authenticated;
grant execute on function public.submit_rsvp(text, text, text, int, text) to anon, authenticated;
grant execute on function public.record_view(text, text) to anon, authenticated;
grant execute on function public.confirm_payment(text, text, int) to service_role;

-- Make the API notice the changes straight away.
notify pgrst, 'reload schema';
