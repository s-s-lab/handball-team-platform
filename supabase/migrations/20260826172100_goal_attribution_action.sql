create or replace function private.attribute_match_goal_internal(
  p_match_id uuid,
  p_client_action_id uuid,
  p_expected_version bigint,
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
  v_managed_side public.team_side;
  v_now timestamptz := clock_timestamp();
  v_target_goal public.match_events%rowtype;
  v_target_side public.team_side;
  v_target_event_id uuid;
  v_subject_match_roster_id uuid;
  v_subject_team_member_id uuid;
  v_subject_shirt_number integer;
  v_subject_display_name text;
  v_subject_kind text := 'player';
  v_new_version bigint;
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

  begin
    v_target_event_id := (p_payload->>'target_event_id')::uuid;
  exception when invalid_text_representation or null_value_not_allowed then
    raise exception 'Invalid goal attribution target' using errcode = '22023';
  end;

  select e.* into v_target_goal
  from public.match_events e
  where e.id = v_target_event_id
    and e.match_id = p_match_id
    and e.event_type = 'goal'
    and not exists (
      select 1
      from public.match_events rev
      where rev.match_id = p_match_id
        and rev.related_event_id = e.id
        and rev.event_type in ('goal_reverted', 'event_reverted')
    )
  for share;

  if not found then
    raise exception 'Goal attribution target is not an active goal' using errcode = '22023';
  end if;

  if v_target_goal.subject_match_roster_id is not null
    or v_target_goal.subject_team_member_id is not null
    or nullif(v_target_goal.payload->>'scorer_team_member_id', '') is not null then
    raise exception 'Goal already has a scorer' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.match_events e
    where e.match_id = p_match_id
      and e.event_type = 'goal_attributed'
      and e.related_event_id = v_target_event_id
      and not exists (
        select 1
        from public.match_events rev
        where rev.match_id = p_match_id
          and rev.related_event_id = e.id
          and rev.event_type = 'event_reverted'
      )
  ) then
    raise exception 'Goal already has scorer attribution' using errcode = '22023';
  end if;

  begin
    v_target_side := coalesce(v_target_goal.subject_side::text, v_target_goal.payload->>'side')::public.team_side;
  exception when invalid_text_representation or null_value_not_allowed then
    raise exception 'Goal side is missing' using errcode = '22023';
  end;

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

    if v_subject_kind <> 'player' then
      raise exception 'Scorer must be a player' using errcode = '22023';
    end if;

    if v_target_side <> v_managed_side then
      raise exception 'Managed roster participant has invalid side' using errcode = '22023';
    end if;
  else
    if v_target_side = v_managed_side then
      raise exception 'Managed-team goal attribution requires a match-roster participant' using errcode = '22023';
    end if;

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
    if v_subject_shirt_number is null and v_subject_display_name is null then
      raise exception 'Goal scorer is required' using errcode = '22023';
    end if;
  end if;

  v_new_version := v_state.version + 1;

  update public.match_state
  set version = v_new_version
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
    'goal_attributed',
    v_target_event_id,
    jsonb_strip_nulls(jsonb_build_object(
      'side', v_target_side,
      'shirt_number', v_subject_shirt_number,
      'display_name', v_subject_display_name,
      'subject_kind', v_subject_kind
    )),
    auth.uid(),
    v_now,
    v_target_goal.period,
    v_target_goal.period_elapsed_ms,
    v_target_goal.competition_elapsed_ms,
    v_target_side,
    v_subject_team_member_id,
    v_subject_match_roster_id
  );

  return private.build_match_console_snapshot(p_match_id, v_now);
end;
$$;

revoke all on function private.attribute_match_goal_internal(uuid, uuid, bigint, jsonb) from public;
revoke all on function private.attribute_match_goal_internal(uuid, uuid, bigint, jsonb) from anon;
grant execute on function private.attribute_match_goal_internal(uuid, uuid, bigint, jsonb) to authenticated;

create or replace function public.apply_match_action(
  p_match_id uuid,
  p_client_action_id uuid,
  p_expected_version bigint,
  p_action text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, auth, pg_temp
as $$
begin
  if p_action = 'attribute_goal' then
    return private.attribute_match_goal_internal(
      p_match_id,
      p_client_action_id,
      p_expected_version,
      coalesce(p_payload, '{}'::jsonb)
    );
  end if;

  return private.apply_match_action_internal(
    p_match_id,
    p_client_action_id,
    p_expected_version,
    p_action,
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.apply_match_action(uuid, uuid, bigint, text, jsonb) from public;
revoke all on function public.apply_match_action(uuid, uuid, bigint, text, jsonb) from anon;
grant execute on function public.apply_match_action(uuid, uuid, bigint, text, jsonb) to authenticated;
