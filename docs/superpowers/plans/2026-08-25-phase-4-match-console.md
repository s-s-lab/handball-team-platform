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

- [ ] Write failing tests first for stopped/running clocks, clamping to period duration, normal vs overtime duration, `00:00`, `18:42`, and exact end-of-period formatting.
- [ ] Observe RED in CI because `runtime.ts` does not exist.
- [ ] Implement minimal pure helpers.
- [ ] Verify targeted tests and full CI GREEN.

### Task 2: Runtime schema and action engine

**Files:**
- Create: `supabase/migrations/20260825150000_match_console_runtime.sql`

**Interfaces:**
- Produces enum `match_event_type`.
- Produces tables `match_events`, `match_state`.
- Produces trigger/backfill initialization.
- Produces authenticated `get_match_console_snapshot(uuid) -> jsonb`.
- Produces authenticated `apply_match_action(uuid, uuid, bigint, text, jsonb) -> jsonb`.

- [ ] Commit migration before applying it.
- [ ] Add append-only event table and current-state table with RLS and indexes.
- [ ] Create state initialization trigger and backfill existing matches.
- [ ] Implement private snapshot JSON helper including `server_now`, match status and current-period duration.
- [ ] Implement idempotent action engine with `FOR UPDATE` state lock and `expected_version` check.
- [ ] Implement START/STOP/RESET, period, goal, undo and finish semantics exactly as spec.
- [ ] Prevent direct event/state mutations by application roles and prevent anonymous runtime reads/writes.
- [ ] Apply committed migration and verify security/grants/RLS.
- [ ] Run Security Advisor and fix only new Phase 4 findings through additive migrations.

### Task 3: Authenticated database E2E

**Files:**
- No production file unless a migration correction is needed.

- [ ] In a transaction under real `authenticated` role context, create temporary team/match/roster.
- [ ] Verify snapshot version starts at 0 and state row exists.
- [ ] START with version 0 and verify version 1 + match `live` + clock anchor.
- [ ] Retry identical `client_action_id`; verify version/score do not change.
- [ ] Attempt stale expected version with a new action id; verify SQLSTATE `40001` and unchanged state.
- [ ] STOP after controlled DB-time adjustment or state anchor adjustment; verify elapsed materializes and clock stops.
- [ ] Add HOME goal, add AWAY goal, undo last goal; verify correct score and append-only related event.
- [ ] Change period; verify clock reset/stopped and period duration selection.
- [ ] Finish match; verify status `finished`, clock stopped, score preserved, subsequent mutation rejected.
- [ ] Roll back and verify no E2E data remains.

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

- [ ] Write failing action-parser tests before parser implementation.
- [ ] Observe RED, then implement the narrow action parser.
- [ ] Implement server data aggregation under RLS.
- [ ] Implement mutation action with `40001` conflict mapping and generic safe errors.
- [ ] Verify tests/type/lint/build.

### Task 5: MATCH CONSOLE UI

**Files:**
- Create: `src/components/match-console/match-console.tsx`
- Create: `src/app/app/matches/[matchId]/console/page.tsx`
- Modify: `src/app/app/matches/[matchId]/page.tsx`

**Interfaces:**
- Client component receives initial authoritative snapshot + labels/rules and uses server action responses to replace local state.

- [ ] Build tablet-landscape-first full console with huge timer/scores and large touch targets.
- [ ] Implement local display tick using `server_now` offset and persisted clock anchor; do not emit per-second writes.
- [ ] Wire START/STOP, RESET, period previous/next, HOME/AWAY +1, undo last goal and finish.
- [ ] Generate a new `client_action_id` for every user intent and preserve it while the same request is pending.
- [ ] Disable conflicting controls while a request is pending and after match finish.
- [ ] On `40001`, replace local state with latest authoritative snapshot and show the conflict message.
- [ ] Replace Phase 3 disabled MATCH CONSOLE button with working route.
- [ ] Verify responsive layout by build/runtime inspection available in this environment.

### Task 6: Final verification and stacked PR

**Files:**
- Modify: `docs/superpowers/plans/2026-08-25-phase-4-match-console.md`

- [ ] Run full GitHub CI and require Unit tests, TypeScript, ESLint and Production build GREEN.
- [ ] Verify latest Vercel Preview READY and `/login` runtime page HTTP 200.
- [ ] Re-run Supabase Security Advisor and confirm no Phase 4 migration warning.
- [ ] Create Draft PR targeting `phase-3-match-core`.
- [ ] Record migration/E2E/CI/Vercel evidence in this plan.
