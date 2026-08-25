# Phase 4 Match Console Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reliable authenticated MATCH CONSOLE with authoritative timer, period, score, goal undo and finish state using the approved Event + State architecture.

**Architecture:** PostgreSQL owns accepted actions and current state. `match_events` is append-only, `match_state` is a one-row projection, and a single atomic `apply_match_action` RPC enforces team authorization, idempotency and optimistic concurrency. React only animates the timer between confirmed server snapshots.

**Tech Stack:** Next.js 16.x, React 19.x, TypeScript, Tailwind CSS 4.x, Supabase PostgreSQL/Auth, Vitest, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-25-match-console-runtime-design.md`

## Global Constraints

- No service-role key in application code.
- Both team `admin` and `member` roles can operate matches.
- Anonymous LIVE access, Realtime subscriptions and offline IndexedDB queue are not Phase 4 scope.
- Runtime writes must go through one atomic RPC; application roles get no direct event/state mutation grants.
- Every accepted action increments state `version` exactly once.
- `(match_id, client_action_id)` makes retries idempotent.
- A version mismatch must reject without partial mutation.
- Match events are append-only.
- Timer display advances locally; PostgreSQL is not updated every second.

---

### Task 1: Pure timer/runtime helpers

**Files:**
- Create: `src/features/match-console/runtime.ts`
- Test: `src/features/match-console/runtime.test.ts`

**Interfaces:**
- `effectiveElapsedMs(snapshot, serverNowMs): number`
- `periodDurationMs(snapshot): number`
- `formatClock(elapsedMs): string`
- Types `ConsoleRuntimeSnapshot`, `ConsolePeriodRules`

- [x] Write failing tests first for stopped/running clocks, clamping to period duration, normal vs overtime duration, `00:00`, `18:42`, and exact end-of-period formatting.
- [x] Observe RED before runtime implementation.
- [x] Implement minimal pure helpers.
- [x] Verify targeted tests and full CI GREEN.

### Task 2: Runtime schema and action engine

**Files:**
- Create: `supabase/migrations/20260825150000_match_console_runtime.sql`
- Create: `supabase/migrations/20260825150100_match_console_security_hardening.sql`

**Interfaces:**
- Produces enum `match_event_type`.
- Produces tables `match_events`, `match_state`.
- Produces trigger/backfill initialization.
- Produces authenticated `get_match_console_snapshot(uuid) -> jsonb`.
- Produces authenticated `apply_match_action(uuid, uuid, bigint, text, jsonb) -> jsonb`.

- [x] Commit migration before applying it.
- [x] Add append-only event table and current-state table with RLS and indexes.
- [x] Create state initialization trigger and backfill existing matches.
- [x] Implement private snapshot JSON helper including `server_now`, match status and current-period duration.
- [x] Implement idempotent action engine with `FOR UPDATE` state lock and `expected_version` check.
- [x] Implement START/STOP/RESET, period, goal, undo and finish semantics exactly as spec.
- [x] Prevent direct event/state mutations by application roles and prevent anonymous runtime reads/writes.
- [x] Apply committed migration and verify security/grants/RLS.
- [x] Run Security Advisor and fix Phase 4 runtime grants through additive hardening migration.

### Task 3: Authenticated database E2E

**Files:**
- No production file unless a migration correction is needed.

- [x] Under the real `authenticated` role context, create a temporary team/match/roster fixture.
- [x] Verify snapshot version starts at 0 and state row exists.
- [x] START with version 0 and verify version 1 + match `live` + clock anchor.
- [x] Retry identical `client_action_id`; verify version/score and event count do not change.
- [x] Attempt stale expected version with a new action id; verify SQLSTATE `40001` and unchanged state.
- [x] STOP after a controlled 5-second state-anchor adjustment; verify elapsed materializes and clock stops.
- [x] Add HOME goal, add AWAY goal, undo last goal; verify score and append-only `goal_reverted` event.
- [x] Change period; verify clock resets/stops and period changes.
- [x] Finish match; verify status `finished`, clock stopped, score preserved, subsequent mutation rejected with SQLSTATE `22023`.
- [x] Delete the temporary fixture in the same verification transaction and verify organization/team/match counts return to zero.

### Task 4: Console data/actions

**Files:**
- Create: `src/features/match-console/data.ts`
- Create: `src/features/match-console/actions.ts`
- Create: `src/features/match-console/types.ts`
- Test: `src/features/match-console/validation.test.ts`
- Create: `src/features/match-console/validation.ts`

**Interfaces:**
- `getMatchConsoleForCurrentUser(matchId)` returns metadata/rules/roster/runtime snapshot or null.
- `parseConsoleAction(formData)` validates match/action IDs, version and action payload.
- `applyConsoleAction(formData)` calls `apply_match_action` and returns a serializable result rather than redirecting.

- [x] Write failing action-parser tests before parser implementation.
- [x] Observe RED, then implement the narrow action parser.
- [x] Implement server data aggregation under RLS.
- [x] Implement mutation action with `40001` conflict mapping and generic safe errors.
- [x] Verify tests/type/lint/build.

### Task 5: MATCH CONSOLE UI

**Files:**
- Create: `src/components/match-console/match-console.tsx`
- Create: `src/app/app/matches/[matchId]/console/page.tsx`
- Modify: `src/app/app/matches/[matchId]/page.tsx`

**Interfaces:**
- Client component receives initial authoritative snapshot + labels/rules and uses server action responses to replace local state.

- [x] Build tablet-landscape-first full console with huge timer/scores and large touch targets.
- [x] Implement local display tick using `server_now` offset and persisted clock anchor; do not emit per-second writes.
- [x] Wire START/STOP, RESET, period previous/next, HOME/AWAY +1, undo last goal and finish.
- [x] Generate a new `client_action_id` for every user intent and preserve the request while pending.
- [x] Disable conflicting controls while a request is pending and after match finish.
- [x] On `40001`, replace local state with latest authoritative snapshot and show the conflict message.
- [x] Replace Phase 3 disabled MATCH CONSOLE button with working route.
- [x] Verify build/runtime routing includes `/app/matches/[matchId]/console` and Vercel Preview compiles the tablet-oriented console UI.

### Task 6: Final verification and stacked PR

**Files:**
- Modify: `docs/superpowers/plans/2026-08-25-phase-4-match-console.md`

- [x] Run full GitHub CI and require Unit tests, TypeScript, ESLint and Production build GREEN.
- [x] Verify latest Vercel Preview READY and build output includes both `/login` and `/app/matches/[matchId]/console`. Direct `/login` HTTP-200 fetch from this connector remains blocked by Vercel Preview Protection/SSO, so no false 200 claim is recorded.
- [x] Re-run Supabase Security Advisor and confirm no Phase 4 migration warning. The only current warning is the existing Auth-level `Leaked Password Protection Disabled` setting.
- [ ] Create Draft PR targeting `phase-3-match-core`.
- [x] Record migration/E2E/CI/Vercel evidence in this plan.

## Verification Evidence — 2026-08-26

- Supabase migrations present: `match_console_runtime`, `match_console_security_hardening`.
- Security Advisor: no Match Console/RLS/DDL warning; only existing `auth_leaked_password_protection` warning remains.
- Authenticated SQL E2E: 15/15 checks passed. Verified initial state v0, START v1, idempotent retry, stale-version SQLSTATE `40001`, STOP with ~5s materialized elapsed time, HOME/AWAY goals, append-only goal revert, period change, FINISH v7, post-finish rejection, and cleanup to zero fixture rows.
- Latest verified GitHub commit before this evidence update: `3b83faffb6e81d45f0150dfac9fb2239a48e7f3b`.
- GitHub Actions run `32910674343`: Unit tests, TypeScript, ESLint, and Production build all succeeded.
- Vercel deployment `dpl_8KYsaCP6nMaMBPPLyCvNoErQtaCk`: READY.
- Vercel build Route output includes `ƒ /app/matches/[matchId]/console` and `ƒ /login`.
- A routing gap discovered during final verification was fixed: the console component existed, but the actual `/console` page and match-detail link were missing. Both are now connected and verified in Vercel build output.
