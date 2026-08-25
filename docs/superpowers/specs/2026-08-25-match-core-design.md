# Match Core Design

## Goal

Add the match setup layer that sits between Team Core and the future Match Console. A team member can create a handball match, configure the rules that govern its clock, select the participating roster, and review the complete match setup before opening the console in the next phase.

## Scope

Phase 3 includes:

- `matches`.
- `match_rules` as a one-to-one per-match rules snapshot.
- `match_rosters` as per-match snapshots of selected team roster records.
- Match creation from a team.
- Match detail.
- Editable match rules at creation time.
- Match roster selection from active `team_members`.
- Team dashboard/list integration for upcoming/recent matches.
- RLS for all new match tables.

Phase 3 does not include:

- `match_events`.
- `match_state`.
- Match timer runtime.
- Score actions.
- Goal undo.
- Realtime LIVE publication.
- Match finish/final score.
- Offline IndexedDB synchronization.

Those are Phase 4 Match Console responsibilities.

## Authorization

Match operation is intentionally less restrictive than roster administration.

- Any authenticated `team_user_memberships` member of the team (`admin` or `member`) may create a match.
- Any team user member may read and update matches/rules/rosters for that team.
- Anonymous users receive no direct Phase 3 match-table access.
- Public match/live read interfaces are deferred until Match Console establishes the state/event projection.
- Authorization remains database/RLS based, never `user_metadata`.

This supports real gym operation where a player or other ordinary team member may be responsible for the match timer or result input.

## Match model

### `match_status`

Enum:

- `scheduled`
- `live`
- `finished`
- `cancelled`

Phase 3 creates matches as `scheduled`. Phase 4 owns transitions to `live` and `finished`.

### `team_side`

Enum:

- `home`
- `away`

### `matches`

- `id uuid primary key default gen_random_uuid()`
- `team_id uuid not null references teams(id) on delete cascade`
- `name text not null`
- `opponent_name text not null`
- `team_side team_side not null default 'home'`
- `scheduled_at timestamptz not null`
- `venue text`
- `memo text`
- `status match_status not null default 'scheduled'`
- `is_public boolean not null default false`
- timestamps

`opponent_name` is plain text so an opponent does not need to be registered in the platform.

For this Japan-first MVP, match creation interprets `datetime-local` input as Asia/Tokyo (`+09:00`) before writing `timestamptz`. A future organization/team timezone setting can replace this assumption without changing stored timestamps.

## Match rules

`match_rules`

- `match_id uuid primary key references matches(id) on delete cascade`
- `period_count smallint not null default 2`, constrained `1..4`
- `period_seconds integer not null default 1800`, constrained `60..3600`
- `halftime_seconds integer not null default 600`, constrained `0..1800`
- `overtime_enabled boolean not null default false`
- `overtime_period_count smallint not null default 2`, constrained `1..4`
- `overtime_period_seconds integer not null default 300`, constrained `60..1800`
- `team_timeouts_per_game smallint not null default 2`, constrained `0..3`
- `team_timeouts_per_period smallint not null default 1`, constrained `0..2`
- `team_timeout_seconds integer not null default 60`, constrained `30..120`
- timestamps

Defaults correspond to a standard adult/high-school 30-minute-half setup, while every value needed by the console is editable per match. Middle-school, elementary, tournament, and organizer-specific formats can therefore be represented without changing the schema.

## Match roster snapshot

`match_rosters`

- `id uuid primary key default gen_random_uuid()`
- `match_id uuid not null references matches(id) on delete cascade`
- `team_member_id uuid references team_members(id) on delete set null`
- `kind team_member_kind not null`
- `full_name_snapshot text not null`
- `display_name_snapshot text`
- `shirt_number_snapshot smallint`
- `primary_position_snapshot handball_position`
- `created_at timestamptz not null default now()`

A partial unique index prevents the same current `team_member_id` from being selected twice for one match.

The snapshot is intentionally copied at roster-selection time. Later edits to a player's name, shirt number, position, or roster status must not rewrite historical match records.

