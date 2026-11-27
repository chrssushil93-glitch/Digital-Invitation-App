-- Nimantran: complete database setup. Safe to run more than once.
-- Supabase dashboard -> SQL Editor -> New query -> paste ALL of this file -> Run.
-- Then open <your site>/api/health: every line should say "ok".
--
-- Make yourself an admin (once, after signing up on the site):
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com' on conflict do nothing;

-- ================================================================ tables

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
alter table public.invites add column if not exists publish_source text;      -- payment | free | admin (empty: before payments)
alter table public.invites add column if not exists offline_reason text;      -- why the site team took it offline
-- "suspended": taken offline by the site team. Guests cannot open it.
alter table public.invites drop constraint if exists invites_status_check;
alter table public.invites add constraint invites_status_check check (status in ('draft', 'published', 'suspended'));
create index if not exists invites_owner_idx on public.invites (owner, created_at desc);
create index if not exists invites_status_idx on public.invites (status, created_at desc);

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

-- One row per Razorpay order. Written only by the server and by admins.
-- Orders are kept when their invitation or customer account is deleted.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.invites(id) on delete set null,
  owner uuid references auth.users(id) on delete set null,
  order_id text not null unique,
  payment_id text unique,
  design text not null,
  amount int not null check (amount > 0),                 -- paise
  currency text not null default 'INR',
  status text not null default 'created',
  customer_email text,                                    -- copied in when the order is made
  invite_title text,
  note text not null default '',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz
);
alter table public.payments alter column invite_id drop not null;
alter table public.payments alter column owner drop not null;
alter table public.payments add column if not exists customer_email text;
alter table public.payments add column if not exists invite_title text;
alter table public.payments add column if not exists note text not null default '';
alter table public.payments add column if not exists refunded_at timestamptz;
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('created', 'paid', 'refunded'));
alter table public.payments drop constraint if exists payments_invite_id_fkey;
alter table public.payments add constraint payments_invite_id_fkey foreign key (invite_id) references public.invites(id) on delete set null;
alter table public.payments drop constraint if exists payments_owner_fkey;
alter table public.payments add constraint payments_owner_fkey foreign key (owner) references auth.users(id) on delete set null;
create index if not exists payments_invite_idx on public.payments (invite_id);
create index if not exists payments_owner_idx on public.payments (owner);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

-- People who run the site.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid
);

-- Customers put on hold by an admin: they cannot create, edit or publish.
create table if not exists public.blocked_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  blocked_at timestamptz not null default now(),
  blocked_by uuid
);

-- Everything the admin can change without a deploy: prices, templates, texts, payments mode.
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- Uploaded files such as the logo, served by the site at /api/brand/<name>.
create table if not exists public.site_assets (
  name text primary key check (name ~ '^[a-z0-9-]{1,40}$'),
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')),
  data bytea not null check (octet_length(data) <= 1048576),
  updated_at timestamptz not null default now()
);

-- What each admin did, and when.
create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid,
  admin_email text,
  action text not null,
  target text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_created_idx on public.admin_log (created_at desc);

-- ================================================================ who is signed in

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.is_blocked()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocked_users where user_id = auth.uid());
$$;

-- The signed-in person's own standing, for the site header and the studio.
create or replace function public.my_account()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'admin', exists (select 1 from public.admins where user_id = auth.uid()),
    'blocked', exists (select 1 from public.blocked_users where user_id = auth.uid()),
    'reason', (select reason from public.blocked_users where user_id = auth.uid())
  );
$$;

-- ================================================================ row level security

alter table public.invites enable row level security;
alter table public.rsvps enable row level security;
alter table public.views enable row level security;
alter table public.payments enable row level security;
alter table public.admins enable row level security;
alter table public.blocked_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_assets enable row level security;
alter table public.admin_log enable row level security;

-- Hosts manage only their own invitations; a host on hold cannot create or edit.
drop policy if exists "owner reads invites" on public.invites;
drop policy if exists "owner inserts invites" on public.invites;
drop policy if exists "owner updates invites" on public.invites;
drop policy if exists "owner deletes invites" on public.invites;
create policy "owner reads invites" on public.invites for select to authenticated using (owner = auth.uid());
create policy "owner inserts invites" on public.invites for insert to authenticated
  with check (owner = auth.uid() and status = 'draft' and not public.is_blocked());
create policy "owner updates invites" on public.invites for update to authenticated
  using (owner = auth.uid() and not public.is_blocked()) with check (owner = auth.uid());
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

