create or replace function private.revert_goal_attribution_internal(
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
  v_now timestamptz := clock_timestamp();
  v_target_event_id uuid;
  v_target public.match_events%rowtype;
  v_new_version bigint;
  v_reason text;
begin
  if auth.uid() is null or not private.can_manage_match(p_match_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.match_events e
    where e.match_id = p_match_id and e.client_action_id = p_client_action_id
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

  select m.status into v_status from public.matches m where m.id = p_match_id;
  if v_status in ('finished', 'cancelled') then
    raise exception 'Match is not mutable' using errcode = '22023';
  end if;

  begin
    v_target_event_id := (p_payload->>'target_event_id')::uuid;
  exception when invalid_text_representation or null_value_not_allowed then
    raise exception 'Invalid correction target' using errcode = '22023';
  end;

  select e.* into v_target
  from public.match_events e
  where e.id = v_target_event_id
    and e.match_id = p_match_id
    and e.event_type = 'goal_attributed'
  for share;

  if not found then
    raise exception 'Correction target is not a goal attribution' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.match_events rev
    where rev.match_id = p_match_id
      and rev.related_event_id = v_target_event_id
      and rev.event_type = 'event_reverted'
  ) then
    raise exception 'Event has already been reverted' using errcode = '22023';
  end if;

  v_new_version := v_state.version + 1;
  update public.match_state set version = v_new_version where match_id = p_match_id;

  v_reason := nullif(btrim(p_payload->>'reason'), '');

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
    'event_reverted',
    v_target_event_id,
    jsonb_strip_nulls(jsonb_build_object(
      'target_event_type', 'goal_attributed',
      'side', v_target.subject_side,
      'reason', v_reason
    )),
    auth.uid(),
    v_now,
    v_target.period,
    v_target.period_elapsed_ms,
    v_target.competition_elapsed_ms,
    v_target.subject_side,
    v_target.subject_team_member_id,
    v_target.subject_match_roster_id
  );

  return private.build_match_console_snapshot(p_match_id, v_now);
end;
$$;

revoke all on function private.revert_goal_attribution_internal(uuid, uuid, bigint, jsonb) from public;
revoke all on function private.revert_goal_attribution_internal(uuid, uuid, bigint, jsonb) from anon;
grant execute on function private.revert_goal_attribution_internal(uuid, uuid, bigint, jsonb) to authenticated;

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
declare
  v_target_text text;
begin
  if p_action = 'attribute_goal' then
    return private.attribute_match_goal_internal(
      p_match_id,
      p_client_action_id,
      p_expected_version,
      coalesce(p_payload, '{}'::jsonb)
    );
  end if;

  if p_action = 'revert_event' then
    v_target_text := coalesce(p_payload->>'target_event_id', '');
    if v_target_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      if exists (
        select 1 from public.match_events e
        where e.id = v_target_text::uuid
          and e.match_id = p_match_id
          and e.event_type = 'goal_attributed'
      ) then
        return private.revert_goal_attribution_internal(
          p_match_id,
          p_client_action_id,
          p_expected_version,
          coalesce(p_payload, '{}'::jsonb)
        );
      end if;
    end if;
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
