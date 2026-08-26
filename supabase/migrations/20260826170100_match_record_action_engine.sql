drop index if exists public.match_events_goal_revert_once_idx;
create unique index if not exists match_events_revert_once_idx
  on public.match_events(related_event_id)
  where event_type in ('goal_reverted', 'event_reverted') and related_event_id is not null;

create or replace function private.build_match_console_snapshot(
  p_match_id uuid,
  p_server_now timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_state public.match_state%rowtype;
  v_status public.match_status;
  v_duration_ms bigint;
begin
  if auth.uid() is null or not private.can_manage_match(p_match_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select s.* into v_state
  from public.match_state s
  where s.match_id = p_match_id;

  if not found then
    raise exception 'Match state not found' using errcode = 'P0002';
  end if;

  select m.status into v_status
  from public.matches m
  where m.id = p_match_id;

  v_duration_ms := private.match_period_duration_ms(p_match_id, v_state.current_period);

  return jsonb_build_object(
    'match_id', v_state.match_id,
    'version', v_state.version,
    'current_period', v_state.current_period,
    'clock_elapsed_ms', v_state.clock_elapsed_ms,
    'competition_elapsed_ms', v_state.competition_elapsed_ms,
    'clock_running', v_state.clock_running,
    'clock_started_at', v_state.clock_started_at,
    'home_score', v_state.home_score,
    'away_score', v_state.away_score,
    'match_status', v_status,
    'period_duration_ms', v_duration_ms,
    'server_now', p_server_now
  );
end;
$$;

create or replace function private.apply_match_action_internal(
  p_match_id uuid,
  p_client_action_id uuid,
  p_expected_version bigint,
  p_action text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_state public.match_state%rowtype;
  v_status public.match_status;
  v_now timestamptz := clock_timestamp();
  v_duration_ms bigint;
  v_effective_period_ms bigint;
  v_effective_competition_ms bigint;
  v_running_increment_ms bigint := 0;
  v_new_version bigint;
  v_event_type public.match_event_type;
  v_event_payload jsonb := '{}'::jsonb;
  v_related_event_id uuid;
  v_event_period integer;
  v_event_period_elapsed_ms bigint;
  v_event_competition_elapsed_ms bigint;
  v_target_period integer;
  v_period_count integer;
  v_overtime_enabled boolean;
  v_overtime_period_count integer;
  v_max_period integer;
  v_side text;
  v_managed_side public.team_side;
  v_subject_side public.team_side;
  v_subject_match_roster_id uuid;
  v_subject_team_member_id uuid;
  v_subject_kind text;
  v_subject_shirt_number integer;
  v_subject_display_name text;
  v_scorer_team_member_id uuid;
  v_goal_method text;
  v_target_event public.match_events%rowtype;
  v_goal_id uuid;
  v_goal_side text;
  v_suspension_count integer;
  v_warning_count integer;
  v_team_warning_count integer;
  v_team_suspension_count integer;
  v_tto_game_limit integer;
  v_tto_period_limit integer;
  v_tto_game_count integer;
  v_tto_period_count integer;
  v_report_required boolean;
  v_reason text;
begin
  if auth.uid() is null or not private.can_manage_match(p_match_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.match_events e
    where e.match_id = p_match_id
      and e.client_action_id = p_client_action_id
  ) then
    return private.build_match_console_snapshot(p_match_id, v_now);
  end if;

  select s.* into v_state
  from public.match_state s
  where s.match_id = p_match_id
  for update;

  if not found then
    raise exception 'Match state not found' using errcode = 'P0002';
  end if;

  if v_state.version <> p_expected_version then
    raise exception 'State version conflict' using errcode = '40001';
  end if;

  select m.status, m.team_side
  into v_status, v_managed_side
  from public.matches m
  where m.id = p_match_id;

  if v_status in ('finished', 'cancelled') then
    raise exception 'Match is not mutable' using errcode = '22023';
  end if;

  v_duration_ms := private.match_period_duration_ms(p_match_id, v_state.current_period);
  v_effective_period_ms := v_state.clock_elapsed_ms;
  v_effective_competition_ms := v_state.competition_elapsed_ms;

  if v_state.clock_running and v_state.clock_started_at is not null then
    v_running_increment_ms := least(
      greatest(0, v_duration_ms - v_state.clock_elapsed_ms),
      greatest(0, floor(extract(epoch from (v_now - v_state.clock_started_at)) * 1000)::bigint)
    );
    v_effective_period_ms := v_state.clock_elapsed_ms + v_running_increment_ms;
    v_effective_competition_ms := v_state.competition_elapsed_ms + v_running_increment_ms;
  end if;

  v_event_period := v_state.current_period;
  v_event_period_elapsed_ms := v_effective_period_ms;
  v_event_competition_elapsed_ms := v_effective_competition_ms;

  -- Resolve the optional event side first.
  v_side := nullif(p_payload->>'side', '');
  if v_side is not null then
    if v_side not in ('home', 'away') then
      raise exception 'Invalid side' using errcode = '22023';
    end if;
    v_subject_side := v_side::public.team_side;
  end if;

  -- Resolve a managed-team MatchRoster subject. A legacy scorer_team_member_id
  -- remains accepted for backward compatibility with the Phase 4 console.
  if nullif(p_payload->>'subject_match_roster_id', '') is not null then
    begin
      v_subject_match_roster_id := (p_payload->>'subject_match_roster_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid participant' using errcode = '22023';
    end;

    select
      mr.team_member_id,
      mr.kind::text,
      mr.shirt_number_snapshot,
      coalesce(nullif(btrim(mr.display_name_snapshot), ''), mr.full_name_snapshot)
    into
      v_subject_team_member_id,
      v_subject_kind,
      v_subject_shirt_number,
      v_subject_display_name
    from public.match_rosters mr
    where mr.id = v_subject_match_roster_id
      and mr.match_id = p_match_id;

    if not found then
      raise exception 'Participant is not in this match roster' using errcode = '22023';
    end if;

    if v_subject_side is null then
      v_subject_side := v_managed_side;
    elsif v_subject_side <> v_managed_side then
      raise exception 'Managed roster participant has invalid side' using errcode = '22023';
    end if;
  elsif nullif(p_payload->>'scorer_team_member_id', '') is not null then
    begin
      v_scorer_team_member_id := (p_payload->>'scorer_team_member_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid scorer' using errcode = '22023';
    end;

    select
      mr.id,
      mr.team_member_id,
      mr.kind::text,
      mr.shirt_number_snapshot,
      coalesce(nullif(btrim(mr.display_name_snapshot), ''), mr.full_name_snapshot)
    into
      v_subject_match_roster_id,
      v_subject_team_member_id,
      v_subject_kind,
      v_subject_shirt_number,
      v_subject_display_name
    from public.match_rosters mr
    where mr.match_id = p_match_id
      and mr.team_member_id = v_scorer_team_member_id
      and mr.kind = 'player'
    limit 1;

    if not found then
      raise exception 'Invalid scorer' using errcode = '22023';
    end if;
    v_subject_side := v_managed_side;
  else
    if nullif(p_payload->>'shirt_number', '') is not null then
      if (p_payload->>'shirt_number') !~ '^\d{1,2}$' then
        raise exception 'Invalid shirt number' using errcode = '22023';
      end if;
      v_subject_shirt_number := (p_payload->>'shirt_number')::integer;
      if v_subject_shirt_number < 0 or v_subject_shirt_number > 99 then
        raise exception 'Invalid shirt number' using errcode = '22023';
      end if;
    end if;
    v_subject_display_name := nullif(btrim(p_payload->>'display_name'), '');
    v_subject_kind := coalesce(nullif(p_payload->>'subject_kind', ''), 'player');
    if v_subject_kind not in ('player', 'staff') then
      raise exception 'Invalid participant kind' using errcode = '22023';
    end if;
  end if;

  case p_action
    when 'start_clock' then
      if v_state.clock_running then
        raise exception 'Clock is already running' using errcode = '22023';
      end if;
      if v_effective_period_ms >= v_duration_ms then
        raise exception 'Period clock has ended' using errcode = '22023';
      end if;

      v_state.clock_running := true;
      v_state.clock_started_at := v_now;
      v_event_type := 'clock_started';
      v_event_payload := jsonb_build_object(
        'period', v_state.current_period,
        'elapsed_ms', v_effective_period_ms
      );

      if v_status = 'scheduled' then
        update public.matches set status = 'live' where id = p_match_id;
        v_status := 'live';
      end if;

    when 'stop_clock' then
      if not v_state.clock_running then
        raise exception 'Clock is already stopped' using errcode = '22023';
      end if;

      v_state.clock_running := false;
      v_state.clock_started_at := null;
      v_state.clock_elapsed_ms := v_effective_period_ms;
      v_state.competition_elapsed_ms := v_effective_competition_ms;
      v_event_type := 'clock_stopped';
      v_event_payload := jsonb_build_object(
        'period', v_state.current_period,
        'elapsed_ms', v_effective_period_ms
      );

    when 'reset_clock' then
      v_event_period_elapsed_ms := v_effective_period_ms;
      v_event_competition_elapsed_ms := v_effective_competition_ms;
      v_state.clock_running := false;
      v_state.clock_started_at := null;
      v_state.clock_elapsed_ms := 0;
      v_state.competition_elapsed_ms := greatest(0, v_effective_competition_ms - v_effective_period_ms);
      v_event_type := 'clock_reset';
      v_event_payload := jsonb_build_object(
        'period', v_state.current_period,
        'previous_elapsed_ms', v_effective_period_ms
      );

    when 'set_period' then
      if coalesce(p_payload->>'period', '') !~ '^\d+$' then
        raise exception 'Invalid period' using errcode = '22023';
      end if;
      v_target_period := (p_payload->>'period')::integer;

      select r.period_count, r.overtime_enabled, r.overtime_period_count
      into v_period_count, v_overtime_enabled, v_overtime_period_count
      from public.match_rules r
      where r.match_id = p_match_id;

      v_max_period := v_period_count + case when v_overtime_enabled then v_overtime_period_count else 0 end;
      if v_target_period < 1 or v_target_period > v_max_period then
        raise exception 'Invalid period' using errcode = '22023';
      end if;

      v_event_payload := jsonb_build_object(
        'previous_period', v_state.current_period,
        'period', v_target_period
      );
      v_state.current_period := v_target_period;
      v_state.clock_running := false;
      v_state.clock_started_at := null;
      v_state.clock_elapsed_ms := 0;
      v_state.competition_elapsed_ms := v_effective_competition_ms;
      v_event_type := 'period_changed';

    when 'goal' then
      if v_subject_side is null then
        raise exception 'Goal side is required' using errcode = '22023';
      end if;
      if v_subject_match_roster_id is not null and v_subject_kind <> 'player' then
        raise exception 'Scorer must be a player' using errcode = '22023';
      end if;

      v_goal_method := coalesce(nullif(p_payload->>'goal_method', ''), 'open_play');
      if v_goal_method not in ('open_play', 'seven_meter') then
        raise exception 'Invalid goal method' using errcode = '22023';
      end if;

      if v_subject_side = 'home' then
        v_state.home_score := v_state.home_score + 1;
      else
        v_state.away_score := v_state.away_score + 1;
      end if;

      v_event_type := 'goal';
      v_event_payload := jsonb_strip_nulls(jsonb_build_object(
        'side', v_subject_side,
        'goal_method', v_goal_method,
        'scorer_team_member_id', v_subject_team_member_id,
        'shirt_number', v_subject_shirt_number,
        'display_name', v_subject_display_name,
        'subject_kind', v_subject_kind
      ));

    when 'seven_meter_missed' then
      if v_subject_side is null then
        raise exception '7 m side is required' using errcode = '22023';
      end if;
      if v_subject_match_roster_id is not null and v_subject_kind <> 'player' then
        raise exception '7 m shooter must be a player' using errcode = '22023';
      end if;
      v_event_type := 'seven_meter_missed';
      v_event_payload := jsonb_strip_nulls(jsonb_build_object(
        'side', v_subject_side,
        'shirt_number', v_subject_shirt_number,
        'display_name', v_subject_display_name,
        'subject_kind', v_subject_kind
      ));

    when 'warning' then
      if v_subject_side is null then
        raise exception 'Warning side is required' using errcode = '22023';
      end if;
      if v_subject_side = v_managed_side and v_subject_match_roster_id is null then
        raise exception 'Managed-team warning requires a match-roster participant' using errcode = '22023';
      end if;
      if v_subject_match_roster_id is null and v_subject_shirt_number is null and v_subject_display_name is null then
        raise exception 'Warning participant is required' using errcode = '22023';
      end if;

      select count(*) into v_warning_count
      from public.match_events e
      where e.match_id = p_match_id
        and e.event_type = 'warning'
        and not exists (
          select 1 from public.match_events rev
          where rev.match_id = p_match_id
            and rev.related_event_id = e.id
            and rev.event_type in ('goal_reverted', 'event_reverted')
        )
        and (
          (v_subject_match_roster_id is not null and e.subject_match_roster_id = v_subject_match_roster_id)
          or (
            v_subject_match_roster_id is null
            and e.subject_side = v_subject_side
            and coalesce(e.payload->>'shirt_number', '') = coalesce(v_subject_shirt_number::text, '')
            and coalesce(e.payload->>'display_name', '') = coalesce(v_subject_display_name, '')
          )
        );
      if v_warning_count > 0 then
        raise exception 'Participant has already been warned' using errcode = '22023';
      end if;

      if exists (
        select 1 from public.match_events e
        where e.match_id = p_match_id
          and e.event_type in ('suspension', 'disqualification')
          and not exists (
            select 1 from public.match_events rev
            where rev.match_id = p_match_id
              and rev.related_event_id = e.id
              and rev.event_type in ('goal_reverted', 'event_reverted')
          )
          and (
            (v_subject_match_roster_id is not null and e.subject_match_roster_id = v_subject_match_roster_id)
            or (
              v_subject_match_roster_id is null
              and e.subject_side = v_subject_side
              and coalesce(e.payload->>'shirt_number', '') = coalesce(v_subject_shirt_number::text, '')
              and coalesce(e.payload->>'display_name', '') = coalesce(v_subject_display_name, '')
            )
          )
      ) then
        raise exception 'Warning cannot follow suspension or disqualification' using errcode = '22023';
      end if;

      select count(*) into v_team_warning_count
      from public.match_events e
      where e.match_id = p_match_id
        and e.event_type = 'warning'
        and e.subject_side = v_subject_side
        and coalesce(e.payload->>'subject_kind', 'player') = v_subject_kind
        and not exists (
          select 1 from public.match_events rev
          where rev.match_id = p_match_id
            and rev.related_event_id = e.id
            and rev.event_type in ('goal_reverted', 'event_reverted')
        );

      if v_subject_kind = 'player' and v_team_warning_count >= 3 then
        raise exception 'Player warning limit has been reached' using errcode = '22023';
      end if;
      if v_subject_kind = 'staff' and v_team_warning_count >= 1 then
        raise exception 'Team-official warning limit has been reached' using errcode = '22023';
      end if;

      v_event_type := 'warning';
      v_event_payload := jsonb_strip_nulls(jsonb_build_object(
        'side', v_subject_side,
        'shirt_number', v_subject_shirt_number,
        'display_name', v_subject_display_name,
        'subject_kind', v_subject_kind
      ));

    when 'suspension' then
      if v_subject_side is null then
        raise exception 'Suspension side is required' using errcode = '22023';
      end if;
      if v_subject_side = v_managed_side and v_subject_match_roster_id is null then
        raise exception 'Managed-team suspension requires a match-roster participant' using errcode = '22023';
      end if;
      if v_subject_match_roster_id is null and v_subject_shirt_number is null and v_subject_display_name is null then
        raise exception 'Suspension participant is required' using errcode = '22023';
      end if;

      if exists (
        select 1 from public.match_events e
        where e.match_id = p_match_id
          and e.event_type = 'disqualification'
          and not exists (
            select 1 from public.match_events rev
            where rev.match_id = p_match_id
              and rev.related_event_id = e.id
              and rev.event_type in ('goal_reverted', 'event_reverted')
          )
          and (
            (v_subject_match_roster_id is not null and e.subject_match_roster_id = v_subject_match_roster_id)
            or (
              v_subject_match_roster_id is null
              and e.subject_side = v_subject_side
              and coalesce(e.payload->>'shirt_number', '') = coalesce(v_subject_shirt_number::text, '')
              and coalesce(e.payload->>'display_name', '') = coalesce(v_subject_display_name, '')
            )
          )
      ) then
        raise exception 'Disqualified participant cannot receive another suspension' using errcode = '22023';
      end if;

      if v_subject_kind = 'player' then
        select count(*) into v_suspension_count
        from public.match_events e
        where e.match_id = p_match_id
          and e.event_type = 'suspension'
          and not exists (
            select 1 from public.match_events rev
            where rev.match_id = p_match_id
              and rev.related_event_id = e.id
              and rev.event_type in ('goal_reverted', 'event_reverted')
          )
          and (
            (v_subject_match_roster_id is not null and e.subject_match_roster_id = v_subject_match_roster_id)
            or (
              v_subject_match_roster_id is null
              and e.subject_side = v_subject_side
              and coalesce(e.payload->>'shirt_number', '') = coalesce(v_subject_shirt_number::text, '')
              and coalesce(e.payload->>'display_name', '') = coalesce(v_subject_display_name, '')
            )
          );
        v_suspension_count := v_suspension_count + 1;
        if v_suspension_count > 3 then
          raise exception 'Participant already has three suspensions' using errcode = '22023';
        end if;
      else
        select count(*) into v_team_suspension_count
        from public.match_events e
        where e.match_id = p_match_id
          and e.event_type = 'suspension'
          and e.subject_side = v_subject_side
          and coalesce(e.payload->>'subject_kind', 'player') = 'staff'
          and not exists (
            select 1 from public.match_events rev
            where rev.match_id = p_match_id
              and rev.related_event_id = e.id
              and rev.event_type in ('goal_reverted', 'event_reverted')
          );
        if v_team_suspension_count >= 1 then
          raise exception 'Team-official suspension limit has been reached' using errcode = '22023';
        end if;
        v_suspension_count := 1;
      end if;

      -- Rule 2:8: a timeout is mandatory for a 2-minute suspension. Materialize
      -- the authoritative competition clock and stop it in this same action.
      v_state.clock_running := false;
      v_state.clock_started_at := null;
      v_state.clock_elapsed_ms := v_effective_period_ms;
      v_state.competition_elapsed_ms := v_effective_competition_ms;

      v_event_type := 'suspension';
      v_event_payload := jsonb_strip_nulls(jsonb_build_object(
        'side', v_subject_side,
        'shirt_number', v_subject_shirt_number,
        'display_name', v_subject_display_name,
        'subject_kind', v_subject_kind,
        'suspension_count', v_suspension_count,
        'starts_at_competition_elapsed_ms', v_effective_competition_ms,
        'expires_at_competition_elapsed_ms', v_effective_competition_ms + 120000,
        'resulting_disqualification', (v_subject_kind = 'player' and v_suspension_count = 3)
      ));

    when 'disqualification' then
      if v_subject_side is null then
        raise exception 'Disqualification side is required' using errcode = '22023';
      end if;
      if v_subject_side = v_managed_side and v_subject_match_roster_id is null then
        raise exception 'Managed-team disqualification requires a match-roster participant' using errcode = '22023';
      end if;
      if v_subject_match_roster_id is null and v_subject_shirt_number is null and v_subject_display_name is null then
        raise exception 'Disqualification participant is required' using errcode = '22023';
      end if;
      if exists (
        select 1 from public.match_events e
        where e.match_id = p_match_id
          and e.event_type = 'disqualification'
          and not exists (
            select 1 from public.match_events rev
            where rev.match_id = p_match_id
              and rev.related_event_id = e.id
              and rev.event_type in ('goal_reverted', 'event_reverted')
          )
          and (
            (v_subject_match_roster_id is not null and e.subject_match_roster_id = v_subject_match_roster_id)
            or (
              v_subject_match_roster_id is null
              and e.subject_side = v_subject_side
              and coalesce(e.payload->>'shirt_number', '') = coalesce(v_subject_shirt_number::text, '')
              and coalesce(e.payload->>'display_name', '') = coalesce(v_subject_display_name, '')
            )
          )
      ) then
        raise exception 'Participant is already disqualified' using errcode = '22023';
      end if;

      v_report_required := lower(coalesce(p_payload->>'report_required', 'false')) in ('true', '1', 'on', 'yes');
      v_state.clock_running := false;
      v_state.clock_started_at := null;
      v_state.clock_elapsed_ms := v_effective_period_ms;
      v_state.competition_elapsed_ms := v_effective_competition_ms;

      v_event_type := 'disqualification';
      v_event_payload := jsonb_strip_nulls(jsonb_build_object(
        'side', v_subject_side,
        'shirt_number', v_subject_shirt_number,
        'display_name', v_subject_display_name,
        'subject_kind', v_subject_kind,
        'report_required', v_report_required,
        'team_reduction_starts_at_competition_elapsed_ms', v_effective_competition_ms,
        'team_reduction_expires_at_competition_elapsed_ms', v_effective_competition_ms + 120000
      ));

    when 'team_timeout' then
      if v_subject_side is null then
        raise exception 'Team-timeout side is required' using errcode = '22023';
      end if;

      select
        r.period_count,
        r.team_timeouts_per_game,
        r.team_timeouts_per_period
      into
        v_period_count,
        v_tto_game_limit,
        v_tto_period_limit
      from public.match_rules r
      where r.match_id = p_match_id;

      if v_state.current_period > v_period_count then
        raise exception 'Team timeout is not available in overtime' using errcode = '22023';
      end if;

      select count(*) into v_tto_game_count
      from public.match_events e
      where e.match_id = p_match_id
        and e.event_type = 'team_timeout'
        and e.subject_side = v_subject_side
        and not exists (
          select 1 from public.match_events rev
          where rev.match_id = p_match_id
            and rev.related_event_id = e.id
            and rev.event_type in ('goal_reverted', 'event_reverted')
        );

      select count(*) into v_tto_period_count
      from public.match_events e
      where e.match_id = p_match_id
        and e.event_type = 'team_timeout'
        and e.subject_side = v_subject_side
        and e.period = v_state.current_period
        and not exists (
          select 1 from public.match_events rev
          where rev.match_id = p_match_id
            and rev.related_event_id = e.id
            and rev.event_type in ('goal_reverted', 'event_reverted')
        );

      if v_tto_game_count >= v_tto_game_limit then
        raise exception 'Team-timeout game limit has been reached' using errcode = '22023';
      end if;
      if v_tto_period_count >= v_tto_period_limit then
        raise exception 'Team-timeout period limit has been reached' using errcode = '22023';
      end if;

      -- When the optional three-timeout system is configured, only one team
      -- timeout may be taken in the last five minutes of the second half.
      if v_tto_game_limit >= 3
        and v_state.current_period = v_period_count
        and v_effective_period_ms >= greatest(0, v_duration_ms - 300000)
        and exists (
          select 1 from public.match_events e
          where e.match_id = p_match_id
            and e.event_type = 'team_timeout'
            and e.subject_side = v_subject_side
            and e.period = v_state.current_period
            and e.period_elapsed_ms >= greatest(0, v_duration_ms - 300000)
            and not exists (
              select 1 from public.match_events rev
              where rev.match_id = p_match_id
                and rev.related_event_id = e.id
                and rev.event_type in ('goal_reverted', 'event_reverted')
            )
        ) then
        raise exception 'Only one team timeout is available in the final five minutes' using errcode = '22023';
      end if;

      v_state.clock_running := false;
      v_state.clock_started_at := null;
      v_state.clock_elapsed_ms := v_effective_period_ms;
      v_state.competition_elapsed_ms := v_effective_competition_ms;
      v_event_type := 'team_timeout';
      v_event_payload := jsonb_build_object(
        'side', v_subject_side,
        'timeout_number', v_tto_game_count + 1,
        'period_timeout_number', v_tto_period_count + 1
      );

    when 'revert_event' then
      begin
        v_related_event_id := (p_payload->>'target_event_id')::uuid;
      exception when invalid_text_representation or null_value_not_allowed then
        raise exception 'Invalid correction target' using errcode = '22023';
      end;

      select e.* into v_target_event
      from public.match_events e
      where e.id = v_related_event_id
        and e.match_id = p_match_id
        and e.event_type in ('goal', 'seven_meter_missed', 'warning', 'suspension', 'disqualification', 'team_timeout')
      for share;

      if not found then
        raise exception 'Correction target is not a reversible record event' using errcode = '22023';
      end if;

      if exists (
        select 1 from public.match_events rev
        where rev.match_id = p_match_id
          and rev.related_event_id = v_related_event_id
          and rev.event_type in ('goal_reverted', 'event_reverted')
      ) then
        raise exception 'Event has already been reverted' using errcode = '22023';
      end if;

      if v_target_event.event_type = 'goal' then
        v_goal_side := coalesce(v_target_event.subject_side::text, v_target_event.payload->>'side');
        if v_goal_side = 'home' then
          if v_state.home_score <= 0 then
            raise exception 'Score state is inconsistent' using errcode = '22023';
          end if;
          v_state.home_score := v_state.home_score - 1;
        elsif v_goal_side = 'away' then
          if v_state.away_score <= 0 then
            raise exception 'Score state is inconsistent' using errcode = '22023';
          end if;
          v_state.away_score := v_state.away_score - 1;
        else
          raise exception 'Goal side is missing' using errcode = '22023';
        end if;
      end if;

      v_reason := nullif(btrim(p_payload->>'reason'), '');
      v_event_type := 'event_reverted';
      v_subject_side := v_target_event.subject_side;
      v_subject_team_member_id := v_target_event.subject_team_member_id;
      v_subject_match_roster_id := v_target_event.subject_match_roster_id;
      v_event_payload := jsonb_strip_nulls(jsonb_build_object(
        'target_event_type', v_target_event.event_type,
        'side', v_target_event.subject_side,
        'reason', v_reason
      ));

    when 'undo_last_goal' then
      select e.id, coalesce(e.subject_side::text, e.payload->>'side')
      into v_goal_id, v_goal_side
      from public.match_events e
      where e.match_id = p_match_id
        and e.event_type = 'goal'
        and not exists (
          select 1 from public.match_events revert_event
          where revert_event.match_id = p_match_id
            and revert_event.related_event_id = e.id
            and revert_event.event_type in ('goal_reverted', 'event_reverted')
        )
      order by e.state_version desc
      limit 1;

      if v_goal_id is null or v_goal_side not in ('home', 'away') then
        raise exception 'No goal to undo' using errcode = '22023';
      end if;

      if v_goal_side = 'home' then
        if v_state.home_score <= 0 then
          raise exception 'Score state is inconsistent' using errcode = '22023';
        end if;
        v_state.home_score := v_state.home_score - 1;
      else
        if v_state.away_score <= 0 then
          raise exception 'Score state is inconsistent' using errcode = '22023';
        end if;
        v_state.away_score := v_state.away_score - 1;
      end if;

      v_event_type := 'goal_reverted';
      v_related_event_id := v_goal_id;
      v_event_payload := jsonb_build_object('side', v_goal_side);

    when 'finish_match' then
      v_state.clock_running := false;
      v_state.clock_started_at := null;
      v_state.clock_elapsed_ms := v_effective_period_ms;
      v_state.competition_elapsed_ms := v_effective_competition_ms;
      v_event_type := 'match_finished';
      v_event_payload := jsonb_build_object(
        'home_score', v_state.home_score,
        'away_score', v_state.away_score,
        'period', v_state.current_period,
        'elapsed_ms', v_effective_period_ms,
        'competition_elapsed_ms', v_effective_competition_ms
      );

      update public.matches set status = 'finished' where id = p_match_id;
      v_status := 'finished';

    else
      raise exception 'Unsupported match action' using errcode = '22023';
  end case;

  v_new_version := v_state.version + 1;

  update public.match_state
  set
    version = v_new_version,
    current_period = v_state.current_period,
    clock_elapsed_ms = v_state.clock_elapsed_ms,
    competition_elapsed_ms = v_state.competition_elapsed_ms,
    clock_running = v_state.clock_running,
    clock_started_at = v_state.clock_started_at,
    home_score = v_state.home_score,
    away_score = v_state.away_score
  where match_id = p_match_id;

  insert into public.match_events (
    match_id,
    client_action_id,
    state_version,
    event_type,
    related_event_id,
    payload,
    actor_user_id,
    created_at,
    period,
    period_elapsed_ms,
    competition_elapsed_ms,
    subject_side,
    subject_team_member_id,
    subject_match_roster_id
  ) values (
    p_match_id,
    p_client_action_id,
    v_new_version,
    v_event_type,
    v_related_event_id,
    v_event_payload,
    auth.uid(),
    v_now,
    v_event_period,
    v_event_period_elapsed_ms,
    v_event_competition_elapsed_ms,
    v_subject_side,
    v_subject_team_member_id,
    v_subject_match_roster_id
  );

  return private.build_match_console_snapshot(p_match_id, v_now);
end;
$$;

create or replace function public.get_match_record_events(p_match_id uuid)
returns table (
  id uuid,
  match_id uuid,
  state_version bigint,
  event_type public.match_event_type,
  related_event_id uuid,
  period smallint,
  period_elapsed_ms bigint,
  competition_elapsed_ms bigint,
  subject_side public.team_side,
  subject_team_member_id uuid,
  subject_match_roster_id uuid,
  payload jsonb,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select
    e.id,
    e.match_id,
    e.state_version,
    e.event_type,
    e.related_event_id,
    e.period,
    e.period_elapsed_ms,
    e.competition_elapsed_ms,
    e.subject_side,
    e.subject_team_member_id,
    e.subject_match_roster_id,
    e.payload,
    e.created_at
  from public.match_events e
  where e.match_id = p_match_id
  order by e.state_version;
$$;

revoke all on function public.get_match_record_events(uuid) from public;
revoke all on function public.get_match_record_events(uuid) from anon;
grant execute on function public.get_match_record_events(uuid) to authenticated;
