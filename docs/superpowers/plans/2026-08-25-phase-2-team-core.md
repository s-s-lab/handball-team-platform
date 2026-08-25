# Phase 2 Team Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users create an organization, create teams, manage player/staff roster records, and expose an opt-in sanitized public team profile.

**Architecture:** PostgreSQL + RLS is the authorization boundary. Public bootstrap RPCs execute as invokers and delegate atomic organization/team creation to non-exposed `private` security-definer helpers. Normal roster CRUD uses the user's Supabase session under RLS. Anonymous reads receive only safe column grants and public-row RLS; public RPCs are security-invoker wrappers over those restricted rows/columns. Next.js Server Components read data and Server Actions validate FormData and mutate data without service-role credentials.

**Tech Stack:** Next.js 16.x, React 19.x, TypeScript, Tailwind CSS 4.x, shadcn/ui source components, Supabase PostgreSQL/Auth, Vitest, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-25-team-core-design.md`

## Global Constraints

- GitHub is the single source of truth for migration SQL and application code.
- No service-role key or secret may be committed or used in browser/server application code.
- Authorization must use RLS/database membership, never `user_metadata`.
- Public team/member data is opt-in and sanitized through RLS, safe column grants, and public RPCs.
- `team_members` remains separate from `auth.users` with an optional `linked_user_id`.
- A public roster member must have an explicit non-empty `display_name`; `full_name` is never an anonymous-readable column.
- Match-related tables and behavior are out of scope.
- Every task must end with test/type/lint/build evidence appropriate to that task.

---

### Task 1: Team-core validation helpers

- [x] Write failing tests for name/slug/member validation and observe RED.
- [x] Implement `slugify`, organization/team/member FormData parsers, enums/types.
- [x] Add and verify the public-member rule: `isPublic=true` requires an explicit public display name.
- [x] Verify targeted tests GREEN.

### Task 2: Database schema, RLS, and public RPCs

- [x] Commit migration SQL before applying it.
- [x] Create `profiles`, `organizations`, `organization_memberships`, `teams`, `team_user_memberships`, and `team_members` plus role/member enums and indexes.
- [x] Enable RLS on every exposed table and use membership-based authorization.
- [x] Harden membership helpers into the non-exposed `private` schema.
- [x] Make organization/team bootstrap atomic without granting direct anonymous/admin bypass access.
- [x] Restrict anonymous team/member reads to explicitly safe columns and public rows.
- [x] Add a DB constraint requiring non-empty `display_name` for public roster rows.
- [x] Remove the former public `full_name` fallback.
- [x] Apply all migrations through Supabase migration tooling.
- [x] Run Security Advisor and resolve every warning attributable to Phase 2 migrations.

Applied migrations:

- `20260825124000_team_core.sql`
- `20260825125000_team_core_security_hardening.sql`
- `20260825130000_team_core_atomic_bootstrap.sql`
- `20260825131000_public_member_display_name.sql`
- `20260825132000_public_roster_use_rls.sql`

### Task 3: Typed team-core data access

- [x] Add action-safe error mapping tests and observe RED before implementation.
- [x] Implement `listMyOrganizations`, `listMyTeams`, `getOrganizationForCurrentUser`, and `getTeamForCurrentUser` using the existing request-scoped Supabase client.
- [x] Implement Server Actions for organization/team/member creation and team/member visibility updates.
- [x] Replace `/app` placeholder content with real organization/team data and zero-data onboarding.
- [x] Verify tests, TypeScript, ESLint, and production build.

### Task 4: Organization and team management UI

- [x] Implement organization creation with editable auto-generated slug.
- [x] Implement organization detail with role-aware team creation action.
- [x] Implement team creation under an authorized organization.
- [x] Keep RLS as the security boundary; UI only hides actions for usability.
- [x] Verify TypeScript, ESLint, and production build.

### Task 5: Roster and staff management UI

- [x] Implement team summary and roster grouped by active/inactive state.
- [x] Implement admin-only member create/edit controls.
- [x] Implement player/staff, shirt number, GK/LW/LB/CB/RB/RW/PV, grade/age, active, and public fields.
- [x] Default member public visibility to false and require a public display name before publishing.
- [x] Implement team-level and member-level public toggles.
- [x] Add clear copy that published member data is visible on the internet.
- [x] Verify tests, TypeScript, ESLint, and production build.

### Task 6: Public team page and end-to-end verification

- [x] Implement `getPublicTeamBySlug` and `getPublicTeamMembers` using public RPCs only.
- [x] Add a pure public-roster shaping test, observe RED, and implement a second-layer empty-display-name filter.
- [x] Build `/teams/[slug]` with team information and public roster only.
- [x] Verify latest GitHub Actions quality job: unit tests, TypeScript, ESLint, production build all GREEN.
- [x] Verify latest Vercel Preview reaches READY.
- [x] Run authenticated DB/RLS E2E: create organization → create team → add public player → add private staff → publish team → switch to anonymous role. Result: authenticated roster count `2`, admin role `admin`, public team count `1`, public roster count `1`, public name only `E2E Player`. Transaction rolled back with zero residue.
- [x] Run Vercel runtime E2E with temporary real Supabase rows. `/teams/preview-e2e-team-202608252102` returned HTTP 200 and rendered only `Preview E2E Player` (#7, RB, U18); private staff and internal full names were absent. Temporary rows were deleted and zero residue verified.
- [x] Re-run Supabase Security Advisor. No Phase 2 migration warning remains; only the project-level `auth_leaked_password_protection` warning remains.
- [x] Draft PR #2 remains stacked on `phase-1-foundation` until the earlier phase is merged.

## Verification limitation

The connector environment cannot reuse the user's already-authenticated browser cookie to click the protected `/app` forms directly. Therefore the authenticated UI click-through itself is not browser-automated here. The underlying Server Action code passes CI/build, the authorization/data path is verified with the real authenticated Supabase role, and the public page is verified against the deployed Vercel Preview with real temporary data. This is a verification-tool limitation, not a known product defect.

## Phase 2 status

Implementation and available automated/integration verification are complete. Phase 2 stays as a draft stacked PR while development proceeds to Match Core.