-- Site settings are public (prices, texts); only admin functions change them.
drop policy if exists "anyone reads settings" on public.site_settings;
create policy "anyone reads settings" on public.site_settings for select to anon, authenticated using (true);
-- admins, blocked_users, site_assets and admin_log have no policies: only the functions below reach them.

-- ================================================================ table access

grant usage on schema public to anon, authenticated, service_role;

-- Hosts may write only the invitation's text and design. The payment columns
-- (status, paid_amount, published_at, publish_source, offline_reason) change only through
-- the functions below, so nobody can publish without paying.
revoke insert, update on public.invites from anon, authenticated;
grant select, delete on public.invites to authenticated;
grant insert (owner, slug, n1, n2, occ, lang, date_text, time_text, venue, msg, design) on public.invites to authenticated;
grant update (n1, n2, occ, lang, date_text, time_text, venue, msg, design) on public.invites to authenticated;
revoke insert, update, delete on public.rsvps, public.views, public.payments from anon, authenticated;
grant select on public.rsvps, public.views, public.payments to authenticated;
revoke all on public.admins, public.blocked_users, public.site_assets, public.admin_log, public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant all on public.invites, public.rsvps, public.views, public.payments, public.admins, public.blocked_users,
  public.site_settings, public.site_assets, public.admin_log to service_role;

-- ================================================================ guest functions
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

