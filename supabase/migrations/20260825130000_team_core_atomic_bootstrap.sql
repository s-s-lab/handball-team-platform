drop policy if exists organizations_insert_authenticated on public.organizations;
drop policy if exists teams_insert_org_admin on public.teams;

revoke insert on table public.organizations from authenticated;
revoke insert on table public.teams from authenticated;

create or replace function private.create_organization_with_admin_internal(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.organizations (name, slug)
  values (btrim(p_name), lower(btrim(p_slug)))
  returning id into v_organization_id;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'admin');

  return v_organization_id;
end;
$$;

create or replace function private.create_team_with_admin_internal(
  p_organization_id uuid,
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null or not private.is_organization_admin(p_organization_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  insert into public.teams (organization_id, name, slug)
  values (p_organization_id, btrim(p_name), lower(btrim(p_slug)))
  returning id into v_team_id;

  insert into public.team_user_memberships (team_id, user_id, role)
  values (v_team_id, v_user_id, 'admin');

  return v_team_id;
end;
$$;

revoke all on function private.create_organization_with_admin_internal(text, text) from public;
revoke all on function private.create_organization_with_admin_internal(text, text) from anon;
revoke all on function private.create_team_with_admin_internal(uuid, text, text) from public;
revoke all on function private.create_team_with_admin_internal(uuid, text, text) from anon;
grant execute on function private.create_organization_with_admin_internal(text, text) to authenticated;
grant execute on function private.create_team_with_admin_internal(uuid, text, text) to authenticated;

create or replace function public.create_organization_with_admin(
  p_name text,
  p_slug text
)
returns uuid
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.create_organization_with_admin_internal(p_name, p_slug);
$$;

create or replace function public.create_team_with_admin(
  p_organization_id uuid,
  p_name text,
  p_slug text
)
returns uuid
language sql
security invoker
set search_path = public, private, auth, pg_temp
as $$
  select private.create_team_with_admin_internal(p_organization_id, p_name, p_slug);
$$;
