# Phase 8 — Team Workspace / UI Refresh Design

Date: 2026-08-26
Status: Approved in chat; implementation pending written-spec review
Branch: `phase-7-offline-match-records`

## 1. Goal

Evolve the current handball platform from a match-operation centered tool into a complete handball team workspace while preserving the Phase 7 match console, offline recording, PWA behavior, public LIVE, and existing privacy model.

The product should feel like a modern sports club workspace rather than a generic administration panel. The information architecture should cover the full team lifecycle:

- members and staff
- schedules (practice, matches, meetings, other activities)
- match results
- season management
- player season statistics entered later by staff
- existing match console and event history
- public team / match views where explicitly enabled

The feature organization is informed by the team-management patterns seen in teams.one, but the visual design and UX will be original and modernized for handball and tablet-first match operations.

## 2. Product principles

1. **Team first, match console specialized**
   - The authenticated app is organized around a selected team.
   - The match console remains a focused operational surface with larger controls and minimal distraction.

2. **Fast overview before deep detail**
   - A team dashboard should immediately show next schedule, recent result, season record, member count, and player leaders.

3. **Staff entry, player viewing by default**
   - Operationally, staff are expected to enter members, schedules, match results, seasons, and season statistics.
   - Authentication permission is kept separate from roster classification: `team_members.kind = staff` does not itself grant write access.
   - Existing team access roles remain the authority: authenticated team admins can manage data; ordinary team members primarily read/browse it.
   - Existing authorization remains intentionally lightweight but real; destructive and management actions remain admin gated.

4. **Tablet and mobile are first-class**
   - Desktop: persistent left navigation.
   - Tablet: collapsible side navigation / compact rail.
   - Mobile: bottom navigation for primary team areas plus overflow for secondary actions.

5. **Progressive enhancement of match data**
   - Staff may enter season statistics manually after games.
   - The schema is compatible with future automatic aggregation from `match_events` without requiring that automation in Phase 8.

## 3. Information architecture

Authenticated team workspace:

- Team Home
- Schedule
- Members
- Matches
- Statistics
- Team Settings

### Team Home

Dashboard modules:

- next scheduled activity
- latest completed match
- current season record (W-D-L)
- active member count
- top scorers for current season
- quick actions: add schedule, add member, add match, edit stats

### Schedule

Schedule categories:

- practice
- official match
- friendly / scrimmage
- meeting
- other

Each schedule event stores:

- title
- category
- start/end datetime
- venue / location
- memo
- optional linked match ID
- status (scheduled/cancelled/completed where appropriate)

Calendar UX:

- month view on desktop/tablet
- agenda-first view on mobile
- quick filters by category
- upcoming list under the calendar

#### Match/schedule synchronization

Match activities must not require duplicate maintenance.

- Creating a match from the Matches area creates or links one corresponding `team_events` row transactionally.
- Creating an official/friendly schedule item may optionally create/link a match when the user chooses “試合として管理”.
- For linked records, match date/time, opponent-facing match title, and venue changes are written through one server-side command so `matches` and `team_events` cannot silently diverge.
- Deleting a schedule event never silently deletes historical match records; linked-match deletion requires an explicit match deletion action.

### Members

Member directory supports:

- player / staff kind
- full name
- display name
- shirt number
- primary handball position
- grade / age group
- profile image
- active / inactive
- public / private

Member detail adds:

- current roster information
- season-stat history
- recent match appearances when available

### Matches / Results

Existing `matches`, `match_state`, `match_rosters`, and `match_events` remain the operational core.

Match record views gain:

- season
- competition / tournament name
- home/away label
- period scores where available from recorded match events
- final score
- result state (win/draw/loss)
- opponent
- venue
- match date/time
- notes

A completed match can be populated either:

1. from the existing match console event log, or
2. by staff entering a historical/manual result.

Manual historical results require a final score but do not require period-by-period event reconstruction.

### Seasons

A team may have multiple seasons, e.g.:

- 2026
- 2026-27
- 2027

Season fields:

- id
- team_id
- name
- start_date
- end_date
- is_current
- created_at / updated_at

