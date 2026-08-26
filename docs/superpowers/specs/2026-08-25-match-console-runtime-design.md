# Match Console Runtime Design

## Goal

Turn a configured match into a reliable handball MATCH CONSOLE that can be operated from a phone, tablet, or PC in a gym. The console must keep score, period and timer state authoritative in PostgreSQL, preserve an append-only event history, tolerate duplicate requests, and detect concurrent edits before public LIVE/offline sync is added.

## Scope

Phase 4 includes authenticated team-member operation of:

- START / STOP / RESET clock
- period selection and progression
- HOME +1 / AWAY +1
- undo the most recent non-reverted goal
- score/timer state persistence
- match transition from `scheduled` to `live`
- match finish with final score preserved and clock stopped
- append-only match event history
- optimistic concurrency and idempotent action handling
- a tablet-landscape-first MATCH CONSOLE route

Phase 4 does not include anonymous LIVE pages, Supabase Realtime subscriptions, IndexedDB/offline action queues, timeout/2-minute/warning/7m/GK-save/shot UI, or public portal integration. The schema/event model must leave room for those later additions.

## Architecture

Use the approved hybrid **Event + State** model.

### `match_events`

`match_events` is append-only and records accepted user actions. Application users receive SELECT only; inserts happen only inside the match-action transaction. Events carry:

- stable UUID `id`
- `match_id`
- monotonically increasing `state_version`
- unique `(match_id, client_action_id)` for idempotency
- `event_type`
- optional `related_event_id` for revert/relationship semantics
- JSONB `payload`
- authenticated `actor_user_id`
- `created_at`

Initial event types are `clock_started`, `clock_stopped`, `clock_reset`, `period_changed`, `goal`, `goal_reverted`, and `match_finished`. Future event types can be added through later migrations.

A partial unique constraint on `related_event_id` for `goal_reverted` prevents the same goal from being reverted twice.

### `match_state`

`match_state` is the one-row current projection used by the console. It stores:

- `match_id` primary key
- `version` bigint, initially 0
- `current_period`, initially 1
- `clock_elapsed_ms`, initially 0
- `clock_running`
- nullable `clock_started_at`
- `home_score`, `away_score`
- timestamps

The effective clock is calculated as:

```text
clock_elapsed_ms + (server_now - clock_started_at)
```

when running, otherwise `clock_elapsed_ms`. It is clamped to the duration of the current period. A normal period uses `match_rules.period_seconds`; overtime periods use `overtime_period_seconds`.

Changing period stops the clock and resets elapsed time to 0. RESET also stops the clock and resets elapsed time to 0. This makes the console safe and predictable during gym operation.

### Initialization

A database trigger on `matches` creates a `match_state` row for every new match. The migration also backfills state rows for Phase 3 matches that already exist.

## Server Time and Display

Client wall clocks cannot be trusted to exactly match the database server. `get_match_console_snapshot(match_id)` returns both state fields and `server_now`. The browser computes a server offset:

```text
serverOffsetMs = Date.parse(server_now) - Date.now()
```

and animates the displayed timer locally from the persisted anchor without writing every second.

Each mutation response also includes `server_now`, refreshing the offset whenever the user performs an action.

## Atomic Action API

Expose one authenticated public RPC:

```text
apply_match_action(
  match_id,
  client_action_id,
  expected_version,
  action,
  payload
) -> jsonb
```

The public function is `SECURITY INVOKER` and calls a private `SECURITY DEFINER` implementation. The private implementation:

1. verifies `private.can_manage_match(match_id)`;
2. checks whether `(match_id, client_action_id)` already exists; if so, returns the latest state without reapplying the action;
3. locks `match_state FOR UPDATE`;
4. compares `expected_version` to current `version`; mismatch raises SQLSTATE `40001`;
5. validates action/payload against match rules and roster;
6. computes timer state from a single transaction timestamp;
7. inserts one append-only event;
8. updates `match_state` and increments version exactly once;
9. updates `matches.status` where necessary;
10. returns the new snapshot plus `server_now`.

This gives both idempotency and optimistic concurrency while serializing accepted actions per match.

## Action Semantics

### `start_clock`

- Allowed when match is not finished/cancelled and clock is stopped.
- Sets `clock_running=true`, `clock_started_at=server_now`.
- If match status is `scheduled`, changes it to `live`.
- Appends `clock_started`.

### `stop_clock`

