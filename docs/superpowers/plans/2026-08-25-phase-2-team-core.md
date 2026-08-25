# Phase 2 Team Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users create an organization, create teams, manage player/staff roster records, and expose an opt-in sanitized public team profile.

**Architecture:** PostgreSQL + RLS is the authorization boundary. Atomic organization/team bootstrap operations use authenticated security-definer RPCs; normal roster CRUD uses the user's Supabase session under RLS. Next.js Server Components read data, Server Actions validate FormData and mutate data, and public routes call sanitized RPCs only.

**Tech Stack:** Next.js 16.x, React 19.x, TypeScript, Tailwind CSS 4.x, shadcn/ui source components, Supabase PostgreSQL/Auth, Vitest, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-25-team-core-design.md`

## Global Constraints

- GitHub is the single source of truth for migration SQL and application code.
- No service-role key or secret may be committed or used in browser/server application code.
- Authorization must use RLS/database membership, never `user_metadata`.
- Public team/member data is opt-in and sanitized through public RPCs.
- `team_members` remains separate from `auth.users` with an optional `linked_user_id`.
- Match-related tables and behavior are out of scope.
- Every task must end with test/type/lint/build evidence appropriate to that task.

---

### Task 1: Team-core validation helpers

**Files:**
- Create: `src/features/team-core/validation.ts`
- Create: `src/features/team-core/validation.test.ts`
- Create: `src/features/team-core/types.ts`

**Interfaces:**
- Produces `slugify(input: string): string`
- Produces `parseOrganizationForm(formData: FormData)`
- Produces `parseTeamForm(formData: FormData)`
- Produces `parseTeamMemberForm(formData: FormData)`
- Produces `MEMBER_KINDS` and `HANDBALL_POSITIONS`

- [ ] **Step 1: Write failing tests** for trimming names, slug normalization, invalid slug length/chars, member kind/position validation, optional shirt numbers, and `0..99` limits.
- [ ] **Step 2: Run `npm test -- src/features/team-core/validation.test.ts`** and verify RED because helpers do not exist.
- [ ] **Step 3: Implement minimal pure TypeScript parsers** returning `{ ok: true, value } | { ok: false, message }` and never throwing on malformed FormData.
- [ ] **Step 4: Run the targeted tests** and verify GREEN.
- [ ] **Step 5: Commit** with `feat: add team core validation`.

### Task 2: Database schema, RLS, and public RPCs

**Files:**
- Create: `supabase/migrations/20260825124000_team_core.sql`

**Interfaces:**
- Produces enums `membership_role`, `team_member_kind`, `handball_position`.
- Produces tables `profiles`, `organizations`, `organization_memberships`, `teams`, `team_user_memberships`, `team_members`.
- Produces helpers `is_organization_member(uuid)`, `is_organization_admin(uuid)`, `is_team_member(uuid)`, `is_team_admin(uuid)`.
- Produces RPCs `create_organization_with_admin(text,text)`, `create_team_with_admin(uuid,text,text)`, `get_public_team(text)`, `get_public_team_members(uuid)`.

- [ ] **Step 1: Write the migration SQL in GitHub first** with constraints, indexes, RLS enabled on every table, fixed `search_path` on security-definer functions, explicit grants/revokes, and public RPC result columns limited to safe fields.
- [ ] **Step 2: Review SQL statically** for recursive RLS, missing `auth.uid()` checks, overly broad `anon` grants, and mutable `search_path`.
- [ ] **Step 3: Apply the exact committed SQL through Supabase migration tooling** using migration name `team_core`.
- [ ] **Step 4: Verify with SQL queries** that all six tables exist, `relrowsecurity=true`, required policies/functions exist, and public RPCs expose only their declared columns.
- [ ] **Step 5: Run Supabase Security Advisor** and resolve any new warnings attributable to this migration.
- [ ] **Step 6: Commit any migration corrections** as a new migration; never rewrite an already-applied migration.

### Task 3: Typed team-core data access

**Files:**
- Create: `src/features/team-core/data.ts`
- Create: `src/features/team-core/actions.ts`
- Modify: `src/app/app/page.tsx`

**Interfaces:**
- `listMyOrganizations()` returns organization id/name/slug/role.
- `listMyTeams()` returns team id/name/slug/org id/role/public flag.
- `getOrganizationForCurrentUser(id)` returns organization + role + teams or null.
- `getTeamForCurrentUser(id)` returns team + role + roster or null.
- Server Actions: `createOrganization`, `createTeam`, `createTeamMember`, `updateTeamMember`, `updateTeamVisibility`, `updateTeamMemberVisibility`.

- [ ] **Step 1: Add tests for action-safe error mapping** as pure helper cases where practical (duplicate slug, permission, generic database failure).
- [ ] **Step 2: Implement server-only data functions** using the existing request-scoped Supabase server client and authenticated session; do not create admin/service clients.
- [ ] **Step 3: Implement Server Actions** that call Task 1 parsers, Task 2 RPCs/CRUD, `revalidatePath`, and safe redirects.
- [ ] **Step 4: Replace the `/app` placeholder state** with real organization/team cards and a zero-data onboarding CTA.
- [ ] **Step 5: Run targeted tests, `npm run typecheck`, and `npm run lint`**.
- [ ] **Step 6: Commit** with `feat: connect team core data layer`.

### Task 4: Organization and team management UI

**Files:**
- Create: `src/app/app/organizations/new/page.tsx`
- Create: `src/app/app/organizations/[organizationId]/page.tsx`
- Create: `src/app/app/organizations/[organizationId]/teams/new/page.tsx`
- Create: `src/components/team-core/organization-form.tsx`
- Create: `src/components/team-core/team-form.tsx`

**Interfaces:**
- Organization form posts to `createOrganization`.
- Team form posts to `createTeam` with hidden `organizationId`.

- [ ] **Step 1: Build forms with semantic labels, large touch targets, validation hints, and editable slug fields** following existing Card/Field/Input/Button patterns.
- [ ] **Step 2: Render organization detail from `getOrganizationForCurrentUser`** and use `notFound()` when inaccessible/nonexistent.
- [ ] **Step 3: Hide Create team controls unless current role is `admin`**; RLS remains the true security boundary.
- [ ] **Step 4: Run `npm run typecheck`, `npm run lint`, and `npm run build`**.
- [ ] **Step 5: Commit** with `feat: add organization and team management`.

### Task 5: Roster and staff management UI

**Files:**
- Create: `src/app/app/teams/[teamId]/page.tsx`
- Create: `src/app/app/teams/[teamId]/members/new/page.tsx`
- Create: `src/app/app/teams/[teamId]/members/[memberId]/edit/page.tsx`
- Create: `src/components/team-core/member-form.tsx`
- Create: `src/components/team-core/roster-list.tsx`

**Interfaces:**
- `member-form.tsx` accepts optional initial values and an action function.
- Team detail consumes `getTeamForCurrentUser` and renders roster by kind/status.

- [ ] **Step 1: Render team summary and roster** with shirt number, display/full name, kind, position, grade/age, active/public status.
- [ ] **Step 2: Add admin-only create/edit controls** while keeping all rows readable to team members.
- [ ] **Step 3: Implement create/edit forms** including player/staff selector, optional position, shirt number, grade/age, active/public toggles, and copy warning that public data is visible on the internet.
- [ ] **Step 4: Add team-level public toggle** and member-level public toggle, both defaulting false in the database and UI.
- [ ] **Step 5: Run targeted tests plus typecheck/lint/build**.
- [ ] **Step 6: Commit** with `feat: add roster management`.

### Task 6: Public team page and end-to-end verification

**Files:**
- Create: `src/app/teams/[slug]/page.tsx`
- Create: `src/features/team-core/public-data.ts`
- Modify: `docs/superpowers/plans/2026-08-25-phase-2-team-core.md`

**Interfaces:**
- `getPublicTeamBySlug(slug)` calls `get_public_team`.
- `getPublicTeamMembers(teamId)` calls `get_public_team_members`.

- [ ] **Step 1: Implement public data functions** using only the sanitized RPCs; do not query private team/member tables from the public route.
- [ ] **Step 2: Build `/teams/[slug]`** with team name/description and only public roster rows; private/nonexistent teams use `notFound()`.
- [ ] **Step 3: Run the full local/CI command set**: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- [ ] **Step 4: Verify GitHub Actions is green** for the latest commit.
- [ ] **Step 5: Verify Vercel Preview reaches READY** and core pages render without runtime configuration errors.
- [ ] **Step 6: Perform live E2E with the authenticated test account**: create organization → create team → add player → add staff → view roster → enable team/member public flags → open public page → confirm private member remains absent.
- [ ] **Step 7: Re-run Supabase Security Advisor** and record result.
- [ ] **Step 8: Open a draft Phase 2 pull request** with base `phase-1-foundation` while PR #1 remains unmerged; retarget to `main` after Phase 1 is merged.
