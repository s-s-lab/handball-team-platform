create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

alter function public.handle_new_user() set schema private;
alter function public.is_organization_member(uuid) set schema private;
alter function public.is_organization_admin(uuid) set schema private;
alter function public.is_team_member(uuid) set schema private;
alter function public.is_team_admin(uuid) set schema private;

grant usage on schema private to authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.is_organization_admin(uuid) to authenticated;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.is_team_admin(uuid) to authenticated;

create or replace function private.can_bootstrap_organization_admin(
  p_organization_id uuid,
  p_user_id uuid,
  p_role public.membership_role
)
returns boolean
language sql
stable
security definer
set search_path = public, private, auth, pg_temp
as $$
  select auth.uid() is not null
    and p_user_id = auth.uid()
    and p_role = 'admin'
    and not exists (
      select 1
      from public.organization_memberships om
      where om.organization_id = p_organization_id
    );
$$;

create or replace function private.can_bootstrap_team_admin(
  p_team_id uuid,
  p_user_id uuid,
  p_role public.membership_role
)
returns boolean
language sql
stable
security definer
set search_path = public, private, auth, pg_temp
as $$
  select auth.uid() is not null
    and p_user_id = auth.uid()
    and p_role = 'admin'
    and not exists (
      select 1
      from public.team_user_memberships tum
      where tum.team_id = p_team_id
    )
    and exists (
      select 1
      from public.teams t
      join public.organization_memberships om
        on om.organization_id = t.organization_id
      where t.id = p_team_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    );
$$;

revoke all on function private.can_bootstrap_organization_admin(uuid, uuid, public.membership_role) from public;
revoke all on function private.can_bootstrap_team_admin(uuid, uuid, public.membership_role) from public;
grant execute on function private.can_bootstrap_organization_admin(uuid, uuid, public.membership_role) to authenticated;
grant execute on function private.can_bootstrap_team_admin(uuid, uuid, public.membership_role) to authenticated;

-- Recreate policies with private helper names for clarity and bootstrap support.
drop policy organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations for select
to authenticated
using (private.is_organization_member(id));

create policy organizations_insert_authenticated
on public.organizations for insert
to authenticated
with check (auth.uid() is not null);

drop policy organization_memberships_select_member on public.organization_memberships;
create policy organization_memberships_select_member
on public.organization_memberships for select
to authenticated
using (private.is_organization_member(organization_id));

drop policy organization_memberships_insert_admin on public.organization_memberships;
create policy organization_memberships_insert_admin
on public.organization_memberships for insert
to authenticated
with check (
  private.is_organization_admin(organization_id)
  or private.can_bootstrap_organization_admin(organization_id, user_id, role)
);

drop policy organization_memberships_update_admin on public.organization_memberships;
create policy organization_memberships_update_admin
on public.organization_memberships for update
to authenticated
using (private.is_organization_admin(organization_id))
with check (private.is_organization_admin(organization_id));

drop policy organization_memberships_delete_admin on public.organization_memberships;
create policy organization_memberships_delete_admin
on public.organization_memberships for delete
to authenticated
using (private.is_organization_admin(organization_id));

drop policy teams_select_member on public.teams;
create policy teams_select_member
on public.teams for select
to authenticated
using (
  private.is_team_member(id)
  or private.is_organization_member(organization_id)
);

create policy teams_select_public
on public.teams for select
to anon
using (is_public = true);

create policy teams_insert_org_admin
on public.teams for insert
to authenticated
with check (private.is_organization_admin(organization_id));

drop policy teams_update_admin on public.teams;
create policy teams_update_admin
on public.teams for update
to authenticated
using (
  private.is_team_admin(id)
  or private.is_organization_admin(organization_id)
)
with check (
  private.is_team_admin(id)
  or private.is_organization_admin(organization_id)
);

drop policy team_user_memberships_select_member on public.team_user_memberships;
create policy team_user_memberships_select_member
on public.team_user_memberships for select
to authenticated
using (private.is_team_member(team_id));