Exactly one season per team should normally be marked current in the UI, enforced transactionally when changed.

Matches may link to a season through nullable `matches.season_id`. This powers current-season W-D-L summaries and keeps historical results grouped correctly.

### Player season statistics

Statistics are deliberately **staff-entered after the fact** in Phase 8.

Outfield baseline fields:

- appearances
- starts (optional)
- goals
- 7m_goals
- 7m_attempts
- warnings
- two_minute_suspensions
- disqualifications

Goalkeeper baseline fields:

- appearances
- saves
- shots_faced
- save_percentage (derived, not stored when possible)

Extensibility:

- keep manual source fields normalized enough to support future generated aggregates from `match_events`
- do not require event-level completeness for manual statistics

## 4. Proposed data model

New tables:

### `team_events`

- id uuid PK
- team_id uuid FK -> teams
- linked_match_id uuid nullable FK -> matches
- event_type enum (`practice`, `official_match`, `friendly`, `meeting`, `other`)
- title text
- starts_at timestamptz
- ends_at timestamptz nullable
- venue text nullable
- memo text nullable
- status enum (`scheduled`, `completed`, `cancelled`)
- created_by uuid nullable
- created_at / updated_at

Indexes:

- `(team_id, starts_at)`
- `(team_id, event_type, starts_at)`
- unique partial index on `linked_match_id` where it is not null

### `seasons`

- id uuid PK
- team_id uuid FK
- name text
- start_date date
- end_date date
- is_current boolean
- created_at / updated_at

Constraints/indexes:

- start_date <= end_date
- unique `(team_id, name)`
- partial unique index for one `is_current = true` season per team

### `season_player_stats`

- id uuid PK
- season_id uuid FK
- team_member_id uuid FK
- appearances int >= 0
- starts int >= 0 nullable/default 0
- goals int >= 0
- seven_meter_goals int >= 0
- seven_meter_attempts int >= 0
- warnings int >= 0
- two_minute_suspensions int >= 0
- disqualifications int >= 0
- saves int >= 0 nullable/default 0
- shots_faced int >= 0 nullable/default 0
- notes text nullable
- updated_by uuid nullable
- created_at / updated_at

Constraints:

- unique `(season_id, team_member_id)`
- seven_meter_goals <= seven_meter_attempts
- saves <= shots_faced when both are provided

Derived UI values:

- save percentage
- goals per appearance

### Match metadata additions

Extend `matches` conservatively rather than creating a parallel result system:

- season_id uuid nullable FK -> seasons
- competition_name text nullable
- completed_at timestamptz nullable
- result_source enum/text (`console`, `manual`) for provenance

Indexes:

- `(team_id, season_id, scheduled_at)`

Final score continues to come from match state for console-managed matches. Manual historical results initialize or safely write a finished `match_state` through a dedicated server action/RPC to preserve consistency.

## 5. Authorization / RLS

All new tables use RLS.

Baseline rules:

- authenticated team members can read internal team workspace data for teams they belong to
- team admins can create/update/delete schedules, seasons, manual results, and season stats
- roster classification (`player` / `staff`) is descriptive and does not bypass membership-role authorization
- public access is **not** granted to new internal tables by default
- public schedule/stat exposure, if introduced later, should use narrow read views/RPCs rather than direct broad table grants

Existing public match/team privacy behavior remains unchanged.

## 6. UI design system

### Visual direction

Original sports-workspace identity:

- deep ink/navy foundation
- bright athletic accent for primary actions and live states
- warm neutral surfaces rather than flat gray administration cards
- stronger typography hierarchy
- larger numerals for scores/stats
- data-dense but readable cards
- subtle borders and elevation, not excessive shadows
- rounded geometry kept disciplined; not every surface is a floating card

### App shell

Desktop:

- left sidebar with team identity at top
- primary navigation with icon + label
- contextual quick-create button
- account / logout at bottom

Tablet:

- compact rail that expands into a drawer

Mobile:

- sticky bottom navigation for Home / Schedule / Matches / Members / More
- stats/settings accessible through More

### Team Home composition

Top hero:

- team identity
- current season selector
- primary quick action

First row:

- next schedule
- recent result

