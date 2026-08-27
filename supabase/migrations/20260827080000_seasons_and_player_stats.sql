create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_date_range_check check (start_date <= end_date),
  constraint seasons_team_name_unique unique (team_id, name)
);

create unique index seasons_one_current_per_team_idx
  on public.seasons(team_id)
  where is_current = true;
create index seasons_team_dates_idx
  on public.seasons(team_id, start_date desc, end_date desc);

create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

alter table public.matches
  add column season_id uuid references public.seasons(id) on delete set null;

create index matches_team_season_scheduled_idx
  on public.matches(team_id, season_id, scheduled_at desc);

create table public.season_player_stats (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  appearances integer not null default 0 check (appearances >= 0),
  starts integer not null default 0 check (starts >= 0),
  goals integer not null default 0 check (goals >= 0),
  seven_meter_goals integer not null default 0 check (seven_meter_goals >= 0),
  seven_meter_attempts integer not null default 0 check (seven_meter_attempts >= 0),
  warnings integer not null default 0 check (warnings >= 0),
  two_minute_suspensions integer not null default 0 check (two_minute_suspensions >= 0),
  disqualifications integer not null default 0 check (disqualifications >= 0),
  saves integer not null default 0 check (saves >= 0),
  shots_faced integer not null default 0 check (shots_faced >= 0),
  notes text check (notes is null or char_length(notes) <= 2000),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint season_player_stats_unique unique (season_id, team_member_id),
  constraint season_player_stats_starts_le_appearances_check check (starts <= appearances),
  constraint season_player_stats_7m_check check (seven_meter_goals <= seven_meter_attempts),
  constraint season_player_stats_saves_check check (saves <= shots_faced)
);

create index season_player_stats_member_idx
  on public.season_player_stats(team_member_id, season_id);

create trigger season_player_stats_set_updated_at
before update on public.season_player_stats
for each row execute function public.set_updated_at();

alter table public.seasons enable row level security;
alter table public.season_player_stats enable row level security;

create policy seasons_select_team_member
on public.seasons for select
to authenticated
using (private.is_team_member(team_id));

create policy season_player_stats_select_team_member
on public.season_player_stats for select
to authenticated
using (
  exists (
    select 1
    from public.seasons s
    where s.id = season_id
      and private.is_team_member(s.team_id)
  )
);

revoke all on table public.seasons from anon;
revoke all on table public.season_player_stats from anon;
revoke all on table public.seasons from authenticated;
revoke all on table public.season_player_stats from authenticated;
grant select on table public.seasons to authenticated;
grant select on table public.season_player_stats to authenticated;