drop policy team_user_memberships_insert_admin on public.team_user_memberships;
create policy team_user_memberships_insert_admin
on public.team_user_memberships for insert
to authenticated
with check (
  private.is_team_admin(team_id)
  or private.can_bootstrap_team_admin(team_id, user_id, role)
);

drop policy team_user_memberships_update_admin on public.team_user_memberships;
create policy team_user_memberships_update_admin
on public.team_user_memberships for update
to authenticated
using (private.is_team_admin(team_id))
with check (private.is_team_admin(team_id));

drop policy team_user_memberships_delete_admin on public.team_user_memberships;
create policy team_user_memberships_delete_admin
on public.team_user_memberships for delete
to authenticated
using (private.is_team_admin(team_id));

drop policy team_members_select_team_member on public.team_members;
create policy team_members_select_team_member
on public.team_members for select
to authenticated
using (private.is_team_member(team_id));

create policy team_members_select_public
on public.team_members for select
to anon
using (
  is_public = true
  and is_active = true
  and display_name is not null
  and btrim(display_name) <> ''
  and exists (
    select 1
    from public.teams t
    where t.id = team_members.team_id
  )
);

drop policy team_members_insert_admin on public.team_members;
create policy team_members_insert_admin
on public.team_members for insert
to authenticated
with check (private.is_team_admin(team_id));

drop policy team_members_update_admin on public.team_members;
create policy team_members_update_admin
on public.team_members for update
to authenticated
using (private.is_team_admin(team_id))
with check (private.is_team_admin(team_id));

drop policy team_members_delete_admin on public.team_members;
create policy team_members_delete_admin
on public.team_members for delete
to authenticated
using (private.is_team_admin(team_id));

-- Organization/team bootstrap RPCs now run as the caller; RLS performs authorization.
create or replace function public.create_organization_with_admin(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security invoker
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

create or replace function public.create_team_with_admin(
  p_organization_id uuid,
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security invoker
set search_path = public, private, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.teams (organization_id, name, slug)
  values (p_organization_id, btrim(p_name), lower(btrim(p_slug)))
  returning id into v_team_id;

  insert into public.team_user_memberships (team_id, user_id, role)
  values (v_team_id, v_user_id, 'admin');

  return v_team_id;
end;
$$;

-- Anonymous public reads use RLS plus column-level grants; no definer bypass.
create or replace function public.get_public_team(p_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  short_name text,
  description text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select t.id, t.name, t.slug, t.short_name, t.description
  from public.teams t
  where t.slug = lower(btrim(p_slug))
  limit 1;
$$;

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
  where tm.team_id = p_team_id
  order by tm.kind, tm.shirt_number nulls last, tm.display_name;
$$;

revoke all on table public.organizations from anon;
revoke all on table public.teams from anon;
revoke all on table public.team_members from anon;

grant select (id, name, slug, short_name, description) on public.teams to anon;
grant select (id, team_id, kind, display_name, shirt_number, primary_position, grade_or_age, image_path)
  on public.team_members to anon;

grant insert on table public.organizations to authenticated;
grant insert on table public.teams to authenticated;

revoke execute on function public.create_organization_with_admin(text, text) from anon;
revoke execute on function public.create_team_with_admin(uuid, text, text) from anon;
grant execute on function public.create_organization_with_admin(text, text) to authenticated;
grant execute on function public.create_team_with_admin(uuid, text, text) to authenticated;

revoke execute on function public.get_public_team(text) from authenticated;
revoke execute on function public.get_public_team_members(uuid) from authenticated;
grant execute on function public.get_public_team(text) to anon;
grant execute on function public.get_public_team_members(uuid) to anon;

revoke execute on function private.handle_new_user() from public;
revoke execute on function private.handle_new_user() from anon;
revoke execute on function private.handle_new_user() from authenticated;
