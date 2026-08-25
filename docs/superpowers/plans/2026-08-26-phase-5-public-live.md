# Phase 5 Public LIVE + Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone view explicitly public matches at `/live/[matchId]` and receive authoritative score/timer updates from MATCH CONSOLE through public Realtime Broadcast invalidations.

**Architecture:** PostgreSQL/RLS remains the public-data boundary. A sanitized `SECURITY INVOKER` RPC returns the current public snapshot, while a database trigger emits only `{match_id, version}` to a public Broadcast topic after `match_state` changes. The browser treats Broadcast as an invalidation signal and refetches the authoritative snapshot.

**Tech Stack:** Next.js 16.x, React 19.x, TypeScript, Tailwind CSS 4.x, Supabase PostgreSQL/RLS/Realtime, Vitest, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-26-public-live-realtime-design.md`

## Global Constraints

- A public LIVE match requires both `teams.is_public = true` and `matches.is_public = true`.
- Public LIVE is read-only; all match mutations remain in Phase 4 MATCH CONSOLE.
- `match_events`, scorer ids, internal roster names and match memo remain private.
- No service-role key in application code.
- Realtime Broadcast carries only invalidation metadata; authoritative data is refetched through public RLS/RPC.
- Public pages must behave identically for logged-in and logged-out visitors by using a sessionless publishable-key client.
- Full public portal/search, PWA/offline and final UI redesign are out of scope.

---

### Task 1: Anonymous public client and public LIVE pure helpers

**Files:**
- Create: `src/lib/supabase/public-client.ts`
- Create: `src/features/public-live/types.ts`
- Create: `src/features/public-live/runtime.ts`
- Test: `src/features/public-live/runtime.test.ts`

**Interfaces:**
- `createPublicClient()` returns a Supabase client using only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, with no persisted/session-detected auth.
- `effectivePublicElapsedMs(snapshot: PublicLiveSnapshot, clientNowMs: number): number`
- `publicPeriodDurationMs(live: PublicLiveMatch): number`
- `formatPublicClock(elapsedMs: number): string`
- `sortPublicMatchSummaries(matches: PublicMatchSummary[], nowMs: number): PublicMatchSummary[]`

- [ ] **Step 1: Write RED tests** in `runtime.test.ts` covering stopped/running clock, period clamp, overtime duration, `18:42` formatting, and order `live -> future scheduled -> finished`.

```ts
expect(formatPublicClock(18 * 60_000 + 42_000)).toBe("18:42");
expect(sortPublicMatchSummaries(input, now).map((m) => m.status)).toEqual([
  "live",
  "scheduled",
  "finished",
]);
```

- [ ] **Step 2: Run the targeted test in CI** and verify RED because `runtime.ts` does not exist.

- [ ] **Step 3: Implement domain types and minimal pure helpers.** Timer calculation must use `serverNow`/`clockStartedAt`, never increment persisted elapsed in the browser, and clamp to the current period duration.

```ts
const runningDelta = snapshot.clockRunning && snapshot.clockStartedAt
  ? Math.max(0, clientNowMs - Date.parse(snapshot.clockStartedAt) - snapshot.serverOffsetMs)
  : 0;
