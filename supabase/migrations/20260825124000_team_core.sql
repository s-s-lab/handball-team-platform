create type public.membership_role as enum ('admin', 'member');
create type public.team_member_kind as enum ('player', 'staff');
create type public.handball_position as enum ('GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'PV');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (char_length(slug) between 2 and 60 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_memberships_user_id_idx
  on public.organization_memberships(user_id);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (char_length(slug) between 2 and 60 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_name text check (short_name is null or char_length(short_name) <= 30),
  description text check (description is null or char_length(description) <= 1000),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teams_organization_id_idx on public.teams(organization_id);

create table public.team_user_memberships (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_user_memberships_user_id_idx
  on public.team_user_memberships(user_id);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  kind public.team_member_kind not null,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  display_name text check (display_name is null or char_length(display_name) <= 100),
  shirt_number smallint check (shirt_number is null or shirt_number between 0 and 99),
  primary_position public.handball_position,
  grade_or_age text check (grade_or_age is null or char_length(grade_or_age) <= 40),
  image_path text,
  is_active boolean not null default true,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_members_team_id_idx on public.team_members(team_id);
create index team_members_linked_user_id_idx on public.team_members(linked_user_id)
  where linked_user_id is not null;
create index team_members_public_team_idx on public.team_members(team_id)
  where is_public = true and is_active = true;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger team_user_memberships_set_updated_at
before update on public.team_user_memberships
for each row execute function public.set_updated_at();

create trigger team_members_set_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_organization_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  );
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.team_user_memberships tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.team_user_memberships tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.teams enable row level security;
alter table public.team_user_memberships enable row level security;
alter table public.team_members enable row level security;

create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy organizations_select_member
on public.organizations for select
to authenticated
using (public.is_organization_member(id));

create policy organization_memberships_select_member
on public.organization_memberships for select
to authenticated
using (public.is_organization_member(organization_id));

create policy organization_memberships_insert_admin
on public.organization_memberships for insert
to authenticated
with check (public.is_organization_admin(organization_id));

create policy organization_memberships_update_admin
on public.organization_memberships for update
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

create policy organization_memberships_delete_admin
on public.organization_memberships for delete
to authenticated
using (public.is_organization_admin(organization_id));

create policy teams_select_member
on public.teams for select
to authenticated
using (
  public.is_team_member(id)
  or public.is_organization_member(organization_id)
);

create policy teams_update_admin
on public.teams for update
to authenticated
using (
  public.is_team_admin(id)
  or public.is_organization_admin(organization_id)
)
with check (
  public.is_team_admin(id)
  or public.is_organization_admin(organization_id)
);

create policy team_user_memberships_select_member
on public.team_user_memberships for select
to authenticated
using (public.is_team_member(team_id));

create policy team_user_memberships_insert_admin
on public.team_user_memberships for insert
to authenticated
with check (public.is_team_admin(team_id));

create policy team_user_memberships_update_admin
on public.team_user_memberships for update
to authenticated
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

create policy team_user_memberships_delete_admin
on public.team_user_memberships for delete
to authenticated
using (public.is_team_admin(team_id));

create policy team_members_select_team_member
on public.team_members for select
to authenticated
using (public.is_team_member(team_id));

create policy team_members_insert_admin
on public.team_members for insert
to authenticated
with check (public.is_team_admin(team_id));

create policy team_members_update_admin
on public.team_members for update
to authenticated
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

create policy team_members_delete_admin
on public.team_members for delete
to authenticated
using (public.is_team_admin(team_id));

create or replace function public.create_organization_with_admin(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
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
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null or not public.is_organization_admin(p_organization_id) then
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
security definer
set search_path = public, pg_temp
as $$
  select t.id, t.name, t.slug, t.short_name, t.description
  from public.teams t
  where t.slug = lower(btrim(p_slug))
    and t.is_public = true
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
security definer
set search_path = public, pg_temp
as $$
  select
    tm.id,
    tm.kind,
    coalesce(nullif(btrim(tm.display_name), ''), tm.full_name) as display_name,
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
  order by tm.kind, tm.shirt_number nulls last, display_name;
$$;

revoke all on table public.profiles from anon;
revoke all on table public.organizations from anon;
revoke all on table public.organization_memberships from anon;
revoke all on table public.teams from anon;
revoke all on table public.team_user_memberships from anon;
revoke all on table public.team_members from anon;

grant select, update on table public.profiles to authenticated;
grant select on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_memberships to authenticated;
grant select, update on table public.teams to authenticated;
grant select, insert, update, delete on table public.team_user_memberships to authenticated;
grant select, insert, update, delete on table public.team_members to authenticated;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_organization_admin(uuid) from public;
revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_admin(uuid) from public;
revoke all on function public.create_organization_with_admin(text, text) from public;
revoke all on function public.create_team_with_admin(uuid, text, text) from public;
revoke all on function public.get_public_team(text) from public;
revoke all on function public.get_public_team_members(uuid) from public;

grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_admin(uuid) to authenticated;
grant execute on function public.create_organization_with_admin(text, text) to authenticated;
grant execute on function public.create_team_with_admin(uuid, text, text) to authenticated;
grant execute on function public.get_public_team(text) to anon, authenticated;
grant execute on function public.get_public_team_members(uuid) to anon, authenticated;