-- The site's uploaded logo (anyone may read it).
create or replace function public.site_asset(p_name text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('mime', mime, 'data', encode(data, 'base64'), 'v', extract(epoch from updated_at)::bigint)
  from public.site_assets where name = p_name;
$$;

-- ================================================================ payments

-- Publishes the invitation an order paid for (internal).
create or replace function public.publish_for_payment(p_pay uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.payments%rowtype;
  v_hold boolean;
begin
  select * into p from public.payments where id = p_pay;
  if not found or p.invite_id is null then return; end if;
  v_hold := exists (
    select 1 from public.blocked_users b join public.invites i on i.owner = b.user_id where i.id = p.invite_id
  );
  update public.invites
    set status = case when v_hold or status = 'suspended' then 'suspended' else 'published' end,
        offline_reason = case when v_hold then 'account on hold' else offline_reason end,
        design = p.design,
        paid_amount = greatest(coalesce(paid_amount, 0), p.amount / 100),
        published_at = coalesce(published_at, now()),
        publish_source = 'payment'
    where id = p.invite_id;
end;
$$;

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

  if p.status = 'created' then
    update public.payments set status = 'paid', payment_id = p_payment_id, paid_at = now() where id = p.id;
    perform public.publish_for_payment(p.id);
  end if;

  select slug into v_slug from public.invites where id = p.invite_id;
  return jsonb_build_object('invite_id', p.invite_id, 'owner', p.owner, 'slug', v_slug);
end;
$$;

-- Razorpay webhook: a refund went through.
create or replace function public.payment_refunded(p_payment_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.payments set status = 'refunded', refunded_at = coalesce(refunded_at, now())
    where payment_id = p_payment_id and status = 'paid';
  return found;
end;
$$;

-- Publishes a draft without payment, but only while the admin has made publishing free
-- (payments switched off, or this template priced at 0).
create or replace function public.publish_free(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v public.invites%rowtype;
  s jsonb;
begin
  if auth.uid() is null then raise exception 'Please sign in again.' using errcode = '42501'; end if;
  if public.is_blocked() then raise exception 'Your account is on hold.' using errcode = '42501'; end if;
  select * into v from public.invites where id = p_id and owner = auth.uid() for update;
  if not found then return null; end if;
  if v.status <> 'draft' then return jsonb_build_object('status', v.status, 'slug', v.slug); end if;
  select data into s from public.site_settings where id = 1;
  -- coalesce matters: a template without a price override must count as "not free", not as unknown.
  if not (coalesce(s ->> 'paymentsMode', 'razorpay') = 'free' or coalesce(s -> 'prices' ->> v.design, '') = '0') then
    raise exception 'This template needs payment.' using errcode = 'P0001';
  end if;
  update public.invites set status = 'published', published_at = coalesce(published_at, now()), publish_source = 'free'
    where id = p_id;
  return jsonb_build_object('status', 'published', 'slug', v.slug);
end;
$$;

-- ================================================================ admin functions
-- Every one starts with admin_guard(), so only people in public.admins can use them.

create or replace function public.admin_guard()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Only admins can do this.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_note(p_action text, p_target text, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_log (admin_id, admin_email, action, target, details)
  select auth.uid(), (select email from auth.users where id = auth.uid()), p_action, coalesce(p_target, ''),
         coalesce(p_details, '{}'::jsonb);
$$;

-- Dashboard numbers. Days are counted in Indian time.
create or replace function public.admin_overview(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 365));
  v_from date := (now() at time zone 'Asia/Kolkata')::date - (greatest(1, least(coalesce(p_days, 30), 365)) - 1);
  v_since timestamptz;
  v_out jsonb;
begin
  perform public.admin_guard();
  v_since := v_from::timestamp at time zone 'Asia/Kolkata';
  select jsonb_build_object(
    'days', v_days,
    'from', v_from,
    'revenue_total', coalesce((select sum(amount) from public.payments where status = 'paid'), 0),
    'revenue_period', coalesce((select sum(amount) from public.payments where status = 'paid' and paid_at >= v_since), 0),
    'orders_period', (select count(*) from public.payments where status = 'paid' and paid_at >= v_since),
    'orders_paid', (select count(*) from public.payments where status = 'paid'),
    'orders_unpaid', (select count(*) from public.payments where status = 'created'),
    'orders_refunded', (select count(*) from public.payments where status = 'refunded'),
    'refunds_total', coalesce((select sum(amount) from public.payments where status = 'refunded'), 0),
    'customers', (select count(*) from auth.users),
    'customers_period', (select count(*) from auth.users where created_at >= v_since),
    'customers_paying', (select count(distinct owner) from public.payments where status = 'paid'),
    'customers_blocked', (select count(*) from public.blocked_users),
    'invites', (select count(*) from public.invites),
    'invites_period', (select count(*) from public.invites where created_at >= v_since),
    'invites_live', (select count(*) from public.invites where status = 'published'),
    'invites_draft', (select count(*) from public.invites where status = 'draft'),
    'invites_offline', (select count(*) from public.invites where status = 'suspended'),
    'views', (select count(*) from public.views),
    'views_period', (select count(*) from public.views where created_at >= v_since),
    'rsvps', (select count(*) from public.rsvps),
    'coming', coalesce((select sum(guests) from public.rsvps where resp = 'yes'), 0),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'd', g.d, 'revenue', coalesce(p.revenue, 0), 'orders', coalesce(p.orders, 0),
        'signups', coalesce(u.n, 0), 'invites', coalesce(i.n, 0)
      ) order by g.d), '[]'::jsonb)
      from (select v_from + k as d from generate_series(0, v_days - 1) k) g
      left join (select (paid_at at time zone 'Asia/Kolkata')::date as d, sum(amount) as revenue, count(*) as orders
                 from public.payments where status = 'paid' and paid_at >= v_since group by 1) p on p.d = g.d
      left join (select (created_at at time zone 'Asia/Kolkata')::date as d, count(*) as n
                 from auth.users where created_at >= v_since group by 1) u on u.d = g.d
      left join (select (created_at at time zone 'Asia/Kolkata')::date as d, count(*) as n
                 from public.invites where created_at >= v_since group by 1) i on i.d = g.d
    ),
    'top_designs', (
      select coalesce(jsonb_agg(t order by t.revenue desc, t.invites desc), '[]'::jsonb) from (
        select d.design, coalesce(i.invites, 0) as invites, coalesce(i.live, 0) as live,
               coalesce(p.revenue, 0) as revenue, coalesce(p.orders, 0) as orders
        from (select design from public.invites union select design from public.payments where status = 'paid') d
        left join (select design, count(*) as invites, count(*) filter (where status = 'published') as live
                   from public.invites group by design) i using (design)
        left join (select design, sum(amount) as revenue, count(*) as orders
                   from public.payments where status = 'paid' group by design) p using (design)
        order by coalesce(p.revenue, 0) desc, coalesce(i.invites, 0) desc
        limit 8
      ) t
    ),
    'recent_orders', (
      select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb) from (
        select p.order_id, p.status, p.amount, p.design, p.created_at, p.paid_at, p.owner, p.invite_id,
               coalesce(u.email, p.customer_email) as email,
               coalesce(nullif(concat_ws(' & ', i.n1, nullif(i.n2, '')), ''), p.invite_title) as title
        from public.payments p
        left join auth.users u on u.id = p.owner
        left join public.invites i on i.id = p.invite_id
        order by p.created_at desc limit 6
      ) r
    ),
    'recent_customers', (
      select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb) from (
        select u.id, u.email, u.created_at, (select count(*) from public.invites i where i.owner = u.id) as invites
        from auth.users u order by u.created_at desc limit 6
      ) r
    )
  ) into v_out;
  return v_out;