return Math.min(periodDurationMs, snapshot.clockElapsedMs + runningDelta);
```

- [ ] **Step 4: Implement the sessionless public Supabase client** with `persistSession:false`, `autoRefreshToken:false`, and `detectSessionInUrl:false`.

- [ ] **Step 5: Run targeted tests + typecheck + lint and require GREEN.**

### Task 2: Public LIVE database boundary and Broadcast trigger

**Files:**
- Create: `supabase/migrations/20260826100000_public_live.sql`

**Interfaces:**
- Adds anon SELECT policies/column grants to safe fields on `matches`, `match_rules`, `match_state`.
- Adds `get_public_live_match(uuid) -> jsonb` as `SECURITY INVOKER`.
- Adds `get_public_team_matches(uuid)` as `SECURITY INVOKER`.
- Adds private trigger function `private.broadcast_public_match_state()`.
- Broadcast topic: `match:<uuid>:live`; event: `state_changed`; payload only `{match_id, version}`.

- [ ] **Step 1: Commit migration SQL before applying it.** The public match policy must require both flags:

```sql
create policy matches_select_public_live
on public.matches for select
to anon
using (
  is_public = true
  and exists (
    select 1 from public.teams t
    where t.id = matches.team_id
      and t.is_public = true
  )
);
```

- [ ] **Step 2: Grant only safe columns to `anon`.** Do not grant `matches.memo`; do not grant any access to `match_events`.

```sql
grant select (id, team_id, name, opponent_name, team_side, scheduled_at, venue, status)
on public.matches to anon;
```

- [ ] **Step 3: Add equivalent public-select policies for `match_rules` and `match_state`** that resolve visibility through the parent match/team.

- [ ] **Step 4: Implement `get_public_live_match`** as an invoker function joining only granted safe columns and returning `server_now` plus rules/state.

- [ ] **Step 5: Implement `get_public_team_matches`** returning safe summary rows with current HOME/AWAY score and no private roster/event fields.

- [ ] **Step 6: Add the private fixed-search-path Broadcast trigger.** It must check current visibility before calling:

```sql
perform realtime.send(
  jsonb_build_object('match_id', new.match_id, 'version', new.version),
  'state_changed',
  'match:' || new.match_id::text || ':live',
  false
);
```

- [ ] **Step 7: Apply exactly the committed migration** through Supabase migration tooling.

- [ ] **Step 8: Verify policies, grants, function security mode and trigger metadata with SQL.**

- [ ] **Step 9: Run Supabase Security Advisor** and fix only new Phase 5 findings through an additive migration.

### Task 3: Anonymous database E2E and Broadcast proof

**Files:**
- No production file unless Task 2 needs a corrective migration.

- [ ] **Step 1: Create a temporary fixture** with one user-owned organization/team, a match/rules/state row, and use explicit ids so cleanup is deterministic.

- [ ] **Step 2: Under `anon`, prove private team + public match returns no row** from `get_public_live_match`.

- [ ] **Step 3: Under `anon`, prove public team + private match returns no row.**

- [ ] **Step 4: Set both public and prove the RPC returns only the expected sanitized keys.** Assert no `memo`, no user/member ids, and no event content.

- [ ] **Step 5: Attempt anonymous direct read of `matches.memo` and require permission denial.**

- [ ] **Step 6: Attempt anonymous read of `match_events` and require permission denial.**

- [ ] **Step 7: Update private match state and verify no new `realtime.messages` row for `match:<id>:live`.**

- [ ] **Step 8: Update public match state and verify one new Broadcast message whose payload contains only `match_id` and `version` and whose event is `state_changed`.**

- [ ] **Step 9: Delete fixture rows and verify zero test rows remain.**

### Task 4: Public data access and team-match discoverability

**Files:**
- Create: `src/features/public-live/data.ts`
- Modify: `src/features/team-core/public-data.ts`
- Test: `src/features/public-live/data-shaping.test.ts`
- Create: `src/features/public-live/data-shaping.ts`

**Interfaces:**
- `getPublicLiveMatch(matchId: string): Promise<PublicLiveMatch | null>`
- `getPublicTeamMatches(teamId: string): Promise<PublicMatchSummary[]>`
- Existing `getPublicTeamBySlug` and `getPublicTeamMembers` use `createPublicClient()` instead of the cookie/session server client.

- [ ] **Step 1: Write RED shaping tests** for valid RPC JSON, missing state, malformed numeric fields and summary ordering inputs.

- [ ] **Step 2: Observe RED, then implement narrow row/JSON shaping** that returns `null` rather than trusting malformed public RPC payloads.

- [ ] **Step 3: Implement server-only public data functions** using `createPublicClient()` and the two new RPCs.

- [ ] **Step 4: Migrate existing public team data reads to the same sessionless client** so logged-in outsiders and logged-out visitors follow one public RLS path.

- [ ] **Step 5: Run tests/typecheck/lint.**

### Task 5: `/live/[matchId]` Realtime viewer

**Files:**
- Create: `src/app/live/[matchId]/page.tsx`
- Create: `src/components/public-live/public-live-viewer.tsx`

**Interfaces:**
- Server page gets the initial `PublicLiveMatch`; private/nonexistent -> `notFound()`.
- Client component subscribes to `match:<matchId>:live` / `state_changed` and refetches the public RPC through `createPublicClient()`.

- [ ] **Step 1: Build the server route** with metadata, no auth requirement, and 404 for hidden matches.

- [ ] **Step 2: Build the client viewer** with prominent score, clock, current period, team/opponent names, scheduled/final status and connection indicator.

- [ ] **Step 3: Implement local timer tick** from the authoritative anchors. No mutation RPCs are imported into this component.

- [ ] **Step 4: Subscribe to Broadcast and refetch on invalidation.**

```ts
const channel = supabase
  .channel(`match:${match.matchId}:live`)
  .on("broadcast", { event: "state_changed" }, async () => {
    const refreshed = await fetchPublicLiveMatchInBrowser(match.matchId);
    if (refreshed) setMatch(refreshed);
  })
  .subscribe(setConnectionState);
```

- [ ] **Step 5: Remove channel on unmount** and stop/reduce live ticking once status is `finished`.

- [ ] **Step 6: Run typecheck/lint/build** and verify build route list contains `/live/[matchId]`.

### Task 6: Public team page match section

**Files:**
- Modify: `src/app/teams/[slug]/page.tsx`
- Create: `src/components/public-live/public-match-list.tsx`

**Interfaces:**
- Public team page fetches `getPublicTeamMatches(team.id)` alongside roster data.
- Match rows link to `/live/[matchId]`.

- [ ] **Step 1: Fetch public summaries and group/order them using Task 1 helper.**

- [ ] **Step 2: Render LIVE first, then upcoming, then recent finished matches.** Finished rows display final score; scheduled rows show date/time; live rows show LIVE score.

- [ ] **Step 3: Keep the UI intentionally functional/temporary**; do not start the final visual redesign in this phase.

- [ ] **Step 4: Run typecheck/lint/build.**

### Task 7: Live runtime verification and stacked Draft PR

**Files:**
- Modify: `docs/superpowers/plans/2026-08-26-phase-5-public-live.md`

- [ ] **Step 1: Run full GitHub CI** and require Unit tests, TypeScript, ESLint and Production build GREEN.

- [ ] **Step 2: Verify Supabase Security Advisor** has no new Phase 5 warning.

- [ ] **Step 3: Create a temporary public fixture** and fetch `/live/<fixture-id>` from the latest Vercel Preview; require HTTP 200 and expected public labels/score in HTML.

- [ ] **Step 4: Flip fixture state through the authoritative Match Console RPC** and verify the public RPC returns the new version/score. Where connector WebSocket inspection is unavailable, record that limitation instead of claiming an observed browser Broadcast delivery.

- [ ] **Step 5: Delete the fixture and verify zero rows remain.**

- [ ] **Step 6: Verify latest Vercel Preview READY** and Route output includes `/live/[matchId]`.

- [ ] **Step 7: Create Draft PR targeting `phase-4-match-console`** and record PR/CI/DB/Vercel evidence here.
