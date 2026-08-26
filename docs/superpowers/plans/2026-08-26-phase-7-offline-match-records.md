# Phase 7 Offline Match Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make MATCH CONSOLE a rule-aware match-recording PWA that preserves a post-match event timeline and keeps operating through temporary connectivity loss without weakening the authoritative server state model.

**Architecture:** Extend the existing `match_state + match_events + apply_match_action` engine. The server remains authoritative; new rule-aware event actions atomically stamp competition-clock time and apply score/clock effects. The browser maintains an IndexedDB-backed optimistic projection and ordered action queue for Offline-lite, then replays only when the server version still matches the queue base version.

**Tech Stack:** Next.js 16.x, React 19.x, TypeScript 5.7+, Tailwind CSS 4.x, Supabase PostgreSQL/Auth/Realtime, native IndexedDB, Web App Manifest, service worker, Vitest, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-26-phase-7-offline-match-records-design.md`

## Global Constraints

- GitHub remains the source of truth for migration SQL and application code.
- No service-role key in browser or application server code.
- Existing RLS/team membership remains the authorization boundary.
- Public LIVE must not gain access to private player disciplinary/event history in Phase 7.
- Existing `client_action_id` idempotency and optimistic server `version` checks remain intact.
- `match_state + match_events` remains authoritative; offline state is only an optimistic projection.
- 2-minute suspension expiry is based on competition playing time, not wall-clock time.
- Penalty/TTO decisions are entered by humans; the app only validates unambiguous record consistency.
- Do not introduce a new runtime dependency solely for IndexedDB or PWA support.
- Every implementation task ends with targeted tests and CI/type/lint/build verification appropriate to the task.

---

### Task 1: Pure match-record domain helpers

**Files:**
- Create: `src/features/match-records/types.ts`
- Create: `src/features/match-records/runtime.ts`
- Create: `src/features/match-records/runtime.test.ts`

**Interfaces:**
- Produces `RecordEventType`, `RecordSubject`, `RecordEvent`, `ActiveSuspension`, `MatchRecordSummary`.
- Produces `remainingSuspensionMs(event, competitionElapsedMs)`.
- Produces `deriveActiveSuspensions(events, competitionElapsedMs)`.
- Produces `deriveMatchRecordSummary(events)`.
- Produces `isEventReverted(eventId, events)`.

- [x] **Step 1: Write failing tests** for suspension remaining time, suspension crossing halftime, third-suspension summary, 7 m attempt/goal totals, warning totals, reverted-event exclusion, and team-timeout times.
- [x] **Step 2: Commit the tests only and verify CI RED** because `runtime.ts` / `types.ts` do not yet exist.
- [x] **Step 3: Implement minimal pure TypeScript domain helpers** with no Supabase/browser dependencies.
- [x] **Step 4: Verify targeted tests GREEN**, then run full `npm test`, typecheck and lint through CI.
- [x] **Step 5: Commit** as `feat: add match record domain helpers`.

### Task 2: Database event-clock and rule-aware action engine

**Files:**
- Create: `supabase/migrations/20260826170000_match_record_event_schema.sql`
- Create: `supabase/migrations/20260826170100_match_record_action_engine.sql`
- Create: follow-up goal-attribution/correction migrations as required by the finalized event model.

**Interfaces:**
- Extends `match_state` with `competition_elapsed_ms`.
- Extends `match_event_type` with `seven_meter_missed`, `warning`, `suspension`, `disqualification`, `team_timeout`, `event_reverted`.
- Extends `match_events` with `period`, `period_elapsed_ms`, `competition_elapsed_ms`, `subject_side`, `subject_team_member_id`, `subject_match_roster_id`.
- Extends `public.apply_match_action(...)` behavior for new actions while preserving the signature.
- Extends `public.get_match_console_snapshot(uuid)` with `competition_elapsed_ms`.
- Produces authenticated `public.get_match_record_events(uuid)`.

- [x] **Step 1: Commit migration SQL before applying it.** Add constraints/indexes and fixed `search_path` on any new/changed security-definer function.
- [x] **Step 2: Implement effective-clock materialization** so every action has `period_elapsed_ms` and `competition_elapsed_ms`; `start_clock` anchors both values without per-second writes; `stop_clock`, period changes, penalties, TTO and finish materialize both.
- [x] **Step 3: Implement new action rules:**
  - `goal`: optional scorer, optional `goal_method=seven_meter`, +1 score.
  - `seven_meter_missed`: no score change.
  - `warning`: participant required when managed-team subject; reject duplicate player warning / warning after suspension/disqualification / fourth player warning under normal progressive rules.
  - `suspension`: atomically stop running clock; compute suspension count; payload stores start/expiry competition elapsed; third player suspension marks resulting disqualification.
  - `disqualification`: atomically stop running clock; payload stores `report_required` boolean.
  - `team_timeout`: atomically stop running clock; enforce configured per-game/per-period limits; reject overtime.
  - `revert_event`: append `event_reverted`, reject duplicate reversion, and atomically reverse score if the target was a non-reverted goal.
- [x] **Step 4: Reject cross-team managed participant injection** by validating target MatchRoster/team-member references against the match roster and match team.
- [x] **Step 5: Keep application-role direct UPDATE/DELETE on `match_events` denied** and keep anon event access denied.
- [x] **Step 6: Apply the exact migration through Supabase tooling.**
- [x] **Step 7: Run rollback/cleanup-safe authenticated SQL E2E** covering clock stamps, penalty clock stop, halftime-safe suspension math, third suspension, 7 m score/miss, TTO limits, reversion, cross-team rejection and private access.
- [x] **Step 8: Run Supabase Security Advisor** and fix only new Phase 7 findings via a new migration.

### Task 3: Match-record data shaping and console data

**Files:**
- Modify: `src/features/match-console/types.ts`
- Modify: `src/features/match-console/data.ts`
- Modify: `src/features/match-console/validation.ts`
- Modify: `src/features/match-console/actions.ts`
- Create: `src/features/match-records/data.ts`
- Create: `src/features/match-records/data-shaping.ts`
- Create: `src/features/match-records/data-shaping.test.ts`

**Interfaces:**
- `ConsoleSnapshot` gains `competitionElapsedMs`.
- `MatchConsoleData` gains MatchRoster participant choices and recent record events.
- `parseConsoleAction` accepts new actions and validates side/participant/shirt number/goal method/report marker/target event id.
- `listMatchRecordEvents(matchId)` returns typed internal events.
- `getMatchRecordSummary(matchId)` derives summary from typed events.

- [x] **Step 1: Add failing shaping/validation tests** for snake_case event rows, new console snapshot field, scorer/subject payload validation and event reversal id.
- [x] **Step 2: Commit tests only and observe RED.**
- [x] **Step 3: Implement mapping/data access using the existing authenticated Supabase server client only.**
- [x] **Step 4: Extend `applyConsoleAction` error mapping** for invalid record actions while preserving stale-version refresh behavior.
- [x] **Step 5: Run targeted and full CI checks; commit** as `feat: connect match record data layer`.

### Task 4: Rule-aware MATCH CONSOLE UX

**Files:**
- Modify: `src/components/match-console/match-console.tsx`
- Create: `src/components/match-console/record-dock.tsx`
- Create: `src/components/match-console/participant-picker.tsx`
- Create: `src/components/match-console/active-suspensions.tsx`
- Create: `src/components/match-console/recent-events.tsx`
- Create: `src/components/match-console/record-dock.test.tsx` only if the current test environment supports component rendering without adding a runtime dependency; otherwise test extracted pure view-model helpers in `src/features/match-records/console-view-model.test.ts`.

**Interfaces:**
- Keeps existing large HOME / CLOCK / AWAY control surface.
- Adds compact actions: `7m`, `警告`, `2分`, `失格`, `TTO`, `記録`.
- Goal remains one-tap and immediately changes score; an optional scorer picker follows without blocking score update.
- Penalty/TTO action automatically reflects stopped-clock snapshot returned by server.

- [x] **Step 1: Extract/test view-model logic** for period-clock labels, penalty button availability, active suspension labels and post-goal scorer suggestion state.
- [x] **Step 2: Implement tablet-landscape record dock** with large touch targets and minimal modal depth.
- [x] **Step 3: Implement managed-team participant picker** from MatchRoster snapshots and opponent quick number/label entry.
- [x] **Step 4: Display active suspensions** by side with remaining competition-playing-time countdown.
- [x] **Step 5: Display recent record events and allow explicit correction/reversal**; no destructive event delete.
- [x] **Step 6: Verify responsive build/CI and commit** as `feat: extend match console recording`.

### Task 5: Internal post-match timeline and summary

**Files:**
- Modify: `src/app/app/matches/[matchId]/page.tsx`
- Create: `src/components/matches/match-record-timeline.tsx`
- Create: `src/components/matches/match-record-summary.tsx`
- Create: `src/features/match-records/presentation.ts`
- Create: `src/features/match-records/presentation.test.ts`

**Interfaces:**
- `formatRecordClock(event)` formats period + official elapsed time.
- Timeline excludes reverted events from aggregate totals but visually preserves correction history when requested.
- Summary shows player goals, goal times, 7 m goals/attempts, warnings, suspensions, disqualifications and TTO times.

- [x] **Step 1: Write RED presentation tests** for Japanese labels and official clock formatting.
- [x] **Step 2: Implement pure presentation helpers and GREEN tests.**
- [x] **Step 3: Add `試合記録` section to authenticated match detail.**
- [x] **Step 4: Add player/side summary cards and chronological timeline.**
- [x] **Step 5: Confirm public `/live` and `/teams/[slug]` APIs/renderers do not expose these private event details.**
- [x] **Step 6: Run full CI and commit** as `feat: add post match record view`.

### Task 6: Offline reducer and durable queue

**Files:**
- Create: `src/features/offline-match/types.ts`
- Create: `src/features/offline-match/reducer.ts`
- Create: `src/features/offline-match/reducer.test.ts`
- Create: `src/features/offline-match/queue.ts`
- Create: `src/features/offline-match/queue.test.ts`
- Create: `src/features/offline-match/idb.ts`

**Interfaces:**
- `applyLocalAction(state, action, nowMs)` returns optimistic snapshot/events or a validation error.
- `buildQueueItem(...)` stamps local sequence/base version/event clock.
- `detectReplayState(serverVersion, queue)` returns `ready | conflict | empty`.
- IndexedDB stores `matchSnapshots`, `matchEvents`, `matchParticipants`, `pendingActions`.

- [x] **Step 1: Write failing reducer tests** for clock, goal, 7 m, suspension clock stop, third suspension, TTO and reversion.
- [x] **Step 2: Write failing queue tests** for ordered sequence, duplicate client action id prevention, refresh persistence shape and conflict detection.
- [x] **Step 3: Implement pure reducer and queue helpers until tests GREEN.**
- [x] **Step 4: Implement a minimal native IndexedDB wrapper** with schema versioning and no credential/token storage.
- [x] **Step 5: Run full CI and commit** as `feat: add offline match action queue`.

### Task 7: MATCH CONSOLE Offline-lite synchronization

**Files:**
- Modify: `src/components/match-console/match-console.tsx`
- Create: `src/components/match-console/sync-status.tsx`
- Create: `src/components/match-console/conflict-panel.tsx`
- Create: `src/features/offline-match/sync.ts`
- Create: `src/features/offline-match/sync.test.ts`

**Interfaces:**
- Sync state: `saved | saving | syncing | offline | conflict`.
- Online actions still prefer immediate server execution.
- Network failure queues the action and applies the local reducer.
- Reconnect compares authoritative server version with first queued base version before replay.

- [x] **Step 1: Write RED sync-decision tests** for no-conflict replay, stale-server conflict, sequential expected-version advancement, and partial replay failure.
- [x] **Step 2: Implement pure sync planning helpers.**
- [x] **Step 3: Wire browser `online` / `offline` events and IndexedDB hydration into MATCH CONSOLE.**
- [x] **Step 4: Queue on transport failure/offline, replay in local sequence order on reconnect, and adopt each returned authoritative snapshot.**
- [x] **Step 5: Implement conservative conflict UI** showing server vs local score/clock/period and pending-action count, with `ローカル未同期を破棄してサーバー状態へ戻る` as the safe resolution.
- [x] **Step 6: Keep server validation authoritative for rule conflicts discovered during replay.**
- [x] **Step 7: Run CI and commit** as `feat: add match console offline sync`.

### Task 8: PWA shell

**Files:**
- Create: `src/app/manifest.ts`
- Modify: `src/app/layout.tsx`
- Create: `public/sw.js`
- Create: `src/components/site/service-worker-registration.tsx`
- Create: `src/features/pwa/cache-policy.test.ts`
- Create: `src/features/pwa/cache-policy.ts`
- Add project-owned PWA icon PNG assets under `public/icons/`.

**Interfaces:**
- Manifest uses `display: standalone`, project name, theme/background colors and 192/512 icons.
- Service worker caches only same-origin safe static/application-shell GET assets.
- Service worker explicitly bypasses `/api`, Supabase hosts, auth routes, Server Action POSTs and non-GET requests.

- [x] **Step 1: Write RED cache-policy tests** for safe static cache allow-list and private/API bypass cases.
- [x] **Step 2: Implement cache-policy helper and use the same rules in `sw.js`.**
- [x] **Step 3: Add manifest, icons, metadata, registration component and service worker.**
- [x] **Step 4: Verify production build includes manifest and service-worker assets.**
- [x] **Step 5: Run full CI and commit** as `feat: make match console installable pwa`.

### Task 9: Phase 7 end-to-end verification

**Files:**
- Modify: `docs/superpowers/plans/2026-08-26-phase-7-offline-match-records.md`

- [x] **Step 1: Run fresh GitHub CI** and require Unit tests, TypeScript, ESLint and Production build GREEN.
- [x] **Step 2: Run fresh Supabase Security Advisor** and record only outstanding unrelated project warnings separately.
- [x] **Step 3: Run deterministic Supabase E2E fixture** through create match → start → goal/scorer → warning → suspension → resume → halftime carry → third suspension/disqualification → 7 m goal/miss → TTO → correction → finish → timeline read; delete fixtures afterward and verify zero remains.
- [x] **Step 4: Verify anonymous queries cannot read private match events / sanction subjects.**
- [x] **Step 5: Verify latest Vercel Preview reaches READY and generated routes/assets include MATCH CONSOLE, match detail, manifest and service worker.**
- [x] **Step 6: Where browser automation is unavailable, do not claim actual ServiceWorker/WebSocket/IndexedDB browser execution; record that limitation explicitly and provide the Preview for interactive QA.**
- [x] **Step 7: Open a Phase 7 PR to `main` with rule references, security evidence, CI evidence, Preview evidence, and browser-QA limitations.**

## Phase 7 Verification Evidence

Recorded on 2026-08-26 after implementation and pre-merge review.

- **GitHub CI:** run `32960628603` on implementation commit `8ef3fc87244f44429e138cb5473f5a266e10d732` completed with Unit tests, TypeScript, ESLint, and Production build GREEN. The review regression adds explicit coverage that conflict discard removes optimistic events by queued `clientActionId` rather than relying on an ID prefix.
- **Supabase migrations:** Phase 7 event/action/attribution migrations and `phase7_performance_hardening` are applied to project `ecvdqvekhfpctgqpawha` and represented in GitHub migration SQL.
- **Supabase deterministic E2E:** the real `public.apply_match_action` path produced final score `2-0`, final version `14`, and `14` timeline events. It verified scorer attribution, warning, 2-minute suspension clock stop, `60,000 ms` suspension carry across halftime, third-suspension disqualification, 7 m goal/miss, TTO, append-only correction, finish, and timeline read. The temporary fixture was then deleted and verified at zero rows across its organization/team/member/match/roster/event records.
- **Anonymous privacy boundary:** `anon` has no `SELECT` privilege on `public.match_events`, no `EXECUTE` privilege on `public.get_match_record_events(uuid)`, and `match_events` RLS is enabled.
- **Supabase Security Advisor:** no Phase 7 schema warning remains. The only security warning is the separate project-level Auth setting `Leaked Password Protection Disabled`.
- **Supabase Performance Advisor:** the actionable Phase 7 unindexed-foreign-key and per-row `auth.uid()` RLS initplan findings were fixed. Remaining notices are `unused_index` INFO, including newly created FK indexes that have not yet accumulated runtime usage.
- **Vercel:** deployment `dpl_AgcvEBt7rjLdvAL8RHSxTGAjFJkw` for implementation commit `8ef3fc87244f44429e138cb5473f5a266e10d732` reached `READY`. The branch alias is `handball-team-platform-git-phase-7-offline-matc-607f24-s-s-lab1.vercel.app`.
- **Production build routes/assets:** Next build includes `/app/matches/[matchId]/console`, `/app/matches/[matchId]`, `/live/[matchId]`, `/teams/[slug]`, and static `/manifest.webmanifest`; `public/sw.js` and 192/512 PWA icon PNGs are source-controlled public assets.
- **PR:** Draft PR #7, `Phase 7: offline match records and PWA`, targets `main` and records rule, security, CI, Preview, and browser-QA evidence.
- **Browser QA limitation:** actual browser Service Worker registration/install, IndexedDB persistence across reload, browser offline/online switching, and WebSocket/Realtime execution were **not** directly automated or claimed. Vercel Preview is Deployment-Protected in this environment, so interactive browser QA remains recommended before marking PR #7 ready to merge.
