# Phase 8E Match Results Implementation Plan

> **For agentic workers:** Use the approved Phase 8 Team Workspace design and TDD for behavior changes.

**Goal:** Turn the existing match-operation surface into a complete match/results workspace where users can browse upcoming and completed matches and team admins can register historical results without reconstructing event-by-event match-console data.

**Architecture:** Keep `matches`, `match_state`, `match_rules`, `match_rosters`, and `match_events` as the single match domain. Add conservative result metadata to `matches`, derive W/D/L from `match_state`, and create historical results through one database RPC that atomically creates the match, initializes default rules/state, writes the final score, marks the match finished, and lets the existing `team_events` trigger create the linked schedule row.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Supabase PostgreSQL/RLS/RPC, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-26-phase-8-team-workspace-design.md`

## Constraints

- Preserve Match Console, offline queue, PWA, public LIVE, and match-event history behavior.
- Do not create a parallel results table.
- Console-recorded final scores remain sourced from `match_state`.
- Historical/manual results do not require reconstructed `match_events`.
- Only team admins receive the historical-result UI/RPC permission; ordinary team members can still use existing Match Console behavior as currently designed.
- Do not add season tables in Phase 8E; Phase 8F owns seasons and player statistics.
- Existing match/schedule synchronization remains authoritative.

### Task 1: Result-domain runtime

**Create** `src/features/match-results/runtime.ts` and tests.

- [ ] RED tests for team-side score mapping, W/D/L classification, upcoming/completed grouping, newest-result ordering, and score availability.
- [ ] Implement pure result helpers.
- [ ] GREEN.

### Task 2: Result metadata + manual-result RPC

**Create** migration `supabase/migrations/20260827070000_match_results.sql`.

Add to `matches`:
- `competition_name text null` (<=120)
- `completed_at timestamptz null`
- `result_source text not null default 'console' check in ('console','manual')`

Add `public.create_manual_match_result(...) returns uuid` backed by a security-definer internal function that:
- requires `private.is_team_admin(team_id)`
- inserts a finished match with metadata
- inserts default indoor rules
- relies on existing match-state initializer, then sets home/away final score and stopped clock
- sets `completed_at`
- returns the match id

Keep anon revoked; authenticated execute only.

### Task 3: Result-aware match data query

**Modify** match types/data to expose score, competition, result source, completed time in team match lists without changing match-console APIs.

- [ ] Tests for data shaping/mapping.
- [ ] Query matches + match_state and produce `TeamMatchResultItem[]`.

### Task 4: Dedicated Matches / Results workspace

**Create** `/app/teams/[teamId]/matches/page.tsx` and `MatchResultsBoard`.

UI:
- page hero/header with “試合”
- `これから` and `結果` sections or clear filter controls
- score-forward completed rows with WIN/DRAW/LOSS
- date, competition, opponent, venue
- links to existing match detail/console
- admin actions: `試合を作成`, `過去の結果を登録`
- empty states

TDD component/route tests first.

### Task 5: Historical result form

**Create** `/app/teams/[teamId]/matches/history/new/page.tsx`, form, validation, server action.

Fields:
- competition/match name
- opponent
- date/time
- venue
- home/away
- our score
- opponent score
- memo
- public toggle

Validation:
- team UUID
- required names/date
- score 0–199 integers
- length limits

Submit via manual-result RPC and redirect to match detail.

### Task 6: Dashboard/result integration

Use result-aware data for recent-result rendering where needed; preserve existing scorer/event aggregation. Ensure the team workspace navigation resolves to the new matches page.

### Task 7: Supabase verification + regressions

- [ ] Apply migration through Supabase migration API.
- [ ] Verify columns/RPC permissions and RLS behavior.
- [ ] Run security/performance advisors after DDL.
- [ ] Fresh final CI on final HEAD: all unit tests, TypeScript, ESLint, production build, and Playwright must pass.
- [ ] Do not merge to main without explicit user request.

## Completion Gate

Phase 8E is complete when the dedicated match workspace clearly separates upcoming matches and results, final scores and W/D/L render correctly, admins can atomically add historical final results, those results create exactly one linked schedule event through existing synchronization, and all existing Match Console/offline/public-LIVE regression checks stay green.