alter table public.team_members
  add constraint team_members_public_display_name_required
  check (
    is_public = false
    or nullif(btrim(display_name), '') is not null
  ) not valid;

alter table public.team_members
  validate constraint team_members_public_display_name_required;

create or replace function public.get_public_team_members(p_team_id uuid)
returns table (
  id uuid,
  kind public.team_member_kind,
  display_name text,
  shirt_number smallint,
  primary_position public.handball_position,
  grade_or_age text,
  image_path text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    tm.id,
    tm.kind,
    tm.display_name,
    tm.shirt_number,
    tm.primary_position,
    tm.grade_or_age,
    tm.image_path
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.team_id = p_team_id
    and t.is_public = true
    and tm.is_public = true
    and tm.is_active = true
    and nullif(btrim(tm.display_name), '') is not null
  order by tm.kind, tm.shirt_number nulls last, tm.display_name;
$$;

revoke all on function public.get_public_team_members(uuid) from public;
grant execute on function public.get_public_team_members(uuid) to anon, authenticated;