create or replace function private.save_season_internal(
  p_team_id uuid,
  p_season_id uuid,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_is_current boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_season_id uuid;
begin
  if auth.uid() is null or not private.is_team_admin(p_team_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'Invalid season date range' using errcode = '22023';
  end if;

  if btrim(coalesce(p_name, '')) = '' or char_length(btrim(p_name)) > 80 then
    raise exception 'Invalid season name' using errcode = '22023';
  end if;

  if p_is_current then
    update public.seasons
    set is_current = false
    where team_id = p_team_id
      and is_current = true
      and (p_season_id is null or id <> p_season_id);
  end if;

  if p_season_id is null then
    insert into public.seasons (team_id, name, start_date, end_date, is_current)
    values (p_team_id, btrim(p_name), p_start_date, p_end_date, p_is_current)
    returning id into v_season_id;
  else
    update public.seasons
    set
      name = btrim(p_name),
      start_date = p_start_date,
      end_date = p_end_date,
      is_current = p_is_current
    where id = p_season_id
      and team_id = p_team_id
    returning id into v_season_id;

    if v_season_id is null then
      raise exception 'Season not found for team' using errcode = 'P0002';
    end if;
  end if;

  return v_season_id;
end;
$$;

create or replace function public.save_season(
  p_team_id uuid,
  p_season_id uuid,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_is_current boolean
)
returns uuid
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.save_season_internal(
    p_team_id,
    p_season_id,
    p_name,
    p_start_date,
    p_end_date,
    p_is_current
  );
$$;

create or replace function private.set_match_season_internal(
  p_team_id uuid,
  p_match_id uuid,
  p_season_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  if auth.uid() is null or not private.is_team_admin(p_team_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.matches m where m.id = p_match_id and m.team_id = p_team_id
  ) then
    raise exception 'Match not found for team' using errcode = 'P0002';
  end if;

  if p_season_id is not null and not exists (
    select 1 from public.seasons s where s.id = p_season_id and s.team_id = p_team_id
  ) then
    raise exception 'Season not found for team' using errcode = '22023';
  end if;

  update public.matches
  set season_id = p_season_id
  where id = p_match_id and team_id = p_team_id;
end;
$$;

create or replace function public.set_match_season(
  p_team_id uuid,
  p_match_id uuid,
  p_season_id uuid
)
returns void
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.set_match_season_internal(p_team_id, p_match_id, p_season_id);
$$;

create or replace function private.upsert_season_player_stats_internal(
  p_team_id uuid,
  p_season_id uuid,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_count integer := 0;
begin
  if auth.uid() is null or not private.is_team_admin(p_team_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.seasons s where s.id = p_season_id and s.team_id = p_team_id
  ) then
    raise exception 'Season not found for team' using errcode = 'P0002';
  end if;

  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array' then
    raise exception 'Stats rows must be an array' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(team_member_id uuid)
    left join public.team_members tm
      on tm.id = r.team_member_id and tm.team_id = p_team_id
    where r.team_member_id is null or tm.id is null
  ) then
    raise exception 'Stats contain member from another team or unknown member' using errcode = '22023';
  end if;

  insert into public.season_player_stats (
    season_id,
    team_member_id,
    appearances,
    starts,
    goals,
    seven_meter_goals,
    seven_meter_attempts,
    warnings,
    two_minute_suspensions,
    disqualifications,
    saves,
    shots_faced,
    notes,
    updated_by
  )
  select
    p_season_id,
    r.team_member_id,
    coalesce(r.appearances, 0),
    coalesce(r.starts, 0),
    coalesce(r.goals, 0),
    coalesce(r.seven_meter_goals, 0),
    coalesce(r.seven_meter_attempts, 0),
    coalesce(r.warnings, 0),
    coalesce(r.two_minute_suspensions, 0),
    coalesce(r.disqualifications, 0),
    coalesce(r.saves, 0),
    coalesce(r.shots_faced, 0),
    nullif(r.notes, ''),
    auth.uid()
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(
    team_member_id uuid,
    appearances integer,
    starts integer,
    goals integer,
    seven_meter_goals integer,
    seven_meter_attempts integer,
    warnings integer,
    two_minute_suspensions integer,
    disqualifications integer,
    saves integer,
    shots_faced integer,
    notes text
  )
  on conflict (season_id, team_member_id)
  do update set
    appearances = excluded.appearances,
    starts = excluded.starts,
    goals = excluded.goals,
    seven_meter_goals = excluded.seven_meter_goals,
    seven_meter_attempts = excluded.seven_meter_attempts,
    warnings = excluded.warnings,
    two_minute_suspensions = excluded.two_minute_suspensions,
    disqualifications = excluded.disqualifications,
    saves = excluded.saves,
    shots_faced = excluded.shots_faced,
    notes = excluded.notes,
    updated_by = excluded.updated_by;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.upsert_season_player_stats(
  p_team_id uuid,
  p_season_id uuid,
  p_rows jsonb
)
returns integer
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.upsert_season_player_stats_internal(p_team_id, p_season_id, p_rows);
$$;

revoke all on function private.save_season_internal(uuid, uuid, text, date, date, boolean) from public;
revoke all on function private.save_season_internal(uuid, uuid, text, date, date, boolean) from anon;
grant execute on function private.save_season_internal(uuid, uuid, text, date, date, boolean) to authenticated;

revoke all on function private.set_match_season_internal(uuid, uuid, uuid) from public;
revoke all on function private.set_match_season_internal(uuid, uuid, uuid) from anon;
grant execute on function private.set_match_season_internal(uuid, uuid, uuid) to authenticated;

revoke all on function private.upsert_season_player_stats_internal(uuid, uuid, jsonb) from public;
revoke all on function private.upsert_season_player_stats_internal(uuid, uuid, jsonb) from anon;
grant execute on function private.upsert_season_player_stats_internal(uuid, uuid, jsonb) to authenticated;

revoke all on function public.save_season(uuid, uuid, text, date, date, boolean) from public;
revoke all on function public.save_season(uuid, uuid, text, date, date, boolean) from anon;
grant execute on function public.save_season(uuid, uuid, text, date, date, boolean) to authenticated;

revoke all on function public.set_match_season(uuid, uuid, uuid) from public;
revoke all on function public.set_match_season(uuid, uuid, uuid) from anon;
grant execute on function public.set_match_season(uuid, uuid, uuid) to authenticated;

revoke all on function public.upsert_season_player_stats(uuid, uuid, jsonb) from public;
revoke all on function public.upsert_season_player_stats(uuid, uuid, jsonb) from anon;
grant execute on function public.upsert_season_player_stats(uuid, uuid, jsonb) to authenticated;