end;
$$;

-- Orders. p_status: '' (all), 'paid', 'created' (not paid yet), 'refunded'.
create or replace function public.admin_orders(p_status text default '', p_search text default '', p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
  v_s text := coalesce(p_status, '');
  v_out jsonb;
begin
  perform public.admin_guard();
  with base as (
    select p.id, p.order_id, p.payment_id, p.status, p.amount, p.currency, p.design, p.note,
           p.created_at, p.paid_at, p.refunded_at, p.invite_id, p.owner,
           coalesce(u.email, p.customer_email) as email,
           coalesce(nullif(concat_ws(' & ', i.n1, nullif(i.n2, '')), ''), p.invite_title) as title,
           i.slug, i.status as invite_status
    from public.payments p
    left join auth.users u on u.id = p.owner
    left join public.invites i on i.id = p.invite_id
  ), filtered as (
    select * from base b
    where (v_s = '' or b.status = v_s)
      and (v_q is null or concat_ws(' ', b.order_id, b.payment_id, b.email, b.title, b.design) ilike '%' || v_q || '%')
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'paid_sum', coalesce((select sum(amount) from filtered where status = 'paid'), 0),
    'rows', coalesce((select jsonb_agg(r order by r.created_at desc) from (
      select * from filtered order by created_at desc
      limit greatest(1, least(coalesce(p_limit, 25), 5000)) offset greatest(0, coalesce(p_offset, 0))
    ) r), '[]'::jsonb)
  ) into v_out;
  return v_out;
end;
$$;

-- Customers. p_filter: '' (all), 'paying', 'blocked', 'admins'.
create or replace function public.admin_customers(p_filter text default '', p_search text default '', p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
  v_f text := coalesce(p_filter, '');
  v_out jsonb;
begin
  perform public.admin_guard();
  with base as (
    select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
           coalesce(u.raw_app_meta_data ->> 'provider', 'email') as provider,
           exists (select 1 from public.admins a where a.user_id = u.id) as is_admin,
           exists (select 1 from public.blocked_users b where b.user_id = u.id) as blocked
    from auth.users u
    where v_q is null or coalesce(u.email, '') ilike '%' || v_q || '%' or u.id::text = v_q
  ), filtered as (
    select b.* from base b
    where v_f = '' or (v_f = 'admins' and b.is_admin) or (v_f = 'blocked' and b.blocked)
       or (v_f = 'paying' and exists (select 1 from public.payments p where p.owner = b.id and p.status = 'paid'))
  ), pagerows as (
    select * from filtered order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 25), 5000)) offset greatest(0, coalesce(p_offset, 0))
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((select jsonb_agg(r order by r.created_at desc) from (
      select pr.*,
        (select count(*) from public.invites i where i.owner = pr.id) as invites,
        (select count(*) from public.invites i where i.owner = pr.id and i.status = 'published') as live,
        coalesce((select sum(p.amount) from public.payments p where p.owner = pr.id and p.status = 'paid'), 0) as spent
      from pagerows pr
    ) r), '[]'::jsonb)
  ) into v_out;
  return v_out;
end;
$$;

create or replace function public.admin_customer(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_out jsonb;
begin
  perform public.admin_guard();
  select jsonb_build_object(
    'user', jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at, 'email_confirmed_at', u.email_confirmed_at,
      'provider', coalesce(u.raw_app_meta_data ->> 'provider', 'email')),
    'is_admin', exists (select 1 from public.admins a where a.user_id = u.id),
    'is_self', u.id = auth.uid(),
    'blocked', (select jsonb_build_object('reason', b.reason, 'blocked_at', b.blocked_at)
                from public.blocked_users b where b.user_id = u.id),
    'spent', coalesce((select sum(amount) from public.payments where owner = u.id and status = 'paid'), 0),
    'invites', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select i.id, i.slug, i.n1, i.n2, i.occ, i.design, i.status, i.date_text, i.created_at, i.published_at,
             (select count(*) from public.views v where v.invite_id = i.id) as views,
             (select count(*) from public.rsvps r where r.invite_id = i.id) as replies
      from public.invites i where i.owner = u.id
    ) x), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select p.order_id, p.payment_id, p.status, p.amount, p.design, p.created_at, p.paid_at, p.invite_id,
             coalesce(p.invite_title, '') as title
      from public.payments p where p.owner = u.id
    ) x), '[]'::jsonb)
  ) into v_out
  from auth.users u where u.id = p_user;
  return v_out;
