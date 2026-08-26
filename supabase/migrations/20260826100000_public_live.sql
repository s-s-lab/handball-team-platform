-- Phase 5: anonymous public LIVE reads + Realtime invalidation broadcasts.
-- Public visibility always requires both a public team and a public match.

-- Public match rows: rely on the existing teams_select_public RLS policy rather
-- than granting anon access to teams.is_public.
create policy matches_select_public_live
on public.matches for select
to anon
using (
  is_public = true
  and exists (
    select 1
    from public.teams t
    where t.id = matches.team_id
  )
);

-- Child tables inherit visibility from the parent match. The subquery itself is
-- filtered by matches_select_public_live, so hidden team/match combinations do
-- not expose rules or state.
create policy match_rules_select_public_live
on public.match_rules for select
to anon
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_rules.match_id
  )
);

create policy match_state_select_public_live
on public.match_state for select
to anon
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_state.match_id
  )
);

-- Column-level grants are intentionally narrow. Do not expose matches.memo,
-- is_public flags, match_events, roster snapshots, user ids, or scorer ids.
revoke all on table public.matches from anon;
revoke all on table public.match_rules from anon;
revoke all on table public.match_state from anon;
revoke all on table public.match_events from anon;

grant select (
  id,
  team_id,
  name,
  opponent_name,
  team_side,
  scheduled_at,
  venue,
  status
) on public.matches to anon;

grant select (
  match_id,
  period_count,
  period_seconds,
  overtime_enabled,
  overtime_period_count,
  overtime_period_seconds
) on public.match_rules to anon;

grant select (
  match_id,
  version,
  current_period,
  clock_elapsed_ms,
  clock_running,
  clock_started_at,
  home_score,
  away_score,
  updated_at
) on public.match_state to anon;

-- Return one sanitized authoritative public snapshot. SECURITY INVOKER ensures
-- all table RLS and column grants above still apply to the caller.
create or replace function public.get_public_live_match(p_match_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'match_id', m.id,
    'match_name', m.name,
    'team_id', t.id,
    'team_name', t.name,
    'team_short_name', t.short_name,
    'opponent_name', m.opponent_name,
    'team_side', m.team_side,
    'scheduled_at', m.scheduled_at,
    'venue', m.venue,
    'status', m.status,
    'server_now', clock_timestamp(),
    'rules', jsonb_build_object(
      'period_count', r.period_count,
      'period_seconds', r.period_seconds,
      'overtime_enabled', r.overtime_enabled,
      'overtime_period_count', r.overtime_period_count,
      'overtime_period_seconds', r.overtime_period_seconds
    ),
    'state', jsonb_build_object(
      'version', s.version,
      'current_period', s.current_period,
      'clock_elapsed_ms', s.clock_elapsed_ms,
      'clock_running', s.clock_running,
      'clock_started_at', s.clock_started_at,
      'home_score', s.home_score,
      'away_score', s.away_score
    )
  )
  from public.matches m
  join public.teams t on t.id = m.team_id
  join public.match_rules r on r.match_id = m.id
  join public.match_state s on s.match_id = m.id
  where m.id = p_match_id
  limit 1;
$$;

-- Public team match summaries are a discoverability bridge for /teams/[slug].
create or replace function public.get_public_team_matches(p_team_id uuid)
returns table (
  match_id uuid,
  match_name text,
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
  select
    m.id,
    m.name,
    m.opponent_name,
    m.team_side,
    m.scheduled_at,
    m.venue,
    m.status,
    s.home_score,
    s.away_score
  from public.matches m
  join public.match_state s on s.match_id = m.id
  where m.team_id = p_team_id
  order by
    case m.status
      when 'live' then 0
      when 'scheduled' then 1
      when 'finished' then 2
      else 3
    end,
    case when m.status = 'finished' then null else m.scheduled_at end asc nulls last,
    case when m.status = 'finished' then m.scheduled_at end desc nulls last;
$$;

revoke all on function public.get_public_live_match(uuid) from public;
revoke all on function public.get_public_live_match(uuid) from authenticated;
grant execute on function public.get_public_live_match(uuid) to anon;

revoke all on function public.get_public_team_matches(uuid) from public;
revoke all on function public.get_public_team_matches(uuid) from authenticated;
grant execute on function public.get_public_team_matches(uuid) to anon;

-- Broadcast only an invalidation marker. The authoritative public score/timer is
-- always refetched through get_public_live_match().
create or replace function private.broadcast_public_match_state()
returns trigger
language plpgsql
security definer
set search_path = public, private, realtime, pg_temp
as $$
begin
  if exists (
    select 1
    from public.matches m
    join public.teams t on t.id = m.team_id
    where m.id = new.match_id
      and m.is_public = true
      and t.is_public = true
  ) then
    perform realtime.send(
      jsonb_build_object(
        'match_id', new.match_id,
        'version', new.version
      ),
      'state_changed',
      'match:' || new.match_id::text || ':live',
      false
    );
  end if;

  return new;
end;
$$;

revoke all on function private.broadcast_public_match_state() from public;
revoke all on function private.broadcast_public_match_state() from anon;
revoke all on function private.broadcast_public_match_state() from authenticated;

drop trigger if exists match_state_broadcast_public_live on public.match_state;
create trigger match_state_broadcast_public_live
after insert or update on public.match_state
for each row execute function private.broadcast_public_match_state();
