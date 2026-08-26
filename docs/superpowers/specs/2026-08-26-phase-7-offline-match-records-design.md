# Phase 7 Offline Match Records Design

## Goal

Turn MATCH CONSOLE into a practical in-gym recording tool that keeps working through temporary connectivity loss and leaves a reliable post-match timeline for goals, 7 m throws, warnings, 2-minute suspensions, disqualifications, team timeouts, period changes, and clock operations.

## Source of competition-rule behavior

This design is based on the Japan Handball Association 2026 Rules of the Game for Indoor Handball, effective 2026-07-01, plus the JHA official record / score-sheet workflow published in 2026.

Primary references:
- https://handball.or.jp/rule/
- https://handball.or.jp/rule/doc/2026competition_rule.pdf
- https://www.handball.or.jp/form/match_report.html

Rules represented directly in product behavior:
- A timeout is mandatory when a 2-minute suspension or disqualification is awarded and when a team timeout is granted (Rule 2:8).
- A 2-minute suspension is measured in competition playing time beginning from the whistle that restarts play. Unserved time carries from first half to second half and into overtime (Rule 16:5).
- A player's third 2-minute suspension results in disqualification (Rule 16:5 / 16:6d).
- A player may be warned once; player warnings for a team are normally limited to three, after which progressive punishment is at least a 2-minute suspension (Rule 16:1 note).
- Each team normally has one 1-minute team timeout in each regulation half; competition regulations may allow up to three total, no more than two per half and no team timeout in overtime. The current per-match rule configuration remains authoritative.
- The official record concept includes goal time / number, warnings, suspensions, disqualifications, 7 m, and team-timeout records.

The application assists with record consistency; it does not make refereeing decisions.

## Scope

### Phase 7A — rule-aware event recording

Extend the existing authoritative `match_state + match_events` engine rather than replacing it.

New console-record actions:
- goal with optional scorer and goal method (`open_play` or `seven_meter`)
- 7 m miss
- warning
- 2-minute suspension
- direct disqualification
- disqualification with report / blue-card marker
- team timeout
- generic event reversal for correction

Existing actions remain:
- start / stop / reset clock
- set period
- goal / goal undo compatibility
- finish match

### Event time model

Every record event must persist the competition clock at the moment the operator entered it:
- `period`
- `period_elapsed_ms`
- `competition_elapsed_ms`

`competition_elapsed_ms` means accumulated playing time only. Breaks, stopped-clock time, halftime, and team timeouts do not advance it.

Add cumulative playing time to `match_state` so suspension expiry can cross period boundaries without counting breaks.

For a running clock, the effective current values are calculated from the stored anchors and server / local monotonic time; the database is not written every second.

### Event subjects

A record event may target:
- a snapshotted player / staff member from the managed team's MatchRoster, or
- an opponent participant represented by side + optional shirt number + optional display label.

For the managed team, the event stores the MatchRoster snapshot identity so later edits to the team roster do not rewrite historical records.

Event payloads may contain participant labels for display, but the canonical managed-team link is the MatchRoster row or snapshotted team member identity.

### Warning / suspension assistance

The action engine will reject clearly invalid progressive-penalty records where the rule is unambiguous, including:
- warning the same player a second time
- warning a player already suspended / disqualified
- a fourth player warning for a team when the normal three-warning ceiling applies

On a player's third suspension, the engine records the suspension and flags the same action as resulting in disqualification. The UI presents this as one operator flow: `2分間退場（3回目 → 失格）`.

Direct disqualification records whether it is a normal disqualification or a report-required disqualification (blue-card marker).

### Mandatory clock stop behavior

When a 2-minute suspension, disqualification, or team timeout is recorded while the match clock is running, the same authoritative action must materialize elapsed time and stop the match clock atomically.

This avoids a race between a manual STOP press and the penalty record.

### Active suspensions

A suspension stores:
- subject
- suspension sequence number for that player when known
- `starts_at_competition_elapsed_ms`
- `expires_at_competition_elapsed_ms = start + 120000`