- Allowed only while running.
- Materializes effective elapsed milliseconds, clamps to period duration, then clears the anchor and stops the clock.
- Appends `clock_stopped`.

### `reset_clock`

- Allowed while match is not finished/cancelled.
- Stops the clock and sets elapsed to 0.
- Appends `clock_reset`.

### `set_period`

- Payload: `{ "period": number }`.
- Valid period range is 1..normal period count plus configured overtime count when overtime is enabled.
- Stops and resets the clock.
- Appends `period_changed` with previous/new period values.

### `goal`

- Payload: `{ "side": "home" | "away", "scorer_team_member_id"?: uuid }`.
- Increments exactly one score.
- Optional scorer must be a player in this match's saved roster.
- Appends `goal`; scorer is stored in event payload only and does not affect score correctness.

### `undo_last_goal`

- Finds the most recent `goal` event with no `goal_reverted` referencing it.
- Decrements the corresponding side, never below zero.
- Appends `goal_reverted` with `related_event_id` pointing to the goal.
- If there is no undoable goal, rejects the action rather than silently changing nothing.

### `finish_match`

- Materializes/stops the clock.
- Sets `matches.status='finished'`.
- Leaves the current period, elapsed time and scores intact as final state.
- Appends `match_finished` with final score payload.
- Further runtime mutations are rejected after finish.

## RLS and Grants

- `match_events` and `match_state` have RLS enabled.
- Authenticated team members can SELECT rows for matches they manage.
- No direct application INSERT/UPDATE/DELETE grants are given for either table.
- Anonymous users have no Phase 4 access.
- Private helper functions keep a fixed `search_path` and are not executable by `anon` or `public`.
- No service-role key is used by the application.

## Application Layer

### Pure runtime helpers

`src/features/match-console/runtime.ts` contains deterministic browser-safe helpers:

- `effectiveElapsedMs(snapshot, nowMs)`
- `periodDurationMs(snapshot)`
- `formatClock(elapsedMs)`
- `nextClientActionId()` (browser wrapper around `crypto.randomUUID` may live separately if needed)

Timer calculations are unit tested without React or Supabase.

### Server data

`getMatchConsoleForCurrentUser(matchId)` returns:

- match metadata and team/opponent labels
- rules needed for period labels/durations
- saved roster for optional scorer selection later
- authoritative runtime snapshot from `get_match_console_snapshot`

If no accessible match exists, return null.

### Server action / route handler

Console mutations use a server action that parses a narrow action contract and calls `apply_match_action`. SQLSTATE `40001` maps to a user-safe “別の端末で試合状態が更新されました。最新状態を読み込みました。” message. Invalid actions/payloads map to concise Japanese messages without leaking SQL details.

## Console UI

Route: `/app/matches/[matchId]/console`.

Use the existing product visual system and the already-approved static MATCH CONSOLE direction from the landing page rather than introducing a new visual language.

Tablet landscape is the primary composition:

- dark/high-contrast primary console surface
- period and status at top
- very large monospaced timer centered
- HOME and AWAY score columns with large scores and large `+1` targets
- START/STOP as the primary clock action
- RESET secondary and visually separated to reduce accidental taps
- period controls reachable without leaving the screen
- Undo Goal visible but secondary
- Finish Match separated and clearly destructive/terminal
- minimal navigation chrome

Phone portrait stacks timer, scores and controls while preserving large touch targets. Desktop uses the same central console width, not an admin-dashboard table.

The client keeps a local copy of the latest returned snapshot, ticks only the display while the clock runs, disables mutation buttons while a request is pending, and replaces local state with every server response.

## Error and Concurrency UX

- Network/server failure leaves the last confirmed state visible and shows a retryable message.
- Version conflict refreshes authoritative state instead of guessing which local action won.
- Duplicate submitted `client_action_id` is safe and returns state without a second score/timer mutation.
- Finished matches render final state with runtime mutation controls disabled.

## Verification

Required before Phase 4 completion:

1. TDD RED then GREEN for timer helper calculations and formatting.
2. Migration committed before application.
3. Supabase migration applied; RLS/grants/function security verified.
4. Authenticated transactional E2E verifies idempotency, version conflict, START/STOP elapsed materialization, goal/undo, period reset, finish and post-finish rejection.
5. Full GitHub CI GREEN.
6. Vercel Preview READY and runtime config valid.
7. Supabase Security Advisor has no new Phase 4 warning.
8. Draft stacked PR targeting `phase-3-match-core`.
