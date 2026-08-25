# Phase 5 Public LIVE + Realtime Design

**Date:** 2026-08-26

## Goal

Make explicitly public matches viewable without login at `/live/[matchId]`, and update the viewer promptly when MATCH CONSOLE accepts a state-changing action.

This phase intentionally does **not** implement the full public portal/search, PWA/offline, storage uploads, or advanced match-event statistics. Those remain later P1/P2 work.

## Approved product constraints carried forward

- Anonymous users may read only data explicitly marked public.
- Public team information and public match information are opt-in.
- MATCH CONSOLE remains the authoritative writer; public LIVE is read-only.
- `match_events` remains private and append-only.
- `match_state` remains the authoritative current projection.
- No service-role key may appear in application code.
- Mobile-first public viewing; MATCH CONSOLE tablet optimization is unchanged.

## Visibility boundary

A match is publicly viewable only when **both** conditions are true:

1. `teams.is_public = true`
2. `matches.is_public = true`

This deliberately requires two explicit public choices. A public match under a private team is not exposed.

The public LIVE surface exposes only:

- match id/name
- team public name/short name
- opponent name
- HOME/AWAY side
- scheduled time and venue
- match status
- public-safe match timing rules
- current period
- authoritative timer anchors/elapsed time
- HOME/AWAY score
- state version and server timestamp

It does **not** expose:

- match memo
- organization membership
- user ids
- team-member internal/full names
- `match_events`
- scorer ids
- private roster snapshots
- any service/admin credentials

## Realtime approach

### Chosen approach: Database Broadcast as invalidation

When `match_state` changes for a match whose team and match are both public, a database trigger sends a public Realtime Broadcast message to:

`match:<match_id>:live`

Event name:

`state_changed`

Payload:

```json
{
  "match_id": "<uuid>",
  "version": 12
}
```

The Broadcast contains no score, player, timer or private data. Its only purpose is to tell connected viewers that a newer authoritative snapshot exists.

The browser then calls the public read RPC again and replaces its local snapshot.

### Why this approach

- Keeps public data authorization in PostgreSQL/RLS instead of duplicating it in WebSocket payload construction.
- Avoids exposing `match_events` or using a service-role client.
- Avoids one RLS authorization check per subscriber for every Postgres Changes event.
- Fits sports game-state delivery and leaves room to scale Broadcast independently later.
- A Broadcast is emitted only after the database transaction commits, so the subsequent snapshot read observes committed state.

### Alternatives considered

**Postgres Changes on `match_state`:** simpler, but every change must be authorized per subscriber and directly exposes the table to Realtime. Suitable for small prototypes, but less attractive for a sports LIVE surface that may grow.

**Dedicated public mirror table:** strongest isolation and potentially efficient at scale, but duplicates match state and introduces another projection that can drift. Not needed for MVP.

## Public database access

Public reads remain safe even if a caller bypasses the application UI.

Add anon SELECT policies and column-level grants only for public-safe columns on:

- `matches`
- `match_rules`
- `match_state`

Existing `teams` public RLS and safe column grants remain the source for the team display name.

Policies require the team and match to be public. No anon INSERT/UPDATE/DELETE grants are added.

Create two `SECURITY INVOKER` RPCs:

### `get_public_live_match(uuid) -> jsonb`

Returns one sanitized authoritative LIVE snapshot or no row/null when the visibility conditions fail.

Shape:

```ts
type PublicLiveMatch = {
  matchId: string;
  matchName: string;
  teamId: string;
  teamName: string;
  teamShortName: string | null;
  opponentName: string;
  teamSide: "home" | "away";
  scheduledAt: string;
  venue: string | null;
  status: "scheduled" | "live" | "finished" | "cancelled";
  serverNow: string;
  rules: {
    periodCount: number;
    periodSeconds: number;
    overtimeEnabled: boolean;
    overtimePeriodCount: number;
    overtimePeriodSeconds: number;
  };
  state: {
    version: number;
    currentPeriod: number;
    clockElapsedMs: number;
    clockRunning: boolean;
    clockStartedAt: string | null;
    homeScore: number;
    awayScore: number;
  };
};
```

### `get_public_team_matches(uuid) -> table`

Returns only public matches for a public team, newest/relevant first, with safe summary fields and current score. It enables the public team page to link to LIVE/upcoming/final match pages without implementing the full portal yet.

## Anonymous client separation

Public data must behave the same whether the visitor is logged in or logged out.

Create a dedicated Supabase client using only the existing publishable key with auth persistence/session detection disabled. It intentionally carries no user session. Public team data and public LIVE data use this anonymous client.

This prevents a logged-in user who is not a team member from accidentally taking the `authenticated` RLS path on a public page.

No new secret environment variables are introduced.

## Public LIVE page

Route:

`/live/[matchId]`

Server responsibilities:

1. fetch the initial sanitized public snapshot
2. return 404 for private/nonexistent matches
3. render a client LIVE component with the initial snapshot

Client responsibilities:

1. calculate server/client clock offset from `serverNow`
2. animate the displayed timer locally while `clockRunning = true`
3. subscribe to public topic `match:<matchId>:live`
4. on `state_changed`, refetch `get_public_live_match`
5. replace local state only with the authoritative RPC response
6. unsubscribe/remove the channel on unmount
7. display connection state (`LIVE`, `再接続中`, or static final/scheduled state) without blocking the score display

The timer is visual only; the browser never writes match state.

## Public team page integration

`/teams/[slug]` gains a simple match section:

- LIVE matches first
- upcoming scheduled matches
- recently finished public matches

Each row links to `/live/[matchId]`.

This is only a discoverability bridge. Full team search and public home portal remain the next phase.

## Broadcast trigger

Create a private fixed-search-path trigger function on `match_state` INSERT/UPDATE.

Before broadcasting it verifies that the state row belongs to a match where:

- `matches.is_public = true`
- parent `teams.is_public = true`

Then it calls `realtime.send` with a **public** channel and only `{match_id, version}`.

Non-public match changes emit no public Broadcast.

## Error and resilience behavior

- Initial RPC unavailable/private -> 404, not a generic data leak.
- Realtime connection failure -> keep last confirmed snapshot visible and show reconnecting state.
- Broadcast received but refetch temporarily fails -> retain last confirmed snapshot and retry on the next signal/reconnect.
- Finished match -> stop local timer and retain final score; Realtime subscription may be removed once the final snapshot is confirmed.
- Scheduled match -> show scheduled status and zero/confirmed state without running timer.

## Testing

### Pure tests

- public timer calculation uses authoritative anchor and clamps at the correct period duration
- row/RPC shaping rejects malformed or missing state
- match summary sorting groups live -> upcoming -> finished

### Database E2E

Under `anon` role:

- private team + public match -> no public result
- public team + private match -> no public result
- public team + public match -> sanitized result
- direct anonymous reads cannot select forbidden columns such as `matches.memo`
- match events remain inaccessible
- state update for private match emits no public Broadcast message
- state update for public match emits exactly one `state_changed` public Broadcast with only match id/version

### App verification

- GitHub CI: unit tests, TypeScript, ESLint, production build
- Vercel Preview READY
- build route list includes `/live/[matchId]`
- temporary public fixture renders from Vercel Preview and is deleted afterward
- Supabase Security Advisor shows no new Phase 5 warning

## Out of scope / next phases

- full `/` public portal with live/recent/upcoming aggregation
- team search
- match event timeline and detailed stats
- storage/logo/member photos
- PWA/offline viewer
- offline MATCH CONSOLE queue
- final UI redesign