Because the expiry is based on competition playing time, halftime and other stopped-clock intervals do not reduce the remaining suspension.

The console derives active suspensions from non-reverted events and displays the remaining competition-playing-time duration.

### 7 m records

A successful 7 m is a normal goal event with `goal_method = seven_meter`; it increments score exactly once.
A missed / saved / off-target 7 m is a `seven_meter_missed` event and does not change score.

This allows post-match totals for 7 m attempts and 7 m goals without introducing a second scoring source of truth.

### Team timeout records

A team-timeout event stores side, period, and competition-clock time and atomically stops the match clock if running.

The engine validates the configured `match_rules.team_timeouts_per_game` and `team_timeouts_per_period` ceilings. It rejects TTO during overtime. The UI displays the current usage for each side.

The application does not attempt to infer ball possession automatically; the operator remains responsible for entering a TTO only when awarded.

## Phase 7B — post-match record and summary

Add an internal match record view under the authenticated match detail.

Timeline rows show:
- period label
- official match clock
- side
- shirt number / display name when known
- event label
- correction / reverted state

Example labels:
- `前半 03:42  #7 鈴木  GOAL`
- `前半 08:15  #12 佐藤  2分間退場`
- `前半 14:03  #10 田中  7m GOAL`
- `前半 18:21  HOME  TEAM TIMEOUT`
- `後半 22:48  #7 鈴木  GOAL`

The summary derives from non-reverted record events and includes:
- goals by player
- goal times
- 7 m goals / attempts
- warnings
- suspension count
- disqualifications / report-required disqualifications
- team-timeout times
- regulation / overtime score progression

Private player / sanction records remain team-internal in Phase 7. Public LIVE continues to expose only its existing sanitized fields.

## Phase 7C — Offline-lite and PWA

### Authority model

The server remains authoritative. `match_state + match_events` remains the final source of truth.

Offline mode provides a local optimistic projection and a durable ordered action queue. It does not create an independent competing match database.

### Local persistence

Use IndexedDB in the browser for:
- latest accepted server snapshot per match
- latest local optimistic snapshot per match
- ordered pending action queue
- participant / MatchRoster snapshots needed by MATCH CONSOLE
- recent accepted record events needed to render the console and active suspensions

Do not persist Supabase access tokens or service-role credentials in custom IndexedDB stores.

### Queue items

Each queued action stores:
- `client_action_id`
- `match_id`
- local sequence number
- action name
- payload
- base server version
- event-time snapshot (`period`, `period_elapsed_ms`, `competition_elapsed_ms`)
- local enqueue timestamp
- sync state

The existing idempotent `client_action_id` contract is reused.

### Offline execution

While offline, the console may continue:
- start / stop / reset
- period changes
- goals and scorer attribution
- 7 m records
- warnings
- suspensions / disqualifications
- team timeouts
- reversals

The local reducer must mirror server state-transition rules closely enough to give a usable projection, but the server re-validates every queued action on reconnect.

### Reconnect / conflict policy

On reconnect:
1. fetch the latest authoritative server snapshot
2. if its version equals the base version expected by the first queued action, replay queued actions in local sequence order
3. after each accepted action, adopt the returned server snapshot and advance to the next queue item
4. if the server version has moved because another device operated the match, stop automatic replay and enter `conflict` state
5. never overwrite a newer server state silently

Conflict UI shows:
- server score / clock / period
- local optimistic score / clock / period
- count and summary of unsynced local actions

Phase 7 conflict recovery is intentionally conservative: the operator can discard local pending actions or return to the server state. Automatic semantic merge is out of scope.

### Connectivity status

MATCH CONSOLE always displays one of:
- `保存済み`
- `保存中`
- `同期中`
- `オフライン・N件未同期`
- `競合あり`

### PWA

Add:
- Web App Manifest
- installable icons generated from project-owned graphic assets (no font files or secrets)
- service worker
- standalone display mode
- theme / background metadata

