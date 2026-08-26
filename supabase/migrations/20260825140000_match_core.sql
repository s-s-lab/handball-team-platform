create type public.match_status as enum ('scheduled', 'live', 'finished', 'cancelled');
create type public.team_side as enum ('home', 'away');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  opponent_name text not null check (char_length(btrim(opponent_name)) between 1 and 100),
  team_side public.team_side not null default 'home',
  scheduled_at timestamptz not null,
  venue text check (venue is null or char_length(venue) <= 120),
  memo text check (memo is null or char_length(memo) <= 2000),
  status public.match_status not null default 'scheduled',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_team_scheduled_at_idx
  on public.matches(team_id, scheduled_at desc);
create index matches_team_status_idx
  on public.matches(team_id, status);

create table public.match_rules (
  match_id uuid primary key references public.matches(id) on delete cascade,
  period_count smallint not null default 2 check (period_count between 1 and 4),
  period_seconds integer not null default 1800 check (period_seconds between 60 and 3600),
  halftime_seconds integer not null default 600 check (halftime_seconds between 0 and 1800),
  overtime_enabled boolean not null default false,
  overtime_period_count smallint not null default 2 check (overtime_period_count between 1 and 4),
  overtime_period_seconds integer not null default 300 check (overtime_period_seconds between 60 and 1800),
  team_timeouts_per_game smallint not null default 2 check (team_timeouts_per_game between 0 and 3),
  team_timeouts_per_period smallint not null default 1 check (team_timeouts_per_period between 0 and 2),
  team_timeout_seconds integer not null default 60 check (team_timeout_seconds between 30 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.match_rosters (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_member_id uuid references public.team_members(id) on delete set null,
  kind public.team_member_kind not null,
  full_name_snapshot text not null check (char_length(btrim(full_name_snapshot)) between 1 and 100),
  display_name_snapshot text check (display_name_snapshot is null or char_length(display_name_snapshot) <= 100),
  shirt_number_snapshot smallint check (shirt_number_snapshot is null or shirt_number_snapshot between 0 and 99),
  primary_position_snapshot public.handball_position,
  created_at timestamptz not null default now()
);

create index match_rosters_match_id_idx on public.match_rosters(match_id);
create unique index match_rosters_match_team_member_unique_idx
  on public.match_rosters(match_id, team_member_id)
  where team_member_id is not null;

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger match_rules_set_updated_at
before update on public.match_rules
for each row execute function public.set_updated_at();

create or replace function private.can_manage_match(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.matches m
    join public.team_user_memberships tum on tum.team_id = m.team_id
    where m.id = p_match_id
      and tum.user_id = auth.uid()
  );
$$;

revoke all on function private.can_manage_match(uuid) from public;
revoke all on function private.can_manage_match(uuid) from anon;
grant execute on function private.can_manage_match(uuid) to authenticated;

alter table public.matches enable row level security;
alter table public.match_rules enable row level security;
alter table public.match_rosters enable row level security;

create policy matches_select_team_member
on public.matches for select
to authenticated
using (private.is_team_member(team_id));

create policy matches_insert_team_member
on public.matches for insert
to authenticated
with check (private.is_team_member(team_id));

create policy matches_update_team_member
on public.matches for update
to authenticated
using (private.is_team_member(team_id))
with check (private.is_team_member(team_id));

create policy matches_delete_team_member
on public.matches for delete
to authenticated
using (private.is_team_member(team_id));

create policy match_rules_select_team_member
on public.match_rules for select
to authenticated
using (private.can_manage_match(match_id));

create policy match_rules_update_team_member
on public.match_rules for update
to authenticated
using (private.can_manage_match(match_id))
with check (private.can_manage_match(match_id));

create policy match_rosters_select_team_member
on public.match_rosters for select
to authenticated
using (private.can_manage_match(match_id));

create or replace function private.create_match_with_rules_internal(
  p_team_id uuid,
  p_name text,
  p_opponent_name text,
  p_team_side public.team_side,
  p_scheduled_at timestamptz,
  p_venue text,
  p_memo text,
  p_is_public boolean,
  p_period_count smallint,
  p_period_seconds integer,
  p_halftime_seconds integer,
  p_overtime_enabled boolean,
  p_overtime_period_count smallint,
  p_overtime_period_seconds integer,
  p_team_timeouts_per_game smallint,
  p_team_timeouts_per_period smallint,
  p_team_timeout_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_match_id uuid;
begin
  if auth.uid() is null or not private.is_team_member(p_team_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  insert into public.matches (
    team_id, name, opponent_name, team_side, scheduled_at, venue, memo, status, is_public
  ) values (
    p_team_id,
    btrim(p_name),
    btrim(p_opponent_name),
    p_team_side,
    p_scheduled_at,
    nullif(btrim(p_venue), ''),
    nullif(btrim(p_memo), ''),
    'scheduled',
    p_is_public
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
    p_period_count,
    p_period_seconds,
    p_halftime_seconds,
    p_overtime_enabled,
    p_overtime_period_count,
    p_overtime_period_seconds,
    p_team_timeouts_per_game,
    p_team_timeouts_per_period,
    p_team_timeout_seconds
  );

  return v_match_id;
end;
$$;

create or replace function public.create_match_with_rules(
  p_team_id uuid,
  p_name text,
  p_opponent_name text,
  p_team_side public.team_side,
  p_scheduled_at timestamptz,
  p_venue text,
  p_memo text,
  p_is_public boolean,
  p_period_count smallint,
  p_period_seconds integer,
  p_halftime_seconds integer,
  p_overtime_enabled boolean,
  p_overtime_period_count smallint,
  p_overtime_period_seconds integer,
  p_team_timeouts_per_game smallint,
  p_team_timeouts_per_period smallint,
  p_team_timeout_seconds integer
)
returns uuid
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.create_match_with_rules_internal(
    p_team_id,
    p_name,
    p_opponent_name,
    p_team_side,
    p_scheduled_at,
    p_venue,
    p_memo,
    p_is_public,
    p_period_count,
    p_period_seconds,
    p_halftime_seconds,
    p_overtime_enabled,
    p_overtime_period_count,
    p_overtime_period_seconds,
    p_team_timeouts_per_game,
    p_team_timeouts_per_period,
    p_team_timeout_seconds
  );
$$;

create or replace function private.set_match_roster_internal(
  p_match_id uuid,
  p_team_member_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_team_id uuid;
  v_requested_count integer;
  v_valid_count integer;
begin
  if auth.uid() is null or not private.can_manage_match(p_match_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select team_id into v_team_id
  from public.matches
  where id = p_match_id;

  if v_team_id is null then
    raise exception 'Match not found' using errcode = 'P0002';
  end if;

  select count(distinct item)::integer
  into v_requested_count
  from unnest(coalesce(p_team_member_ids, '{}'::uuid[])) as item;

  select count(*)::integer
  into v_valid_count
  from public.team_members tm
  where tm.team_id = v_team_id
    and tm.id = any(coalesce(p_team_member_ids, '{}'::uuid[]));

  if v_valid_count <> v_requested_count then
    raise exception 'Roster contains members from another team or unknown members' using errcode = '22023';
  end if;

  delete from public.match_rosters where match_id = p_match_id;

  insert into public.match_rosters (
    match_id,
    team_member_id,
    kind,
    full_name_snapshot,
    display_name_snapshot,
    shirt_number_snapshot,
    primary_position_snapshot
  )
  select
    p_match_id,
    tm.id,
    tm.kind,
    tm.full_name,
    tm.display_name,
    tm.shirt_number,
    tm.primary_position
  from public.team_members tm
  where tm.team_id = v_team_id
    and tm.id = any(coalesce(p_team_member_ids, '{}'::uuid[]))
  order by tm.kind, tm.shirt_number nulls last, tm.full_name;

  return v_valid_count;
end;
$$;

create or replace function public.set_match_roster(
  p_match_id uuid,
  p_team_member_ids uuid[]
)
returns integer
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.set_match_roster_internal(p_match_id, p_team_member_ids);
$$;

revoke all on table public.matches from anon;
revoke all on table public.match_rules from anon;
revoke all on table public.match_rosters from anon;

revoke all on table public.matches from authenticated;
revoke all on table public.match_rules from authenticated;
revoke all on table public.match_rosters from authenticated;

grant select, update, delete on table public.matches to authenticated;
grant select, update on table public.match_rules to authenticated;
grant select on table public.match_rosters to authenticated;

revoke all on function private.create_match_with_rules_internal(uuid, text, text, public.team_side, timestamptz, text, text, boolean, smallint, integer, integer, boolean, smallint, integer, smallint, smallint, integer) from public;
revoke all on function private.create_match_with_rules_internal(uuid, text, text, public.team_side, timestamptz, text, text, boolean, smallint, integer, integer, boolean, smallint, integer, smallint, smallint, integer) from anon;
grant execute on function private.create_match_with_rules_internal(uuid, text, text, public.team_side, timestamptz, text, text, boolean, smallint, integer, integer, boolean, smallint, integer, smallint, smallint, integer) to authenticated;

revoke all on function private.set_match_roster_internal(uuid, uuid[]) from public;
revoke all on function private.set_match_roster_internal(uuid, uuid[]) from anon;
grant execute on function private.set_match_roster_internal(uuid, uuid[]) to authenticated;

revoke all on function public.create_match_with_rules(uuid, text, text, public.team_side, timestamptz, text, text, boolean, smallint, integer, integer, boolean, smallint, integer, smallint, smallint, integer) from public;
revoke all on function public.create_match_with_rules(uuid, text, text, public.team_side, timestamptz, text, text, boolean, smallint, integer, integer, boolean, smallint, integer, smallint, smallint, integer) from anon;
grant execute on function public.create_match_with_rules(uuid, text, text, public.team_side, timestamptz, text, text, boolean, smallint, integer, integer, boolean, smallint, integer, smallint, smallint, integer) to authenticated;

revoke all on function public.set_match_roster(uuid, uuid[]) from public;
revoke all on function public.set_match_roster(uuid, uuid[]) from anon;
grant execute on function public.set_match_roster(uuid, uuid[]) to authenticated;
