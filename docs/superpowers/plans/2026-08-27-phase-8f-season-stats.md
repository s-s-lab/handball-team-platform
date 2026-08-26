# Phase 8F Seasons and Player Statistics Implementation Plan

> **Execution:** Follow the approved Phase 8 Team Workspace design, TDD for behavior changes, Supabase migrations for DDL, and fresh browser verification before completion.

**Goal:** Make the existing `成績` navigation a real season-aware team statistics workspace. Team admins can create seasons, choose the current season, associate matches with seasons, and enter player season totals after games. All team members can browse season W-D-L, player rankings, and player history.

**Architecture:** Add `seasons` and `season_player_stats` as internal RLS-protected tables and add nullable `matches.season_id`. Keep final scores in `match_state`; derive team W-D-L from finished matches linked to the selected season. Keep staff-entered season totals authoritative for Phase 8F while preserving future automatic aggregation from `match_events`.

**Tech Stack:** Next.js App Router, React 19 server components/actions, TypeScript, Tailwind CSS v4, Supabase PostgreSQL/RLS/RPC, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-26-phase-8-team-workspace-design.md`

## Product decisions

- Season statistics are internal team-workspace data; no anonymous access.
- Team members may read seasons/stats; only team admins may mutate them.
- `team_members.kind` remains descriptive and never grants authorization.
- Exactly one current season per team is enforced by a partial unique index and transaction-safe RPC.
- `save_percentage` and `goals_per_appearance` are derived in application code, never stored.
- Stats are manually entered totals per player/season in Phase 8F.
- Finished match W-D-L comes only from `matches` + `match_state`, never from manually entered player totals.
- Existing Match Console, offline queue, public LIVE, and public portal behavior must not regress.

## Task 1: Season/stat domain runtime

Create `src/features/season-stats/runtime.ts` and tests.

- validate/normalize season selection helpers
- derive W-D-L from finished season matches and team side
- derive save percentage and goals per appearance safely
- sort scoring leaderboard and goalkeeper leaderboard
- handle zero appearances/shots without divide-by-zero

TDD: RED first, then minimal implementation, then GREEN.

## Task 2: Supabase schema and authorization

Create migration `supabase/migrations/20260827080000_seasons_and_player_stats.sql`.

### `seasons`
- id uuid PK
- team_id FK -> teams
- name text 1..80
- start_date date
- end_date date
- is_current boolean default false
- timestamps
- check start_date <= end_date
- unique `(team_id, name)`
- partial unique current-season index per team
- indexes for team/date access

### `season_player_stats`
- id uuid PK
- season_id FK -> seasons cascade
- team_member_id FK -> team_members cascade
- appearances, starts, goals, seven_meter_goals, seven_meter_attempts
- warnings, two_minute_suspensions, disqualifications
- saves, shots_faced
- notes nullable <=2000
- updated_by nullable auth user
- timestamps
- non-negative checks
- seven_meter_goals <= seven_meter_attempts
- saves <= shots_faced
- unique `(season_id, team_member_id)`

### `matches`
- add nullable `season_id` FK -> seasons on delete set null
- add `(team_id, season_id, scheduled_at)` index
- enforce team consistency through admin RPCs/actions rather than broad direct writes

### RLS / RPC
- authenticated team members can SELECT seasons and season stats for their teams
- team admins can create/update/delete seasons and upsert stats
- anon gets no direct table access
- RPC to create/update season and transactionally switch current season
- RPC to set a match season with team/season consistency check
- RPC to bulk upsert season player totals with team-member consistency checks

Apply with Supabase migration API and verify permissions.

## Task 3: Season data layer and validation

Create `src/features/season-stats/types.ts`, `data.ts`, `validation.ts` and tests.

Expose:
- list seasons for team
- selected/current season
- season matches with final scores
- season player stats joined to roster identity
- all team matches needed for admin season assignment

Validation:
- season name/date range/current flag
- stats integer ranges
- 7m goals <= attempts
- saves <= shots faced
- notes length
- UUID/team consistency handled by DB RPC as final authority

## Task 4: Statistics workspace

Create `/app/teams/[teamId]/stats/page.tsx` and components.

UI:
- dark sports header: `成績`
- season selector
- current-season badge
- W-D-L and goals for/against summary
- top scorers
- goalkeeper save percentage leaderboard when data exists
- player stat table/cards
- clear empty states
- responsive desktop table + mobile-friendly player blocks

Admins also see:
- `シーズン管理`
- `選手成績を編集`
- `試合のシーズン割り当て`

## Task 5: Season management

Create admin server actions/forms for:
- create season
- mark season current
- edit season dates/name where practical

Use RPC transaction for current-season switching.

After first season creation, current season may be selected immediately when requested; do not silently rewrite existing match season assignments.

## Task 6: Match-season assignment

Add admin assignment UI inside stats workspace.

- list recent/all matches with date/opponent/current season
- choose a season or unassigned
- save through team-consistency RPC
- new/manual match forms should offer available seasons when a team has seasons; current season is the default selection
- existing matches remain editable through assignment UI

## Task 7: Bulk player-stat editor

Create `/app/teams/[teamId]/stats/[seasonId]/edit`.

- one row/card per active player plus any inactive player already carrying stats
- fields for appearances, starts, goals, 7m goals/attempts, warnings, 2-min suspensions, DQ, saves, shots faced, notes
- bulk submit once per season
- server-side validation plus RPC atomic upsert
- derived values shown read-only

## Task 8: Member profile and dashboard integration

- member profile displays season-stat history from newest season to oldest
- team dashboard current-season W-D-L uses selected current season when one exists
- top scorer can use staff-entered current-season totals while preserving event-derived fallback when no season stats exist

## Task 9: Verification

- Supabase live schema/RLS/RPC verification
- non-admin write denied / admin write path verified without leaving test fixtures
- stats constraints verified
- one-current-season invariant verified
- match-season team consistency verified
- security/performance advisors run after DDL
- fresh final GitHub Actions on final HEAD: Unit, TypeScript, ESLint, Production build, Playwright all success
- inspect Vercel Preview and perform responsive visual check if available
- do not merge to `main` without explicit user request

## Completion Gate

Phase 8F is complete when a team can maintain seasons, link matches, review season W-D-L, staff-enter player totals in bulk, browse derived leaderboards and player history, and all existing Match Console/offline/public-LIVE regressions remain green.