end;
$$;

-- Invitations. p_status: '' (all), 'draft', 'published', 'suspended'.
create or replace function public.admin_invites(p_status text default '', p_search text default '', p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
  v_s text := coalesce(p_status, '');
  v_out jsonb;
begin
  perform public.admin_guard();
  with filtered as (
    select i.id, i.slug, i.n1, i.n2, i.occ, i.lang, i.design, i.status, i.date_text, i.venue,
           i.created_at, i.published_at, i.publish_source, i.paid_amount, i.offline_reason, i.owner,
           u.email
    from public.invites i left join auth.users u on u.id = i.owner
    where (v_s = '' or i.status = v_s)
      and (v_q is null or concat_ws(' ', i.n1, i.n2, i.slug, i.venue, i.design, u.email) ilike '%' || v_q || '%')
  ), pagerows as (
    select * from filtered order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 25), 5000)) offset greatest(0, coalesce(p_offset, 0))
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((select jsonb_agg(r order by r.created_at desc) from (
      select pr.*,
        (select count(*) from public.views v where v.invite_id = pr.id) as views,
        (select count(*) from public.rsvps r where r.invite_id = pr.id) as replies,
        coalesce((select sum(guests) from public.rsvps r where r.invite_id = pr.id and r.resp = 'yes'), 0) as coming
      from pagerows pr
    ) r), '[]'::jsonb)
  ) into v_out;
  return v_out;
end;
$$;

create or replace function public.admin_invite(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_out jsonb;
begin
  perform public.admin_guard();
  select jsonb_build_object(
    'invite', to_jsonb(i),
    'owner_email', (select email from auth.users where id = i.owner),
    'owner_blocked', exists (select 1 from public.blocked_users where user_id = i.owner),
    'views', (select count(*) from public.views where invite_id = i.id),
    'visitors', (select count(distinct visitor) from public.views where invite_id = i.id),
    'last_view', (select max(created_at) from public.views where invite_id = i.id),
    'rsvps', coalesce((select jsonb_agg(r order by r.updated_at desc) from (
      select name, resp, guests, note, updated_at from public.rsvps where invite_id = i.id
    ) r), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(p order by p.created_at desc) from (
      select order_id, payment_id, status, amount, design, created_at, paid_at, refunded_at
      from public.payments where invite_id = i.id
    ) p), '[]'::jsonb)
  ) into v_out
  from public.invites i where i.id = p_id;
  return v_out;
end;
$$;

-- p_action: 'publish' (go live without payment), 'suspend' (take offline), 'restore', 'draft'.
create or replace function public.admin_invite_action(p_id uuid, p_action text, p_reason text default '')
returns text language plpgsql security definer set search_path = public as $$
declare
  v public.invites%rowtype;
  v_hold boolean;
begin
  perform public.admin_guard();
  select * into v from public.invites where id = p_id for update;
  if not found then raise exception 'That invitation no longer exists.' using errcode = 'P0002'; end if;
  v_hold := exists (select 1 from public.blocked_users where user_id = v.owner);

  if p_action in ('publish', 'restore') then
    if v.status = 'published' then return v.status; end if;
    if v_hold then raise exception 'This customer is on hold. Lift the hold first.' using errcode = 'P0001'; end if;
    update public.invites
      set status = 'published', offline_reason = null, published_at = coalesce(published_at, now()),
          publish_source = coalesce(publish_source, 'admin')
      where id = p_id;
  elsif p_action = 'suspend' then
    if v.status <> 'published' then raise exception 'Only a live invitation can be taken offline.' using errcode = 'P0001'; end if;
    update public.invites set status = 'suspended', offline_reason = nullif(left(btrim(coalesce(p_reason, '')), 300), '')
      where id = p_id;
  elsif p_action = 'draft' then
    if v.status = 'draft' then return v.status; end if;
    update public.invites set status = 'draft', offline_reason = null, publish_source = null where id = p_id;
  else
    raise exception 'Unknown action.' using errcode = '22023';
  end if;

  perform public.admin_note('invite.' || p_action, concat_ws(' & ', v.n1, nullif(v.n2, '')) || ' (' || v.slug || ')',
    jsonb_build_object('invite_id', p_id, 'from', v.status, 'reason', nullif(btrim(coalesce(p_reason, '')), '')));
  return (select status from public.invites where id = p_id);
end;
$$;

