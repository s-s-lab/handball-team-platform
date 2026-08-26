alter table public.matches
add column roster_configured_at timestamptz;

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

  update public.matches
  set roster_configured_at = now()
  where id = p_match_id;

  return v_valid_count;
end;
$$;

revoke all on function private.set_match_roster_internal(uuid, uuid[]) from public;
revoke all on function private.set_match_roster_internal(uuid, uuid[]) from anon;
grant execute on function private.set_match_roster_internal(uuid, uuid[]) to authenticated;
