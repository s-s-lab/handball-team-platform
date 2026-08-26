# Phase 8D Member Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the embedded roster card stack with a dedicated, searchable handball member directory and member profile experience while preserving existing registration, privacy, and admin-edit semantics.

**Architecture:** Keep `team_members` as the source of truth and add pure directory filtering/sorting helpers plus server-rendered team/member routes. The directory is team-scoped and uses URL query parameters for search/filter state, while profile pages compose current roster metadata with recent match appearances derived from `match_rosters` and `matches`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, lucide-react, Supabase SSR/RLS, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-26-phase-8-team-workspace-design.md`

## Global Constraints

- Preserve existing team-member privacy semantics and RLS.
- Ordinary team members can browse the internal directory; only team admins can add or edit roster records.
- Do not expose full names or internal roster information on public routes beyond existing opt-in public behavior.
- Desktop/tablet/mobile remain first-class.
- Keep `team_members.kind` descriptive; it does not grant authorization.
- Do not add season-stat schema in Phase 8D; Phase 8F owns that work.

---

### Task 1: Directory filtering and sorting runtime

**Files:**
- Create: `src/features/member-directory/runtime.ts`
- Create: `src/features/member-directory/runtime.test.ts`

**Interfaces:**
- Produces `MemberDirectoryFilter = "all" | "players" | "staff" | "inactive"`.
- Produces `filterDirectoryMembers(members, { filter, query })`.
- Produces `memberDirectoryCounts(members)`.

- [ ] Write failing tests proving case-insensitive search across full/display name, number, position and grade/age; filter behavior; active-first ordering; and shirt-number ordering for players.
- [ ] Run the focused test and confirm RED because the runtime module is missing.
- [ ] Implement only the pure runtime necessary for those tests.
- [ ] Re-run focused tests and confirm GREEN.
- [ ] Commit `feat: add member directory filtering runtime`.

### Task 2: Dedicated member directory component

**Files:**
- Create: `src/components/member-directory/member-directory.tsx`
- Create: `src/components/member-directory/member-directory.test.tsx`

**Interfaces:**
- Consumes `TeamMemberRecord[]`, `teamId`, `isAdmin`, `filter`, `query`.
- Produces links to `/app/teams/[teamId]/members/[memberId]` and admin add/edit actions.

- [ ] Write a failing render test that expects the directory heading, search field, filter controls, player/staff rows, large shirt-number treatment, member profile links, and admin add action.
- [ ] Run focused test and confirm RED because the component is missing.
- [ ] Implement an open-layout sports roster: header and controls, compact filter rail, player grid/list, staff list, strong number/name hierarchy, active/inactive state, and restrained privacy indicator for admins.
- [ ] Re-run focused tests and confirm GREEN.
- [ ] Commit `feat: build dedicated member directory`.

### Task 3: `/members` route and team-home cleanup

**Files:**
- Create: `src/app/app/teams/[teamId]/members/page.tsx`
- Modify: `src/app/app/teams/[teamId]/page.tsx`
- Modify: `src/components/team-dashboard/team-dashboard.tsx`

**Interfaces:**
- `/members?q=&filter=` resolves team membership through `getTeamForCurrentUser` and renders `MemberDirectory`.
- Team home keeps only summary member metrics and links to the dedicated directory instead of rendering the full roster.

- [ ] Add failing structural tests asserting the members navigation target now resolves and the team home no longer embeds the full roster list.
- [ ] Confirm RED.
- [ ] Implement the members route, validate query/filter values, and remove `RosterList` from the team dashboard page.
- [ ] Add `メンバーを見る` / `メンバー追加` links where appropriate without adding a duplicate card stack.
- [ ] Confirm GREEN.
- [ ] Commit `feat: route roster browsing through member directory`.

### Task 4: Member profile data and recent appearances

**Files:**
- Create: `src/features/member-directory/data.ts`
- Create: `src/features/member-directory/profile-runtime.ts`
- Create: `src/features/member-directory/profile-runtime.test.ts`

**Interfaces:**
- Produces `MemberAppearance` with match id, name, opponent, scheduledAt, status, shirt/position snapshot.
- Produces `getMemberProfileForCurrentUser(teamId, memberId)` returning team, member, role, and up to 8 recent appearances.

- [ ] Write failing tests for appearance ordering and snapshot fallback behavior.
- [ ] Confirm RED.
- [ ] Implement pure shaping helpers, then server data access using current team membership plus `match_rosters` and `matches`.
- [ ] Keep all queries under existing RLS; no service-role client.
- [ ] Confirm GREEN.
- [ ] Commit `feat: add member profile data`.

### Task 5: Member profile page

**Files:**
- Create: `src/components/member-directory/member-profile.tsx`
- Create: `src/components/member-directory/member-profile.test.tsx`
- Create: `src/app/app/teams/[teamId]/members/[memberId]/page.tsx`
- Modify: existing member edit page back-links if needed.

**Interfaces:**
- Profile displays identity/number/position, active state, grade/age when present, recent appearances, and admin edit action.
- Does not invent season statistics before Phase 8F.

- [ ] Write failing render tests for profile identity, roster metadata, recent appearances, back-to-directory link, and admin edit button.
- [ ] Confirm RED.
- [ ] Implement profile hero with oversized number/monogram, open metadata layout, recent match timeline/list, and responsive mobile composition.
- [ ] Confirm GREEN.
- [ ] Commit `feat: add handball member profiles`.

### Task 6: Regression and browser-ready verification

**Files:**
- Modify relevant Vitest tests and browser-QA spec only where stable test hooks are needed.

- [ ] Run all unit tests.
- [ ] Run TypeScript, ESLint, production build, and existing browser QA through GitHub Actions.
- [ ] Verify desktop/mobile member-directory route structure, search/filter links, profile links, and admin-only edit/add controls.
- [ ] Verify existing match console/offline/public-LIVE tests remain unchanged and green.
- [ ] If GitHub Actions reports infrastructure `startup_failure`, distinguish that from code failure and inspect any run that actually starts jobs.
- [ ] Commit only genuine verification-hook changes under `test: verify member directory experience`.

## Completion Gate

Phase 8D is complete only when the workspace `メンバー` navigation resolves to a dedicated directory, the team home no longer repeats the full roster, search/filter behavior is covered by unit tests, every member has an internal profile page, recent appearances are shown when available, admin-only management remains enforced, and available code-executing CI checks are green.