Service-worker caching is limited to the application shell and safe static assets. Authenticated API responses, private match data, and Supabase RPC responses are not indiscriminately cached by the service worker.

## Data model changes

### `match_state`

Add:
- `competition_elapsed_ms bigint not null default 0`

The existing period clock remains unchanged for display compatibility.

### `match_events`

Extend the event enum with:
- `seven_meter_missed`
- `warning`
- `suspension`
- `disqualification`
- `team_timeout`
- `event_reverted`

Add indexed / queryable nullable columns:
- `period smallint`
- `period_elapsed_ms bigint`
- `competition_elapsed_ms bigint`
- `subject_side team_side`
- `subject_team_member_id uuid`
- `subject_match_roster_id uuid`

Keep specialized details in `payload`, including shirt-number snapshots, labels, goal method, suspension count, report-required marker, and reversal reason.

Do not grant anonymous access to these new private record columns or event types in Phase 7.

### Event reversal

Corrections are append-only. Existing event rows are never updated or deleted by application roles.

`event_reverted` points to the event being cancelled via `related_event_id`. A target event may be reverted only once. Score-affecting reversal applies the corresponding score correction atomically.

Keep existing `goal_reverted` events readable for backward compatibility; new UI may normalize both old and new reversal forms into one timeline concept.

## Server API changes

Extend `apply_match_action` rather than adding independent mutation endpoints for each record type.

Add authenticated read RPCs:
- `get_match_record_events(match_id)` — sanitized internal event timeline for team members
- `get_match_record_summary(match_id)` or derive summary in server TypeScript from the returned events; prefer TypeScript first unless query volume justifies a DB summary RPC

Update `get_match_console_snapshot` to return cumulative competition elapsed time.

All mutation authority remains in private security-definer internals called through authenticated SECURITY INVOKER wrappers. No service-role use in browser or application server code.

## MATCH CONSOLE UX

Keep the three-column score / clock / score layout as the primary surface.

Add a compact bottom record dock optimized for tablet landscape:
- `GOAL`
- `7m`
- `警告`
- `2分`
- `失格`
- `TTO`
- `記録`

Fast paths:
- score button still increments immediately
- after a goal, show an optional one-tap scorer picker; `未指定` is always available
- penalty actions open a compact participant picker, not a multi-step form
- opponent actions permit quick shirt-number entry

Show active suspensions directly below the relevant side with shirt number, label, and remaining playing time.

## Testing

### Pure unit tests

Cover:
- event clock stamping
- cumulative competition-time calculation
- suspension remaining time across halftime
- third suspension => disqualification flag
- warning ceilings
- TTO ceilings / overtime rejection
- 7 m goal vs miss scoring
- event reversal projection
- offline reducer parity for supported actions
- queue ordering and idempotent replay preparation
- conflict-state detection

### Supabase integration / SQL E2E

Use rollback / cleanup-safe fixtures to verify:
- record events receive official clock columns
- penalty / TTO atomically stop a running clock
- suspension start and expiry use competition playing time
- third suspension is recorded as disqualification-resulting
- score / 7 m / reversal consistency
- cross-team participant injection rejection
- direct application-role update/delete of events is denied
- anonymous event access remains denied

### Browser / Preview verification

Verify:
- tablet-landscape MATCH CONSOLE remains usable
- offline status changes when browser connectivity changes
- queued actions survive refresh
- reconnect replays a no-conflict queue
- synthetic stale-version case shows conflict instead of overwrite
- installed PWA launches standalone where browser support is available

## Out of scope for Phase 7

- referee decision automation
- computer-vision / automatic player recognition
- automatic possession detection for TTO validity
- semantic multi-device offline merge
- public player disciplinary timelines
- formal certified replacement for a JHA official score sheet

## Phase 8 boundary

Phase 8 follows after Phase 7 verification and adds Supabase Storage for:
- team logo
- team cover image
- player / staff photos

Storage must use path / bucket policies tied to organization / team membership, preserve safe public/private defaults, and not weaken Phase 7 match-record privacy.
