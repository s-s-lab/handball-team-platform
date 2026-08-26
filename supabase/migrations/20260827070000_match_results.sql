alter table public.matches
  add column competition_name text
    check (competition_name is null or char_length(competition_name) <= 120),
  add column completed_at timestamptz,
  add column result_source text not null default 'console'
    check (result_source in ('console', 'manual'));

create index matches_team_result_history_idx
  on public.matches(team_id, status, scheduled_at desc);

create or replace function private.create_manual_match_result_internal(
  p_team_id uuid,
  p_name text,
  p_competition_name text,
  p_opponent_name text,
  p_team_side public.team_side,
  p_scheduled_at timestamptz,
  p_venue text,
  p_memo text,
  p_is_public boolean,
  p_team_score integer,
  p_opponent_score integer
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_match_id uuid;
  v_home_score integer;
  v_away_score integer;
begin
  if auth.uid() is null or not private.is_team_admin(p_team_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_team_score < 0 or p_team_score > 199
     or p_opponent_score < 0 or p_opponent_score > 199 then
    raise exception 'Score out of range' using errcode = '22023';
  end if;

  if p_team_side = 'home' then
    v_home_score := p_team_score;
    v_away_score := p_opponent_score;
  else
    v_home_score := p_opponent_score;
    v_away_score := p_team_score;
  end if;

  insert into public.matches (
    team_id,
    name,
    competition_name,
    opponent_name,
    team_side,
    scheduled_at,
    venue,
    memo,
    status,
    is_public,
    completed_at,
    result_source
  ) values (
    p_team_id,
    btrim(p_name),
    nullif(btrim(p_competition_name), ''),
    btrim(p_opponent_name),
    p_team_side,
    p_scheduled_at,
    nullif(btrim(p_venue), ''),
    nullif(btrim(p_memo), ''),
    'finished',
    p_is_public,
    p_scheduled_at,
    'manual'
  )
  returning id into v_match_id;

  insert into public.match_rules (
    match_id,
    period_count,
    period_seconds,
    halftime_seconds,
    overtime_enabled,
    overtime_period_count,
    overtime_period_seconds,
    team_timeouts_per_game,
    team_timeouts_per_period,
    team_timeout_seconds
  ) values (
    v_match_id,
    2,
    1800,
    600,
    false,
    2,
    300,
    2,
    1,
    60
  );

  update public.match_state
  set
    home_score = v_home_score,
    away_score = v_away_score,
    clock_running = false,
    clock_started_at = null,
    updated_at = now()
  where match_id = v_match_id;

  return v_match_id;
end;
$$;

create or replace function public.create_manual_match_result(
  p_team_id uuid,
  p_name text,
  p_competition_name text,
  p_opponent_name text,
  p_team_side public.team_side,
  p_scheduled_at timestamptz,
  p_venue text,
  p_memo text,
  p_is_public boolean,
  p_team_score integer,
  p_opponent_score integer
)
returns uuid
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.create_manual_match_result_internal(
    p_team_id,
    p_name,
    p_competition_name,
    p_opponent_name,
    p_team_side,
    p_scheduled_at,
    p_venue,
    p_memo,
    p_is_public,
    p_team_score,
    p_opponent_score
  );
$$;

revoke all on function private.create_manual_match_result_internal(
  uuid, text, text, text, public.team_side, timestamptz, text, text, boolean, integer, integer
) from public;
revoke all on function private.create_manual_match_result_internal(
  uuid, text, text, text, public.team_side, timestamptz, text, text, boolean, integer, integer
) from anon;
grant execute on function private.create_manual_match_result_internal(
  uuid, text, text, text, public.team_side, timestamptz, text, text, boolean, integer, integer
) to authenticated;

revoke all on function public.create_manual_match_result(
  uuid, text, text, text, public.team_side, timestamptz, text, text, boolean, integer, integer
) from public;
revoke all on function public.create_manual_match_result(
  uuid, text, text, text, public.team_side, timestamptz, text, text, boolean, integer, integer
) from anon;
grant execute on function public.create_manual_match_result(
  uuid, text, text, text, public.team_side, timestamptz, text, text, boolean, integer, integer
) to authenticated;
