create type public.match_event_type as enum (
  'clock_started',
  'clock_stopped',
  'clock_reset',
  'period_changed',
  'goal',
  'goal_reverted',
  'match_finished'
);

create table public.match_state (
  match_id uuid primary key references public.matches(id) on delete cascade,
  version bigint not null default 0 check (version >= 0),
  current_period smallint not null default 1 check (current_period >= 1),
  clock_elapsed_ms bigint not null default 0 check (clock_elapsed_ms >= 0),
  clock_running boolean not null default false,
  clock_started_at timestamptz,
  home_score integer not null default 0 check (home_score >= 0),
  away_score integer not null default 0 check (away_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_state_clock_anchor_check check (
    (clock_running = true and clock_started_at is not null)
    or (clock_running = false and clock_started_at is null)
  )
);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  client_action_id uuid not null,
  state_version bigint not null check (state_version > 0),
  event_type public.match_event_type not null,
  related_event_id uuid references public.match_events(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (match_id, client_action_id),
  unique (match_id, state_version)
);

create index match_events_match_created_idx
  on public.match_events(match_id, created_at desc);
create index match_events_match_type_version_idx
  on public.match_events(match_id, event_type, state_version desc);
create unique index match_events_goal_revert_once_idx
  on public.match_events(related_event_id)
  where event_type = 'goal_reverted' and related_event_id is not null;

create trigger match_state_set_updated_at
before update on public.match_state
for each row execute function public.set_updated_at();

alter table public.match_state enable row level security;
alter table public.match_events enable row level security;

create policy match_state_select_team_member
on public.match_state for select
to authenticated
using (private.can_manage_match(match_id));

create policy match_events_select_team_member
on public.match_events for select
to authenticated
using (private.can_manage_match(match_id));

create or replace function private.initialize_match_state()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  insert into public.match_state (match_id)
  values (new.id)
  on conflict (match_id) do nothing;
  return new;
end;
$$;

revoke all on function private.initialize_match_state() from public;
revoke all on function private.initialize_match_state() from anon;
revoke all on function private.initialize_match_state() from authenticated;

create trigger matches_initialize_match_state
after insert on public.matches
for each row execute function private.initialize_match_state();

insert into public.match_state (match_id)
select m.id
from public.matches m
on conflict (match_id) do nothing;

create or replace function private.match_period_duration_ms(
  p_match_id uuid,
  p_period integer
)
returns bigint
language plpgsql
stable
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_period_count integer;
  v_period_seconds integer;
  v_overtime_enabled boolean;
  v_overtime_period_count integer;
  v_overtime_period_seconds integer;
  v_max_period integer;
begin
  select
    r.period_count,
    r.period_seconds,
    r.overtime_enabled,
    r.overtime_period_count,
    r.overtime_period_seconds
  into
    v_period_count,
    v_period_seconds,
    v_overtime_enabled,
    v_overtime_period_count,
    v_overtime_period_seconds
  from public.match_rules r
  where r.match_id = p_match_id;

  if not found then
    raise exception 'Match rules not found' using errcode = 'P0002';
  end if;

  v_max_period := v_period_count + case when v_overtime_enabled then v_overtime_period_count else 0 end;
  if p_period < 1 or p_period > v_max_period then
    raise exception 'Invalid period' using errcode = '22023';
  end if;

  if p_period > v_period_count then
    return v_overtime_period_seconds::bigint * 1000;
  end if;

  return v_period_seconds::bigint * 1000;
end;
$$;

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

create or replace function public.get_match_console_snapshot(p_match_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.build_match_console_snapshot(p_match_id, clock_timestamp());
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
  v_elapsed_ms bigint;
  v_new_version bigint;
  v_event_type public.match_event_type;
  v_event_payload jsonb := '{}'::jsonb;
  v_related_event_id uuid;
  v_target_period integer;
  v_period_count integer;
  v_overtime_enabled boolean;
  v_overtime_period_count integer;
  v_max_period integer;
  v_side text;
  v_scorer_id uuid;
  v_goal_id uuid;
  v_goal_side text;
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

  select m.status into v_status
  from public.matches m
  where m.id = p_match_id;

  if v_status in ('finished', 'cancelled') then
    raise exception 'Match is not mutable' using errcode = '22023';
  end if;

  v_duration_ms := private.match_period_duration_ms(p_match_id, v_state.current_period);
  v_elapsed_ms := v_state.clock_elapsed_ms;

  if v_state.clock_running and v_state.clock_started_at is not null then
    v_elapsed_ms := least(
      v_duration_ms,
      v_elapsed_ms + greatest(
        0,
        floor(extract(epoch from (v_now - v_state.clock_started_at)) * 1000)::bigint
      )
    );
  end if;

  case p_action
    when 'start_clock' then
      if v_state.clock_running then
        raise exception 'Clock is already running' using errcode = '22023';
      end if;
      if v_elapsed_ms >= v_duration_ms then
        raise exception 'Period clock has ended' using errcode = '22023';
      end if;

      v_state.clock_running := true;
      v_state.clock_started_at := v_now;
      v_state.clock_elapsed_ms := v_elapsed_ms;
      v_event_type := 'clock_started';
      v_event_payload := jsonb_build_object(
        'period', v_state.current_period,
        'elapsed_ms', v_elapsed_ms
      );

      if v_status = 'scheduled' then
        update public.matches
        set status = 'live'
        where id = p_match_id;
        v_status := 'live';
      end if;

    when 'stop_clock' then
      if not v_state.clock_running then
        raise exception 'Clock is already stopped' using errcode = '22023';
      end if;

      v_state.clock_running := false;
      v_state.clock_started_at := null;
      v_state.clock_elapsed_ms := v_elapsed_ms;
      v_event_type := 'clock_stopped';
      v_event_payload := jsonb_build_object(
        'period', v_state.current_period,
        'elapsed_ms', v_elapsed_ms
      );

    when 'reset_clock' then
      v_state.clock_running := false;
      v_state.clock_started_at := null;
      v_state.clock_elapsed_ms := 0;
      v_event_type := 'clock_reset';
      v_event_payload := jsonb_build_object('period', v_state.current_period);

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
      v_event_type := 'period_changed';

    when 'goal' then
      v_side := p_payload->>'side';
      if v_side not in ('home', 'away') then
        raise exception 'Invalid goal side' using errcode = '22023';
      end if;

      if nullif(p_payload->>'scorer_team_member_id', '') is not null then
        begin
          v_scorer_id := (p_payload->>'scorer_team_member_id')::uuid;
        exception when invalid_text_representation then
          raise exception 'Invalid scorer' using errcode = '22023';
        end;

        if not exists (
          select 1
          from public.match_rosters mr
          where mr.match_id = p_match_id
            and mr.team_member_id = v_scorer_id
            and mr.kind = 'player'
        ) then
          raise exception 'Invalid scorer' using errcode = '22023';
        end if;
      end if;

      if v_side = 'home' then
        v_state.home_score := v_state.home_score + 1;
      else
        v_state.away_score := v_state.away_score + 1;
      end if;

      v_event_type := 'goal';
      v_event_payload := jsonb_strip_nulls(jsonb_build_object(
        'side', v_side,
        'scorer_team_member_id', v_scorer_id
      ));

    when 'undo_last_goal' then
      select e.id, e.payload->>'side'
      into v_goal_id, v_goal_side
      from public.match_events e
      where e.match_id = p_match_id
        and e.event_type = 'goal'
        and not exists (
          select 1
          from public.match_events revert_event
          where revert_event.match_id = p_match_id
            and revert_event.event_type = 'goal_reverted'
            and revert_event.related_event_id = e.id
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
      v_state.clock_elapsed_ms := v_elapsed_ms;
      v_event_type := 'match_finished';
      v_event_payload := jsonb_build_object(
        'home_score', v_state.home_score,
        'away_score', v_state.away_score,
        'period', v_state.current_period,
        'elapsed_ms', v_elapsed_ms
      );

      update public.matches
      set status = 'finished'
      where id = p_match_id;
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
    created_at
  ) values (
    p_match_id,
    p_client_action_id,
    v_new_version,
    v_event_type,
    v_related_event_id,
    v_event_payload,
    auth.uid(),
    v_now
  );

  return private.build_match_console_snapshot(p_match_id, v_now);
end;
$$;

create or replace function public.apply_match_action(
  p_match_id uuid,
  p_client_action_id uuid,
  p_expected_version bigint,
  p_action text,
  p_payload jsonb
)
returns jsonb
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.apply_match_action_internal(
    p_match_id,
    p_client_action_id,
    p_expected_version,
    p_action,
    coalesce(p_payload, '{}'::jsonb)
  );
$$;

revoke all on table public.match_state from anon;
revoke all on table public.match_state from authenticated;
revoke all on table public.match_events from anon;
revoke all on table public.match_events from authenticated;

grant select on table public.match_state to authenticated;
grant select on table public.match_events to authenticated;

revoke all on function private.match_period_duration_ms(uuid, integer) from public;
revoke all on function private.match_period_duration_ms(uuid, integer) from anon;
revoke all on function private.build_match_console_snapshot(uuid, timestamptz) from public;
revoke all on function private.build_match_console_snapshot(uuid, timestamptz) from anon;
revoke all on function private.apply_match_action_internal(uuid, uuid, bigint, text, jsonb) from public;
revoke all on function private.apply_match_action_internal(uuid, uuid, bigint, text, jsonb) from anon;

grant execute on function private.match_period_duration_ms(uuid, integer) to authenticated;
grant execute on function private.build_match_console_snapshot(uuid, timestamptz) to authenticated;
grant execute on function private.apply_match_action_internal(uuid, uuid, bigint, text, jsonb) to authenticated;

revoke all on function public.get_match_console_snapshot(uuid) from public;
revoke all on function public.get_match_console_snapshot(uuid) from anon;
grant execute on function public.get_match_console_snapshot(uuid) to authenticated;

revoke all on function public.apply_match_action(uuid, uuid, bigint, text, jsonb) from public;
revoke all on function public.apply_match_action(uuid, uuid, bigint, text, jsonb) from anon;
grant execute on function public.apply_match_action(uuid, uuid, bigint, text, jsonb) to authenticated;
