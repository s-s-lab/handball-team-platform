# Phase 5 Public LIVE + Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

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
- Public pages behave identically for logged-in and logged-out visitors by using a sessionless publishable-key client.
- Full public portal/search, PWA/offline and final UI redesign are out of scope.

---

## Task 1: Anonymous public client and public LIVE pure helpers — COMPLETE

- [x] RED tests added for timer/runtime and public match ordering.
- [x] RED was observed before `runtime.ts` existed.
- [x] Public LIVE domain types and pure runtime helpers implemented.
- [x] Sessionless `createPublicClient()` implemented with no persisted/session-detected auth.
- [x] Vitest path-resolution issue fixed with a narrow relative import rather than broad test configuration changes.
- [x] Unit tests, TypeScript, ESLint and Production build passed after the fix.

Key files:
- `src/lib/supabase/public-client.ts`
- `src/features/public-live/types.ts`
- `src/features/public-live/runtime.ts`
- `src/features/public-live/runtime.test.ts`

## Task 2: Public LIVE database boundary and Broadcast trigger — COMPLETE

- [x] Migration committed before application: `supabase/migrations/20260826100000_public_live.sql`.
- [x] `anon` receives SELECT only on explicitly safe columns.
- [x] `matches.memo` is not granted to `anon`.
- [x] `match_events` has no anonymous privilege.
- [x] Public SELECT policies require both public match and public team.
- [x] `get_public_live_match(uuid)` is `SECURITY INVOKER`.
- [x] `get_public_team_matches(uuid)` is `SECURITY INVOKER`.
- [x] Private fixed-search-path Broadcast trigger implemented for `match:<uuid>:live` / `state_changed`.
- [x] Migration applied exactly through Supabase migration tooling.
- [x] Policies, grants, function security modes and trigger metadata verified by SQL.
- [x] Security Advisor checked; no new Phase 5 warning.

## Task 3: Anonymous database E2E and Broadcast proof — COMPLETE EXCEPT AUTOMATED WEBSOCKET OBSERVATION

- [x] Temporary deterministic fixture created and cleaned up.
- [x] Private team + public match is hidden from anonymous public RPC.
- [x] Public team + private match is hidden from anonymous public RPC.
- [x] Public team + public match returns only sanitized expected keys.
- [x] Anonymous direct read of `matches.memo` denied with SQLSTATE `42501`.
- [x] Anonymous read of `match_events` denied with SQLSTATE `42501`.
- [x] Private state update produced no public Broadcast row.
- [ ] Observe one database Broadcast row while a real WebSocket subscriber is connected.
- [x] All fixture rows deleted and explicitly verified at zero.

**Realtime verification limitation:** The current automation connectors can fetch Vercel-rendered HTML but do not execute browser JavaScript/WebSocket sessions. Supabase official troubleshooting documentation confirms that `realtime.messages` daily partitions are created on the first successful WebSocket connection. With no connected subscriber, this project currently has zero Realtime partitions and `realtime.send` drops the no-listener message with the documented warning behavior. We therefore do **not** claim an observed end-to-end WebSocket delivery. The database trigger and browser subscription are implemented, but interactive WebSocket QA remains a deliberate Draft-PR gate.

## Task 4: Public data access and team-match discoverability — COMPLETE

- [x] RED public RPC shaping tests added and observed.
- [x] Narrow JSON/row shaping rejects malformed public payloads.
- [x] `getPublicLiveMatch(matchId)` implemented.
- [x] `getPublicTeamMatches(teamId)` implemented.
- [x] Existing public team reads migrated to the sessionless public client.
- [x] Test lint warning fixed without weakening lint rules.
- [x] Unit tests, TypeScript and ESLint pass.

## Task 5: `/live/[matchId]` Realtime viewer — COMPLETE

- [x] Dynamic public server route added; hidden/nonexistent match -> `notFound()`.
- [x] Prominent score, clock, period, participants, match status and connection status implemented.
- [x] Local clock derives from authoritative persisted anchors and server offset.
- [x] Client subscribes to `match:<matchId>:live` / `state_changed`.
- [x] Broadcast is treated only as invalidation; the client refetches `get_public_live_match`.
- [x] Older versions are not adopted over newer local state.
- [x] Channel is removed on unmount and timer stops when not needed.
- [x] Vercel build route list confirms `ƒ /live/[matchId]`.

## Task 6: Public team page match section — COMPLETE

- [x] Public roster and match summaries are fetched in parallel.
- [x] Public match list links to `/live/[matchId]`.
- [x] LIVE matches render first, then upcoming, then recent finished/cancelled results.
- [x] Final scores display for finished matches; scheduled rows show date/time/venue.
- [x] UI intentionally remains functional/temporary; final visual redesign was not started.
- [x] React 19 purity lint issue from render-time `Date.now()` was fixed without disabling the rule.
- [x] Unit tests, TypeScript, ESLint and Production build pass.

## Task 7: Live runtime verification and stacked Draft PR — COMPLETE WITH WEBSOCKET GATE NOTED ABOVE

- [x] Full GitHub CI GREEN: Unit tests, TypeScript, ESLint and Production build.
- [x] 80 unit tests passing.
- [x] Supabase Security Advisor has no new Phase 5 finding; only the pre-existing leaked-password-protection warning remains.
- [x] Latest Vercel Preview is READY and `/live/[matchId]` is present in route output.
- [x] Temporary public fixture returned HTTP 200 from the Preview with expected match labels and 0-0 initial score.
- [x] Rendered SSR/RSC payload contained sanitized public state and did not contain the private memo.
- [x] Authoritative MATCH CONSOLE RPC verified `scheduled -> live` at version 1 and HOME goal `0-0 -> 1-0` at version 2.
- [x] Anonymous public RPC returned the same authoritative `version 2 / live / 1-0` state.
- [x] Temporary fixture and memberships deleted; all deterministic fixture IDs verified at zero.
- [x] Draft PR created targeting `phase-4-match-console`.

## Verification Evidence

- Branch: `phase-5-public-live`
- Pre-docs verified implementation commit: `0fd54a8b0823d790e3551889846a1580ce67ad3b`
- GitHub Actions successful run: `32912579487`
- Unit tests: `80 passed`
- Vercel Preview deployment: `dpl_5qUmfZqQWkaZf8aVKTGkQLxHZPZD` — `READY`
- Vercel dynamic route: `/live/[matchId]`
- Preview fixture fetch: HTTP `200`, `x-matched-path: /live/[matchId]`, no-store response
- DB mutation proof: START -> version 1/LIVE; HOME goal -> version 2/1-0
- Anonymous public RPC proof: version 2/LIVE/1-0
- Security Advisor: no Phase 5 finding; existing `auth_leaked_password_protection` warning only
- Fixture cleanup: organizations/teams/matches/rules/state/events/memberships all `0` for fixture IDs
- Draft PR: `#5 Phase 5: public live realtime`, base `phase-4-match-console`

## Remaining Draft-PR Gate

Before promoting PR #5 from Draft to Ready, exercise the public LIVE page in an actual browser WebSocket session and verify one MATCH CONSOLE action updates the open public viewer without reload. This is the only verification intentionally left unclaimed by the automation environment.