-- Admin edit of an invitation's text and design. Missing keys stay as they are.
create or replace function public.admin_update_invite(p_id uuid, p_fields jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v public.invites%rowtype;
begin
  perform public.admin_guard();
  select * into v from public.invites where id = p_id for update;
  if not found then raise exception 'That invitation no longer exists.' using errcode = 'P0002'; end if;
  update public.invites set
    n1 = coalesce(nullif(btrim(p_fields ->> 'n1'), ''), n1),
    n2 = coalesce(p_fields ->> 'n2', n2),
    occ = coalesce(p_fields ->> 'occ', occ),
    lang = coalesce(p_fields ->> 'lang', lang),
    date_text = coalesce(p_fields ->> 'date_text', date_text),
    time_text = coalesce(p_fields ->> 'time_text', time_text),
    venue = coalesce(p_fields ->> 'venue', venue),
    msg = coalesce(p_fields ->> 'msg', msg),
    design = coalesce(p_fields ->> 'design', design)
  where id = p_id;
  perform public.admin_note('invite.edit', concat_ws(' & ', v.n1, nullif(v.n2, '')) || ' (' || v.slug || ')',
    jsonb_build_object('invite_id', p_id));
end;
$$;

create or replace function public.admin_delete_invite(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.invites%rowtype;
  v_title text;
begin
  perform public.admin_guard();
  select * into v from public.invites where id = p_id for update;
  if not found then return; end if;
  v_title := concat_ws(' & ', v.n1, nullif(v.n2, ''));
  update public.payments set invite_title = coalesce(invite_title, v_title) where invite_id = p_id;
  delete from public.invites where id = p_id;
  perform public.admin_note('invite.delete', v_title || ' (' || v.slug || ')',
    jsonb_build_object('invite_id', p_id, 'owner', (select email from auth.users where id = v.owner)));
end;
$$;

-- Put a customer on hold (their live invitations go offline) or lift the hold.
create or replace function public.admin_set_blocked(p_user uuid, p_blocked boolean, p_reason text default '')
returns int language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_n int := 0;
begin
  perform public.admin_guard();
  select email into v_email from auth.users where id = p_user;
  if not found then raise exception 'That customer no longer exists.' using errcode = 'P0002'; end if;
  if p_blocked then
    if p_user = auth.uid() then raise exception 'You cannot put your own account on hold.' using errcode = 'P0001'; end if;
    if exists (select 1 from public.admins where user_id = p_user) then
      raise exception 'Remove their admin access first.' using errcode = 'P0001';
    end if;
    insert into public.blocked_users (user_id, reason, blocked_by)
      values (p_user, left(btrim(coalesce(p_reason, '')), 300), auth.uid())
      on conflict (user_id) do update set reason = excluded.reason, blocked_at = now(), blocked_by = excluded.blocked_by;
    update public.invites set status = 'suspended', offline_reason = 'account on hold'
      where owner = p_user and status = 'published';
    get diagnostics v_n = row_count;
  else
    delete from public.blocked_users where user_id = p_user;
    update public.invites set status = 'published', offline_reason = null
      where owner = p_user and status = 'suspended' and offline_reason = 'account on hold';
    get diagnostics v_n = row_count;
  end if;
  perform public.admin_note(case when p_blocked then 'customer.hold' else 'customer.release' end, coalesce(v_email, p_user::text),
    jsonb_build_object('user_id', p_user, 'invitations', v_n, 'reason', nullif(btrim(coalesce(p_reason, '')), '')));
  return v_n;
end;
$$;

create or replace function public.admin_user_id(p_email text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  perform public.admin_guard();
  select id into v from auth.users where lower(email) = lower(btrim(coalesce(p_email, ''))) limit 1;
  return v;
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  perform public.admin_guard();
  select email into v_email from auth.users where id = p_user;
  if not found then raise exception 'That customer no longer exists.' using errcode = 'P0002'; end if;
  if p_admin then
    if exists (select 1 from public.blocked_users where user_id = p_user) then
      raise exception 'This customer is on hold. Lift the hold first.' using errcode = 'P0001';
    end if;
    insert into public.admins (user_id, added_by) values (p_user, auth.uid()) on conflict (user_id) do nothing;
  else
    if exists (select 1 from public.admins where user_id = p_user) and (select count(*) from public.admins) <= 1 then
      raise exception 'The site needs at least one admin.' using errcode = 'P0001';
    end if;
    delete from public.admins where user_id = p_user;
  end if;
  perform public.admin_note(case when p_admin then 'admin.add' else 'admin.remove' end, coalesce(v_email, p_user::text),
    jsonb_build_object('user_id', p_user));
end;
$$;

-- Deletes the account and everything it made. Orders stay, with the email kept on them.
create or replace function public.admin_delete_customer(p_user uuid, p_confirm text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  perform public.admin_guard();
  select email into v_email from auth.users where id = p_user;
  if not found then raise exception 'That customer no longer exists.' using errcode = 'P0002'; end if;
  if p_user = auth.uid() then raise exception 'You cannot delete your own account here.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.admins where user_id = p_user) then
    raise exception 'Remove their admin access first.' using errcode = 'P0001';
  end if;
  if lower(btrim(coalesce(p_confirm, ''))) <> lower(coalesce(v_email, 'delete')) then
    raise exception 'Type the customer''s email exactly to confirm.' using errcode = 'P0001';
  end if;
  update public.payments set customer_email = coalesce(customer_email, v_email) where owner = p_user;
  update public.payments p set invite_title = coalesce(p.invite_title, concat_ws(' & ', i.n1, nullif(i.n2, '')))
    from public.invites i where i.id = p.invite_id and i.owner = p_user;
  delete from auth.users where id = p_user;
  perform public.admin_note('customer.delete', coalesce(v_email, p_user::text), jsonb_build_object('user_id', p_user));
end;
$$;

-- Orders by hand. p_action 'paid': confirmed elsewhere (Razorpay check, cash, bank transfer);
-- 'refunded': money returned in the Razorpay dashboard. p_unpublish moves the invitation back to draft.
create or replace function public.admin_payment_action(p_order_id text, p_action text, p_payment_id text default null,
  p_note text default '', p_unpublish boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare p public.payments%rowtype;
begin
  perform public.admin_guard();
  select * into p from public.payments where order_id = p_order_id for update;
  if not found then raise exception 'That order no longer exists.' using errcode = 'P0002'; end if;
  if p_action = 'paid' then
    if p.status <> 'created' then raise exception 'Only an unpaid order can be marked as paid.' using errcode = 'P0001'; end if;
    update public.payments
      set status = 'paid', paid_at = now(),
          payment_id = coalesce(nullif(btrim(coalesce(p_payment_id, '')), ''), payment_id),
          note = left(coalesce(nullif(btrim(coalesce(p_note, '')), ''), note), 300)
      where id = p.id;
    perform public.publish_for_payment(p.id);
  elsif p_action = 'refunded' then
    if p.status <> 'paid' then raise exception 'Only a paid order can be marked as refunded.' using errcode = 'P0001'; end if;
    update public.payments
      set status = 'refunded', refunded_at = now(), note = left(coalesce(nullif(btrim(coalesce(p_note, '')), ''), note), 300)
      where id = p.id;
    if p_unpublish and p.invite_id is not null then
      update public.invites set status = 'draft', publish_source = null, offline_reason = null
        where id = p.invite_id and status in ('published', 'suspended');
    end if;
  else
    raise exception 'Unknown action.' using errcode = '22023';
  end if;
  perform public.admin_note('order.' || p_action, p_order_id,
    jsonb_build_object('amount', p.amount, 'unpublish', p_unpublish, 'note', nullif(btrim(coalesce(p_note, '')), '')));
  return (select status from public.payments where id = p.id);
end;
$$;

create or replace function public.admin_save_settings(p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_old jsonb;
begin
  perform public.admin_guard();
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Settings must be an object.' using errcode = '22023';
  end if;
  select data into v_old from public.site_settings where id = 1 for update;
  v_old := coalesce(v_old, '{}'::jsonb);
  insert into public.site_settings (id, data, updated_at, updated_by) values (1, p_data, now(), auth.uid())
    on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by;
  perform public.admin_note('settings.save', 'site settings', jsonb_build_object('changed', (
    select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from (
      select key as k from jsonb_each(p_data) where value is distinct from v_old -> key
      union
      select key from jsonb_each(v_old) where not (p_data ? key)
    ) c)));
end;
$$;

create or replace function public.admin_save_asset(p_name text, p_mime text, p_b64 text)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard();
  insert into public.site_assets (name, mime, data, updated_at) values (p_name, p_mime, decode(p_b64, 'base64'), now())
    on conflict (name) do update set mime = excluded.mime, data = excluded.data, updated_at = now();
  perform public.admin_note('asset.upload', p_name, jsonb_build_object('mime', p_mime));
  return (select extract(epoch from updated_at)::bigint from public.site_assets where name = p_name);
end;
$$;

create or replace function public.admin_delete_asset(p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard();
  delete from public.site_assets where name = p_name;
  perform public.admin_note('asset.delete', p_name, '{}'::jsonb);
end;
$$;

create or replace function public.admin_activity(p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_out jsonb;
begin
  perform public.admin_guard();
  select jsonb_build_object(
    'total', (select count(*) from public.admin_log),
    'rows', coalesce((select jsonb_agg(r order by r.created_at desc) from (
      select id, admin_email, action, target, details, created_at from public.admin_log
      order by created_at desc
      limit greatest(1, least(coalesce(p_limit, 50), 500)) offset greatest(0, coalesce(p_offset, 0))
    ) r), '[]'::jsonb)
  ) into v_out;
  return v_out;
end;
$$;

-- ================================================================ who may call what
-- Supabase grants new functions to anon and authenticated by default, so every grant here is explicit.

revoke all on function public.get_public_invite(text) from public, anon, authenticated;
revoke all on function public.submit_rsvp(text, text, text, int, text) from public, anon, authenticated;
revoke all on function public.record_view(text, text) from public, anon, authenticated;
revoke all on function public.site_asset(text) from public, anon, authenticated;
grant execute on function public.get_public_invite(text) to anon, authenticated;
grant execute on function public.submit_rsvp(text, text, text, int, text) to anon, authenticated;
grant execute on function public.record_view(text, text) to anon, authenticated;
grant execute on function public.site_asset(text) to anon, authenticated;

revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.is_blocked() from public, anon, authenticated;
revoke all on function public.my_account() from public, anon, authenticated;
revoke all on function public.publish_free(uuid) from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_blocked() to authenticated;
grant execute on function public.my_account() to authenticated;
grant execute on function public.publish_free(uuid) to authenticated;

-- Server only (service role).
revoke all on function public.confirm_payment(text, text, int) from public, anon, authenticated;
revoke all on function public.payment_refunded(text) from public, anon, authenticated;
revoke all on function public.publish_for_payment(uuid) from public, anon, authenticated;
grant execute on function public.confirm_payment(text, text, int) to service_role;
grant execute on function public.payment_refunded(text) to service_role;

-- Internal helpers: nobody calls these directly.
revoke all on function public.admin_guard() from public, anon, authenticated;
revoke all on function public.admin_note(text, text, jsonb) from public, anon, authenticated;

-- Admin functions: signed-in callers only, and each checks admin_guard() first.
revoke all on function public.admin_overview(int) from public, anon;
revoke all on function public.admin_orders(text, text, int, int) from public, anon;
revoke all on function public.admin_customers(text, text, int, int) from public, anon;
revoke all on function public.admin_customer(uuid) from public, anon;
revoke all on function public.admin_invites(text, text, int, int) from public, anon;
revoke all on function public.admin_invite(uuid) from public, anon;
revoke all on function public.admin_invite_action(uuid, text, text) from public, anon;
revoke all on function public.admin_update_invite(uuid, jsonb) from public, anon;
revoke all on function public.admin_delete_invite(uuid) from public, anon;
revoke all on function public.admin_set_blocked(uuid, boolean, text) from public, anon;
revoke all on function public.admin_user_id(text) from public, anon;
revoke all on function public.admin_set_role(uuid, boolean) from public, anon;
revoke all on function public.admin_delete_customer(uuid, text) from public, anon;
revoke all on function public.admin_payment_action(text, text, text, text, boolean) from public, anon;
revoke all on function public.admin_save_settings(jsonb) from public, anon;
revoke all on function public.admin_save_asset(text, text, text) from public, anon;
revoke all on function public.admin_delete_asset(text) from public, anon;
revoke all on function public.admin_activity(int, int) from public, anon;
grant execute on function public.admin_overview(int), public.admin_orders(text, text, int, int),
  public.admin_customers(text, text, int, int), public.admin_customer(uuid), public.admin_invites(text, text, int, int),
  public.admin_invite(uuid), public.admin_invite_action(uuid, text, text), public.admin_update_invite(uuid, jsonb),
  public.admin_delete_invite(uuid), public.admin_set_blocked(uuid, boolean, text), public.admin_user_id(text),
  public.admin_set_role(uuid, boolean), public.admin_delete_customer(uuid, text),
  public.admin_payment_action(text, text, text, text, boolean), public.admin_save_settings(jsonb),
  public.admin_save_asset(text, text, text), public.admin_delete_asset(text), public.admin_activity(int, int)
  to authenticated;

-- Make the API notice the changes straight away.
notify pgrst, 'reload schema';
