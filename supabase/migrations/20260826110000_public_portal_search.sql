-- Phase 6: public portal match feed + public team search.
-- Reuse existing Phase 5 RLS and narrow anon column grants.

create or replace function public.get_public_portal_matches()
returns table (
  match_id uuid,
  match_name text,
  team_id uuid,
  team_name text,
  team_slug text,
  team_short_name text,
  opponent_name text,
  team_side public.team_side,
  scheduled_at timestamptz,
  venue text,
  status public.match_status,
  home_score integer,
  away_score integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with live_matches as (
    select
      m.id,
      m.name,
      m.team_id,
      m.opponent_name,
      m.team_side,
      m.scheduled_at,
      m.venue,
      m.status,
      s.home_score,
      s.away_score
    from public.matches m
    join public.match_state s on s.match_id = m.id
    where m.status = 'live'
  ),
  scheduled_matches as (
    select
      m.id,
      m.name,
      m.team_id,
      m.opponent_name,
      m.team_side,
      m.scheduled_at,
      m.venue,
      m.status,
      s.home_score,
      s.away_score
    from public.matches m
    join public.match_state s on s.match_id = m.id
    where m.status = 'scheduled'
    order by m.scheduled_at asc
    limit 10
  ),
  finished_matches as (
    select
      m.id,
      m.name,
      m.team_id,
      m.opponent_name,
      m.team_side,
      m.scheduled_at,
      m.venue,
      m.status,
      s.home_score,
      s.away_score
    from public.matches m
    join public.match_state s on s.match_id = m.id
    where m.status = 'finished'
    order by m.scheduled_at desc
    limit 10
  ),
  portal_matches as (
    select * from live_matches
    union all
    select * from scheduled_matches
    union all
    select * from finished_matches
  )
  select
    pm.id,
    pm.name,
    t.id,
    t.name,
    t.slug,
    t.short_name,
    pm.opponent_name,
    pm.team_side,
    pm.scheduled_at,
    pm.venue,
    pm.status,
    pm.home_score,
    pm.away_score
  from portal_matches pm
  join public.teams t on t.id = pm.team_id
  order by
    case pm.status
      when 'live' then 0
      when 'scheduled' then 1
      else 2
    end,
    case when pm.status = 'finished' then null else pm.scheduled_at end asc nulls last,
    case when pm.status = 'finished' then pm.scheduled_at end desc nulls last;
$$;

create or replace function public.search_public_teams(p_query text)
returns table (
  id uuid,
  name text,
  slug text,
  short_name text,
  description text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with input as (
    select lower(btrim(coalesce(p_query, ''))) as q
  )
  select
    t.id,
    t.name,
    t.slug,
    t.short_name,
    t.description
  from public.teams t
  cross join input
  where input.q <> ''
    and (
      lower(t.name) like '%' || input.q || '%'
      or lower(coalesce(t.short_name, '')) like '%' || input.q || '%'
    )
  order by
    case
      when lower(t.name) = input.q then 0
      when lower(coalesce(t.short_name, '')) = input.q then 1
      when lower(t.name) like input.q || '%' then 2
      when lower(coalesce(t.short_name, '')) like input.q || '%' then 3
      else 4
    end,
    t.name asc
  limit 20;
$$;

revoke all on function public.get_public_portal_matches() from public;
revoke all on function public.get_public_portal_matches() from authenticated;
grant execute on function public.get_public_portal_matches() to anon;

revoke all on function public.search_public_teams(text) from public;
revoke all on function public.search_public_teams(text) from authenticated;
grant execute on function public.search_public_teams(text) to anon;