Second row:

- season record
- member count
- top scorer

Lower area:

- upcoming events
- recent results
- scoring leaderboard

### Match console

Do not force the standard workspace card language onto the console.

The console retains:

- high-contrast score/time controls
- oversized touch targets
- offline/sync state visibility
- event history dock
- rule-aware sanctions and scoring

Only shared typography, color tokens, shell transition, and navigation affordances are refreshed.

## 7. Component boundaries

New/updated frontend units should be intentionally isolated:

- `TeamWorkspaceShell`
- `TeamSidebar`
- `MobileTeamNav`
- `TeamDashboard`
- `NextEventCard`
- `RecentResultCard`
- `SeasonSummaryCard`
- `ScoringLeaders`
- `ScheduleCalendar`
- `ScheduleAgenda`
- `MemberDirectory`
- `MemberProfile`
- `SeasonSelector`
- `SeasonStatsTable`
- `SeasonStatsEditor`

Feature modules:

- `features/schedule`
- `features/seasons`
- `features/stats`

Existing `features/matches`, `features/team-core`, and match console code remain separate.

## 8. Routes

Recommended routes:

- `/app/teams/[teamId]` — team dashboard
- `/app/teams/[teamId]/schedule`
- `/app/teams/[teamId]/members`
- `/app/teams/[teamId]/members/[memberId]`
- `/app/teams/[teamId]/matches`
- `/app/teams/[teamId]/stats`
- `/app/teams/[teamId]/settings`

Existing match detail/console routes remain compatible and should be linked from the Matches workspace.

## 9. Implementation phases

### Phase 8A — Design system and app shell

- refresh tokens and global typography
- build responsive workspace shell
- introduce team-scoped navigation
- retain login/auth behavior

### Phase 8B — Team dashboard

- dashboard composition
- derived summary queries
- next event / latest result / current-season summary

### Phase 8C — Schedule

- migration + RLS for `team_events`
- CRUD server actions
- calendar/agenda UI
- linked match/event synchronization command

### Phase 8D — Member directory refresh

- modern directory + filters
- member profile page
- keep existing member registration semantics

### Phase 8E — Match results

- add season and match metadata
- richer match list/result presentation
- manual historical result entry
- preserve console path for live/offline recording

### Phase 8F — Seasons and player statistics

- migrations + RLS for seasons/stats
- season switcher
- bulk staff stats editor
- player season history

## 10. Testing strategy

### Unit tests

- season validation
- result classification (W/D/L)
- derived save percentage
- date grouping and schedule filters
- permission helpers
- match/schedule synchronization input mapping

### Server/data tests

- RLS: unauthorized users cannot read/write another team
- ordinary team members cannot perform admin writes
- team admin can manage team data
- season current uniqueness
- stats constraints
- manual result consistency with match state
- linked match/event date and venue consistency

### Browser QA

Desktop + mobile flows:

1. log in
2. choose team
3. dashboard renders summaries
4. create practice schedule
5. create/edit player
6. create season
7. enter player stats
8. add manual match result
9. confirm linked match appears once in schedule
10. open existing match console
11. verify console offline/reconnect path still works
12. verify public LIVE still works without regression

### Accessibility

- keyboard navigation on desktop
- visible focus states
- sufficient contrast
- labels for icon-only controls
- minimum touch target size on tablet/mobile

## 11. Non-goals for Phase 8

Explicitly deferred:

- automatic attendance collection
- chat / messaging
- payments / dues
- automatic season-stat calculation from every match event
- public player rankings across teams
- tournament bracket management

These can be added later without changing the core schema boundaries above.

## 12. Success criteria

Phase 8 is complete when:

- the authenticated UI visibly feels like a modern sports team product rather than a generic admin screen
- desktop, iPad, and mobile navigation are purpose-built
- members, schedule, matches/results, seasons, and player stats each have clear dedicated surfaces
- staff can manually maintain season statistics through an admin-capable account
- existing match console/offline/PWA/public LIVE behavior still passes regression QA
- all new data is protected by RLS
- linked matches do not require duplicate schedule maintenance
- the Vercel preview is green and usable end-to-end
