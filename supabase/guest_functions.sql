-- Nimantran guest functions. Run once in the Supabase SQL editor, after schema.sql.
-- Guests (signed out) use these three functions instead of touching tables.
-- The tables stay locked by row level security; the functions validate input
-- and run with the table owner's rights. No secret key is needed anywhere.

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
    where slug = p_slug and p_slug ~ '^[a-z0-9]{4,32}$'
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

  select id into v_id from public.invites where slug = p_slug;
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

  select id, owner into v_id, v_owner from public.invites where slug = p_slug;
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

revoke all on function public.get_public_invite(text) from public;
revoke all on function public.submit_rsvp(text, text, text, int, text) from public;
revoke all on function public.record_view(text, text) from public;
grant execute on function public.get_public_invite(text) to anon, authenticated;
grant execute on function public.submit_rsvp(text, text, text, int, text) to anon, authenticated;
grant execute on function public.record_view(text, text) to anon, authenticated;
