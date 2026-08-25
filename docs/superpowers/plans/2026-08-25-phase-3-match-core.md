# Phase 3 Match Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any team user member create a handball match with editable rules, snapshot a participating roster, and review the setup before Match Console is added.

**Architecture:** `matches` owns match metadata, `match_rules` is a one-to-one immutable-at-creation configuration that remains editable before/during setup, and `match_rosters` stores historical snapshots copied by the database from Team Core roster rows. RLS authorizes actual team membership; public access is not expanded in this phase. Match events/state/timer remain isolated to Phase 4.

**Tech Stack:** Next.js 16.x, React 19.x, TypeScript, Tailwind CSS 4.x, shadcn/ui source components, Supabase PostgreSQL/Auth, Vitest, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-25-match-core-design.md`

## Global Constraints

- GitHub is the source of truth for application and migration code.
- Do not use or commit a Supabase service-role key.
- Match authorization derives from `team_user_memberships`, for both `admin` and `member` roles.
- Opponents do not need platform accounts; Phase 3 stores `opponent_name` only.
- Match roster snapshots must be copied from trusted `team_members` rows in PostgreSQL, never trusted browser snapshot fields.
- Phase 3 introduces no anonymous match-table access.
- `match_events`, `match_state`, timer runtime, scoring, Realtime and offline sync are out of scope.
- All application mutations parse user input before database calls and rely on RLS/RPC validation as the final boundary.

---

### Task 1: Match types and validation

**Files:**
- Create: `src/features/matches/types.ts`
- Create: `src/features/matches/validation.ts`
- Test: `src/features/matches/validation.test.ts`

**Interfaces:**
- Produces `MATCH_SIDES = ["home", "away"] as const`.
- Produces `parseMatchForm(formData: FormData): ParseResult<MatchInput>`.
- Produces `parseRosterForm(formData: FormData): ParseResult<MatchRosterInput>`.
- Produces `japanLocalDateTimeToIso(value: string): string | null`.

- [ ] **Step 1: Commit failing parser tests first.** Include valid HOME match, AWAY match, invalid team UUID, required match/opponent name, invalid calendar datetime, Tokyo conversion, rule integer/range failures, and deduplicated roster UUID parsing.

Example required behavior:

```ts
expect(japanLocalDateTimeToIso("2026-08-30T13:30")).toBe("2026-08-30T04:30:00.000Z");
expect(japanLocalDateTimeToIso("2026-02-30T13:30")).toBeNull();
```

- [ ] **Step 2: Observe RED in CI** because `./validation` does not yet exist.
- [ ] **Step 3: Implement minimal types/parsers.** Rules returned by `parseMatchForm` must use seconds internally:

```ts
type MatchRulesInput = {
  periodCount: number;
  periodSeconds: number;
  halftimeSeconds: number;
  overtimeEnabled: boolean;
  overtimePeriodCount: number;
  overtimePeriodSeconds: number;
  teamTimeoutsPerGame: number;
  teamTimeoutsPerPeriod: number;
  teamTimeoutSeconds: number;
};
```

- [ ] **Step 4: Verify parser tests GREEN, then full CI GREEN.**

### Task 2: Match schema, RLS and atomic RPCs

**Files:**
- Create: `supabase/migrations/20260825140000_match_core.sql`

**Interfaces:**
- Produces enums `match_status`, `team_side`.
- Produces tables `matches`, `match_rules`, `match_rosters`.
- Produces `private.can_manage_match(uuid)`.
- Produces `create_match_with_rules(...) returns uuid`.
- Produces `set_match_roster(uuid, uuid[]) returns integer` where the integer is the selected-row count.

- [ ] **Step 1: Commit migration SQL before applying it.** Add constraints and indexes from the spec, enable RLS on all three tables, and revoke anonymous access.
- [ ] **Step 2: Implement match creation atomically.** The exposed RPC checks authenticated team membership and creates both rows in one transaction. It always writes `status='scheduled'`.
- [ ] **Step 3: Implement roster replacement atomically.** Validate every supplied `team_member_id` belongs to the match's team, delete previous snapshots, then insert snapshots with:

```sql
select
  p_match_id,
  tm.id,
  tm.kind,
  tm.full_name,
  tm.display_name,
  tm.shirt_number,
  tm.primary_position
from public.team_members tm
where tm.id = any(p_team_member_ids)
  and tm.team_id = v_team_id;
