# Phase 8C Schedule Implementation Plan

**Goal:** Add secure team schedule management for practice, official matches, friendly matches, meetings and other activities, with responsive calendar/agenda UX and automatic match-to-schedule synchronization.

**Spec:** `docs/superpowers/specs/2026-08-26-phase-8-team-workspace-design.md`

## Constraints

- Existing Match Console, offline queue, PWA and public LIVE behavior must remain unchanged.
- New schedule data is internal by default: authenticated team members may read it; only team admins may write it.
- `staff` as a roster classification never grants permission by itself.
- Creating a match must create exactly one linked schedule event, and later match date/venue/status changes must keep that linked event consistent.
- Deleting a schedule event must never delete a match.
- Desktop/tablet use a month-oriented view; mobile is agenda-first.

## Tasks

### 1. Domain tests
- [ ] RED tests for event validation, Japan-local datetime conversion, date grouping and filters.
- [ ] GREEN implementation in `features/schedule`.

### 2. Database + RLS
- [ ] Add `team_event_type`, `team_event_status`, and `team_events`.
- [ ] Add indexes, constraints, RLS and explicit authenticated grants.
- [ ] Add private match-sync trigger/function and backfill existing matches idempotently.
- [ ] Apply migration to connected Supabase project and inspect policies/grants.

### 3. CRUD server layer
- [ ] List/get team events through RLS.
- [ ] Admin create/update/delete actions with validation and revalidation.
- [ ] Linked match schedule rows cannot be edited/deleted through ordinary schedule CRUD; match remains source of truth.

### 4. Schedule UI
- [ ] `ScheduleBoard` with category filters, desktop/tablet month grid and mobile agenda.
- [ ] Upcoming section and linked-match navigation.
- [ ] Admin create/edit forms.
- [ ] Routes under `/app/teams/[teamId]/schedule`.

### 5. Workspace integration
- [ ] Team dashboard obtains the next team activity from `team_events` while retaining match result/stat aggregation.
- [ ] Quick action adds a schedule entry.

### 6. Verification
- [ ] Unit tests, TypeScript, ESLint, production build.
- [ ] Existing real browser regression QA.
- [ ] Supabase catalog checks and security/performance advisors.
