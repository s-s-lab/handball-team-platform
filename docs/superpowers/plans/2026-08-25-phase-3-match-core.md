# Phase 3 Match Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for completed work.

**Goal:** Let any team user member create a handball match with editable rules, snapshot a participating roster, and review the setup before Match Console is added.

**Architecture:** `matches` owns match metadata, `match_rules` stores one-to-one per-match configuration, and `match_rosters` stores historical snapshots copied by PostgreSQL from Team Core roster rows. RLS authorizes actual team membership; public access is not expanded in this phase. Match events/state/timer remain isolated to Phase 4.

**Tech Stack:** Next.js 16.x, React 19.x, TypeScript, Tailwind CSS 4.x, shadcn/ui source components, Supabase PostgreSQL/Auth, Vitest, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-25-match-core-design.md`

## Global Constraints

- GitHub is the source of truth for application and migration code.
- Do not use or commit a Supabase service-role key.
- Match authorization derives from `team_user_memberships`, for both `admin` and `member` roles.
- Opponents do not need platform accounts; Phase 3 stores `opponent_name` only.
- Match roster snapshots are copied from trusted `team_members` rows in PostgreSQL, never browser snapshot fields.
- Phase 3 introduces no anonymous match-table access.
- `match_events`, `match_state`, timer runtime, scoring, Realtime and offline sync remain out of scope.
- All application mutations parse user input before database calls and rely on RLS/RPC validation as the final boundary.

---

### Task 1: Match types and validation

**Files:** `src/features/matches/types.ts`, `src/features/matches/validation.ts`, `src/features/matches/validation.test.ts`

- [x] Commit failing parser tests first, covering HOME/AWAY, malformed UUIDs, required fields, invalid calendar datetimes, Tokyo conversion, rule ranges and deduplicated roster IDs.
- [x] Observe real RED in GitHub CI because `./validation` did not exist; the pre-existing 31 tests passed.
- [x] Implement typed match/rule/roster inputs and parsers using seconds internally.
- [x] Verify parser tests and the full CI command set GREEN.

### Task 2: Match schema, RLS and atomic RPCs

**Files:**
- `supabase/migrations/20260825140000_match_core.sql`
- `supabase/migrations/20260825141000_match_roster_configured.sql`

- [x] Commit the base match migration before applying it.
- [x] Create `matches`, `match_rules`, `match_rosters`, constraints/indexes, RLS, and no anonymous access.
- [x] Implement atomic `create_match_with_rules(...)` for authenticated team members.
- [x] Implement atomic `set_match_roster(uuid, uuid[])`, validating all IDs belong to the match team before replacement and copying snapshots from trusted `team_members` rows.
- [x] Apply the committed base migration through Supabase migration tooling.
- [x] During roster UI implementation, identify that zero saved rows cannot distinguish “never configured” from “intentionally empty”; add a new migration rather than rewriting the applied migration.
- [x] Add `matches.roster_configured_at` and update it on every successful roster save, including zero selections.
- [x] Verify all three tables have RLS enabled; anonymous users cannot execute match RPCs; public RPC wrappers use `SECURITY INVOKER`; elevated implementations remain in the `private` schema.
- [x] Run Security Advisor. No warning is attributable to Phase 3. The only remaining warning is the pre-existing Auth setting `auth_leaked_password_protection`.

### Task 3: Match data access, actions and creation UI

**Files:**
- `src/features/matches/data.ts`
- `src/features/matches/actions.ts`
- `src/components/matches/match-form.tsx`
- `src/app/app/teams/[teamId]/matches/new/page.tsx`
- `src/app/app/teams/[teamId]/page.tsx`

- [x] Implement RLS-scoped `listTeamMatches(teamId)` and `getMatchForCurrentUser(matchId)`.
- [x] Implement `createMatch(formData)` with parser validation, atomic RPC, Japanese safe errors, cache revalidation and roster-page redirect.
- [x] Build match creation form with HOME/AWAY, Japan `datetime-local`, venue/memo/public flag and editable rule values.
- [x] Use defaults 2 × 30 min, halftime 10 min, overtime disabled with 2 × 5 min values, TTO 2/game, 1/period, 60 sec.
- [x] Add match list and `試合を作成` action to team detail for both `admin` and `member` team roles.
- [x] Verify Unit tests, TypeScript, ESLint and production build GREEN.

### Task 4: Match roster snapshot selection

**Files:**
- `src/components/matches/match-roster-form.tsx`
- `src/app/app/matches/[matchId]/roster/page.tsx`
- `src/features/matches/actions.ts`
- `src/features/matches/data.ts`

- [x] Use the roster parser contract: malformed IDs fail before RPC and duplicate IDs are deduplicated.
- [x] Read only active source `team_members` for selection candidates.
- [x] Select all active members by default only before the first save; after configuration, preserve the exact saved selection including an intentionally empty roster.
- [x] Build player/staff selection UI with shirt number, internal name, kind and position.
- [x] Implement `saveMatchRoster`. Browser payload contains only match/member IDs; snapshot name/number/position are copied in PostgreSQL.
- [x] Verify Unit tests, TypeScript, ESLint and production build GREEN.

### Task 5: Match detail and integration verification

**Files:**
- `src/app/app/matches/[matchId]/page.tsx`
- this plan

- [x] Build match detail with opponent, HOME/AWAY, Japan time, venue/memo, rule summary and roster snapshots.
- [x] Add roster-edit action and intentionally disabled MATCH CONSOLE action without fake score/live state.
- [x] Create stacked Draft PR #3 targeting `phase-2-team-core`: `https://github.com/s-s-lab/handball-team-platform/pull/3`.
- [x] Verify latest feature commit `286000bbd261b98944b8d460dfa61ed19ad25346` through GitHub Actions run `32849694257`: Unit tests, TypeScript, ESLint and Production build all success.
- [x] Verify Vercel Preview deployment `dpl_3RtBzAhQ8ofxY9ryYbJL6mYGuHAj` is READY and `/login` returns HTTP 200 with the expected runtime configuration.
- [x] Run authenticated transactional SQL E2E using an actual `authenticated` role context.
- [x] E2E result: `match_created=true`, `rules_created=true`, `snapshot_unchanged=true`, `cross_team_rejected=true`, `roster_preserved_after_reject=true`, `empty_save_count=0`, `roster_configured=true`.
- [x] Roll back E2E and verify zero test organizations, teams and matches remain.
- [x] Re-run Security Advisor after the supplemental migration; no Phase 3 migration warning is present.

## Phase 3 Result

Phase 3 is complete on branch `phase-3-match-core` and remains intentionally unmerged as stacked Draft PR #3. Match runtime events, current projection, clock, scoring, undo and finish behavior proceed in Phase 4.