```

Reject the call if the count of distinct requested UUIDs differs from the count of validated rows.
- [ ] **Step 4: Apply the committed migration through Supabase migration tooling.**
- [ ] **Step 5: Verify tables/RLS/policies/function grants and run Security Advisor.** Resolve every warning attributable to this migration through a new migration rather than rewriting an applied migration.

### Task 3: Match data access, actions and creation UI

**Files:**
- Create: `src/features/matches/data.ts`
- Create: `src/features/matches/actions.ts`
- Create: `src/components/matches/match-form.tsx`
- Create: `src/app/app/teams/[teamId]/matches/new/page.tsx`
- Modify: `src/app/app/teams/[teamId]/page.tsx`

**Interfaces:**
- `listTeamMatches(teamId)` returns match list ordered by `scheduled_at`.
- `getMatchForCurrentUser(matchId)` returns match metadata + rules + roster or null.
- `createMatch(formData)` calls `create_match_with_rules` and redirects to `/app/matches/[id]/roster`.

- [ ] **Step 1: Add a failing pure-data shaping/error test if a new mapping helper is needed; otherwise rely on Task 1 parser RED coverage.**
- [ ] **Step 2: Implement server-only data reads under current-user RLS.** Query independent rules/roster data with `Promise.all` after the parent match is authorized.
- [ ] **Step 3: Implement `createMatch`.** Parse FormData, call the atomic RPC, map database errors to user-safe Japanese messages, revalidate team/app paths, redirect to roster selection.
- [ ] **Step 4: Build the match form.** Use existing Field/Input/Card/Button conventions; include HOME/AWAY, `datetime-local`, venue/memo/public toggle, and editable rule settings. Defaults are 2 x 30 min, halftime 10 min, overtime 2 x 5 min disabled, team timeouts 2/game and 1/period, 60 seconds.
- [ ] **Step 5: Add `試合を作成` and match list to team detail for any team user role, not admin only.**
- [ ] **Step 6: Verify tests, TypeScript, ESLint, and production build.**

### Task 4: Match roster snapshot selection

**Files:**
- Create: `src/components/matches/match-roster-form.tsx`
- Create: `src/app/app/matches/[matchId]/roster/page.tsx`
- Modify: `src/features/matches/actions.ts`
- Modify: `src/features/matches/data.ts`

**Interfaces:**
- `listActiveTeamMembersForMatch(matchId)` returns active source roster plus current selected IDs.
- `saveMatchRoster(formData)` parses UUIDs, calls `set_match_roster`, and redirects to match detail.

- [ ] **Step 1: Use Task 1 roster parser tests as the mutation input contract.** Duplicate UUIDs are deduplicated; malformed IDs fail before RPC.
- [ ] **Step 2: Implement source-roster read.** Only active `team_members` from the match team are candidates. Existing snapshots map back to selected IDs when the linked source row still exists.
- [ ] **Step 3: Build the selection UI.** Checkboxes default selected for all active team members only when the match has no saved snapshots; after first save, preserve the saved selection. Include shirt number, name, kind and position for quick scanning.
- [ ] **Step 4: Implement `saveMatchRoster` and verify no browser-provided name/number/position is sent to the snapshot RPC.**
- [ ] **Step 5: Verify tests, TypeScript, ESLint, and production build.**

### Task 5: Match detail and integration verification

**Files:**
- Create: `src/app/app/matches/[matchId]/page.tsx`
- Modify: `docs/superpowers/plans/2026-08-25-phase-3-match-core.md`

**Interfaces:**
- Match detail consumes `getMatchForCurrentUser` only.

- [ ] **Step 1: Build match detail.** Render match/opponent, HOME/AWAY, scheduled Japan time, venue, rule summary and roster snapshots. Add edit-roster action. Render the Match Console action disabled with text that it is added in the next phase; do not render fake score/live state.
- [ ] **Step 2: Create Draft PR #3 targeting `phase-2-team-core`.** This is a stacked PR until prior phases merge.
- [ ] **Step 3: Verify GitHub CI GREEN and Vercel Preview READY.**
- [ ] **Step 4: Run transactional authenticated SQL E2E.** Create match/rules, select roster, mutate the source member's name/number, verify snapshot remains unchanged, try a roster member from another team and verify the RPC rejects atomically, then roll back.
- [ ] **Step 5: Run Supabase Security Advisor and confirm no Phase 3 migration warnings.**
- [ ] **Step 6: Record verification evidence in this plan.**
