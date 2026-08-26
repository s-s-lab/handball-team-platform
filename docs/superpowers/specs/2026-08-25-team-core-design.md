# Team Core Design

## Goal

Add the first real domain data to Handball Team Platform so an authenticated user can create an organization, create teams inside it, manage a roster/staff list, and expose only explicitly safe public team/member information.

## Scope

Phase 2 includes:

- `profiles` for service-account display information.
- `organizations` and `organization_memberships`.
- `teams` and `team_user_memberships`.
- `team_members` as roster/staff records separate from `auth.users`.
- Simple `admin` / `member` roles.
- Authenticated app flows for organization creation, team creation, and team-member creation/editing.
- Public team profile at `/teams/[slug]` using a sanitized public read interface.
- RLS and security-definer helper functions/RPCs needed to make the above safe and atomic.

Phase 2 does not include Match, MatchRoster, MatchEvent, MatchState, Realtime, Storage uploads, tactics, training, attendance, or statistics.

## Domain model

### Service account vs roster person

`auth.users` is the login identity. `team_members` is the real roster/staff record. A `team_members.linked_user_id` may optionally point to an auth user, but roster records can exist without an account and one account may be linked to roster records in multiple teams.

### Profiles

`profiles`

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text`
- timestamps

A user can read and update only their own profile.

### Organizations

`organizations`

- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `slug text not null unique`
- timestamps

`organization_memberships`

- `organization_id uuid references organizations(id) on delete cascade`
- `user_id uuid references auth.users(id) on delete cascade`
- `role membership_role not null`
- composite primary key `(organization_id, user_id)`
- timestamps

A user may belong to multiple organizations. Organization creation is performed by `create_organization_with_admin(name, slug)` so the organization and initial admin membership are created atomically.

### Teams

`teams`

- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid references organizations(id) on delete cascade`
- `name text not null`
- `slug text not null unique`
- `short_name text`
- `description text`
- `is_public boolean not null default false`
- timestamps

`team_user_memberships`

- `team_id uuid references teams(id) on delete cascade`
- `user_id uuid references auth.users(id) on delete cascade`
- `role membership_role not null`
- composite primary key `(team_id, user_id)`
- timestamps

A user may belong to multiple teams and may have a different role per team. Team creation is performed by `create_team_with_admin(organization_id, name, slug)`; only organization admins may call it, and the creator receives a team admin membership atomically.

### Team members

Enums:

- `membership_role`: `admin`, `member`
- `team_member_kind`: `player`, `staff`
- `handball_position`: `GK`, `LW`, `LB`, `CB`, `RB`, `RW`, `PV`

`team_members`

- `id uuid primary key default gen_random_uuid()`
- `team_id uuid references teams(id) on delete cascade`
- `linked_user_id uuid references auth.users(id) on delete set null`
- `kind team_member_kind not null`
- `full_name text not null`
- `display_name text`
- `shirt_number smallint` constrained to `0..99` when present
- `primary_position handball_position`
- `grade_or_age text`
- `image_path text` reserved for later Storage integration
- `is_active boolean not null default true`
- `is_public boolean not null default false`
- timestamps

Player/staff data is private by default. `is_public=false` is the default, especially to protect minors. No date of birth, address, contact data, or guardian data is introduced in this phase.

## Authorization and RLS

Every exposed table has RLS enabled.

Helper functions use `security definer`, a fixed `search_path`, and `auth.uid()` to avoid recursive membership policies:

- `is_organization_member(org_id)`
- `is_organization_admin(org_id)`
- `is_team_member(team_id)`
- `is_team_admin(team_id)`

Policies:

- `profiles`: user can select/update only own row.
- `organizations`: authenticated user can select organizations they belong to. Direct inserts are not used; organization creation goes through the atomic RPC.
- `organization_memberships`: organization members can select memberships; only organization admins can add/change/remove memberships.
- `teams`: team members and organization members can select their private teams. Direct inserts are not used; team creation goes through the atomic RPC.
- `team_user_memberships`: team members can select memberships; team admins can manage them.
- `team_members`: team members can select the private roster; team admins can insert/update/delete roster records.

Anonymous users receive no direct `SELECT` access to private membership or roster tables.

## Public read interface

Public data is served through narrowly scoped RPCs rather than broad anonymous table access:

- `get_public_team(slug)` returns only public-safe team fields when `teams.is_public=true`.
- `get_public_team_members(team_id)` returns only `id`, `kind`, safe display name, shirt number, primary position, grade/age, and image path for rows where both the team and member are public.

The public member RPC never returns `full_name` unless it is the chosen public display value, never returns `linked_user_id`, and never exposes membership records.

Display-name fallback for public output is `coalesce(nullif(display_name, ''), full_name)` only when `is_public=true`.

## Application flows

### `/app`

The authenticated dashboard loads the user's organizations and teams. When none exist, it shows an onboarding state with a primary action to create an organization.

### Organization creation

`/app/organizations/new` contains a name form. The application derives a URL-safe slug from the name and allows editing before submission. The Server Action validates input and calls `create_organization_with_admin`.

### Organization detail

`/app/organizations/[organizationId]` shows organization name, current user's role, teams, and an admin-only Create team action.

### Team creation

`/app/organizations/[organizationId]/teams/new` validates organization access, accepts team name and slug, and calls `create_team_with_admin`.

### Team detail and roster

`/app/teams/[teamId]` shows team summary and roster. Team admins can add/edit members. Team members can read the roster.

`/app/teams/[teamId]/members/new` creates a player/staff record. Phase 2 may use one shared form component for create/edit while keeping Server Actions separate.

### Public team page

`/teams/[slug]` calls the public RPCs and renders a not-found state for nonexistent/private teams. No authenticated-only fields are queried by this route.

## Validation

Pure TypeScript helpers validate and normalize:

- organization/team names: trimmed, required, max 80 chars
- slug: lowercase ASCII letters, numbers, hyphens; 2-60 chars
- member full name: trimmed, required, max 100 chars
- display name: optional, max 100 chars
- shirt number: optional integer `0..99`
- grade/age: optional, max 40 chars
- `kind` and position against explicit allowed values

Server Actions must parse `FormData` through these helpers before database calls. Database constraints remain the final integrity boundary.

## Error handling

- Validation errors return user-safe Japanese messages.
- Unique slug collisions return a clear instruction to choose another slug.
- Permission failures return a generic authorization error and never leak RLS internals.
- Missing organization/team IDs render not-found or redirect to `/app` as appropriate.
- Server Actions never use service-role credentials.

## Testing and verification

- Unit tests for slug normalization and all Phase 2 form parsers.
- Migration applied through Supabase migration tooling, not ad-hoc DDL.
- SQL verification queries confirm RLS is enabled, policies exist, RPCs exist, and the authenticated test user can see only memberships they own.
- Supabase Security Advisor must show no new security warnings caused by the migration.
- GitHub CI must pass unit tests, TypeScript, ESLint, and production build.
- Vercel Preview must build successfully.
- Manual E2E: create organization → create team → add player/staff → view roster → enable safe public flags → open public team page.

## Security constraints

- GitHub remains the source of truth for migration SQL and application code.
- No service-role key or other secret is committed or used in browser code.
- Authorization is based on database membership plus RLS/RPC checks, never `user_metadata`.
- Public data is opt-in at both team and member level.
- Minor-related identifying information remains private by default.