Only the platform team's own roster is stored in Phase 3. Opponent players are not modeled yet; the opponent is represented by `opponent_name`. This keeps the first console flow focused and avoids inventing an opponent-roster subsystem before statistics require one.

## Atomic creation

`create_match_with_rules(...)` creates the `matches` row and `match_rules` row in one transaction.

- Caller must be an authenticated team user member.
- The new match always starts `scheduled`.
- The function returns the new match UUID.
- Implementation follows the hardened Team Core pattern: exposed invoker wrapper with non-exposed private helper only when elevated privileges are required.

Roster replacement uses `set_match_roster(match_id, team_member_ids uuid[])`.

- Caller must be a team user member for the match's team.
- Every supplied team-member ID must belong to that same team.
- The operation atomically replaces the current `match_rosters` rows.
- Snapshot values are copied by the database from `team_members` rather than trusted from browser fields.
- Empty selection is allowed so a match can be saved before the roster is finalized.

## RLS

RLS is enabled on `matches`, `match_rules`, and `match_rosters`.

Internal helper:

- `private.can_manage_match(match_id)` resolves the match team and delegates to the existing private team-membership helper.

Policies:

- `matches`: team user members can select/insert/update/delete their team's matches. Insert requires the target `team_id` to be one of the user's teams.
- `match_rules`: users who can manage the parent match can select/update; creation is handled atomically with the match.
- `match_rosters`: users who can manage the parent match can select; replacement is handled by the roster RPC.

No anonymous grants are introduced in this phase.

## Validation

Pure TypeScript form parsers validate:

- team ID UUID.
- match name: trimmed, required, max 100.
- opponent name: trimmed, required, max 100.
- team side: `home | away`.
- scheduled local datetime: `YYYY-MM-DDTHH:mm` and a valid calendar date/time; converted to ISO using `+09:00`.
- venue: optional, max 120.
- memo: optional, max 2000.
- public flag: checkbox boolean.
- rules: integer-only and within the same ranges as database constraints.

Rules are submitted as seconds internally while the UI presents period/halftime/timeout durations in minutes where appropriate.

## Application flow

### Team detail

`/app/teams/[teamId]` gains:

- Create match action for any team user member.
- Upcoming/recent match list.

### Create match

`/app/teams/[teamId]/matches/new`

Single form containing:

- match name.
- opponent.
- HOME/AWAY.
- date/time.
- venue.
- memo.
- public toggle.
- rule settings with sensible defaults.

Successful creation redirects to roster selection.

### Match roster

`/app/matches/[matchId]/roster`

- Shows active team players/staff.
- Defaults to selecting all active roster rows for a new match.
- User can deselect anyone not participating.
- Save atomically snapshots selected rows.
- Then redirects to match detail.

### Match detail

`/app/matches/[matchId]`

Shows:

- opponent and HOME/AWAY.
- scheduled date/time and venue.
- rule summary.
- roster snapshot.
- edit-roster action.
- disabled/coming-next Match Console entry point until Phase 4.

No fake score or live state is shown.

## Error handling

- Invalid form values return concise Japanese messages.
- Missing/inaccessible team or match routes use `notFound()`.
- Roster IDs from another team are rejected by the database RPC atomically.
- Duplicate/invalid requests cannot leave a match without its rules row.
- Application errors never expose raw RLS/database messages to end users.

## Testing and verification

- TDD unit tests for match parser, date conversion, rule bounds, and roster ID parsing.
- Migration SQL committed before application.
- SQL verification for RLS, policies, and function execution privileges.
- Transactional authenticated E2E: create match/rules → select roster → mutate source team member → confirm snapshot unchanged → reject foreign-team roster ID → rollback.
- Supabase Security Advisor after migrations.
- GitHub CI: unit tests, TypeScript, ESLint, production build.
- Vercel Preview reaches READY and public/unauthenticated routes continue to work.

## Security constraints

- GitHub remains the source of truth.
- No service-role key in browser or Server Actions.
- Match privileges derive from actual team membership.
- Roster snapshots are constructed in the database from trusted team-member rows.
- No new anonymous access is introduced in Phase 3.
