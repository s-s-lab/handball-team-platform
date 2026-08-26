# Phase 6 Public Portal + Team Search Implementation Plan

**Goal:** Turn `/` into the anonymous public portal for live matches, upcoming matches, recent results, and public team search while preserving the existing service introduction.

**Architecture:** Reuse Phase 5's sessionless publishable-key Supabase client and RLS boundary. Add two narrow `SECURITY INVOKER` RPCs for portal match summaries and team search, shape all RPC data before rendering, and keep the top page server-rendered with a GET search form.

**Spec:** `docs/superpowers/specs/2026-08-26-public-portal-search-design.md`

## Scope

- `/` remains both product introduction and public sports portal.
- Portal feed contains all public LIVE matches, the next 10 public scheduled matches, and the latest 10 public finished matches.
- Team search covers public `teams.name` and `teams.short_name` only, limit 20.
- Public reads use `createPublicClient()` and anonymous RLS.
- Player/member search, PWA, Storage, extra filters, fuzzy search, pagination, analytics and final visual redesign remain out of scope.

## Completed implementation

### Task 1 — Public portal types and shaping

- [x] RED test committed before implementation; CI run `32913720309` failed because `./data-shaping` did not exist while the existing 80 tests passed.
- [x] Added `PublicPortalMatch`, `PublicTeamSearchResult` and supporting enums/types.
- [x] Added strict runtime shaping for UUIDs, slugs, dates, status, side, nullable strings and non-negative integer scores.
- [x] Added `groupPublicPortalMatches()`.
- [x] Added five shaping tests.
- [x] GREEN on commit `a02af17ccae4d6ed16c24f2539c7fbca35ab2495`.

### Task 2 — Portal/search database boundary

- [x] Added `supabase/migrations/20260826110000_public_portal_search.sql` before applying it.
- [x] Applied migration `public_portal_search`, Supabase migration version `20260826000933`.
- [x] Added `public.get_public_portal_matches()` as `SECURITY INVOKER`, stable, `search_path = public, pg_temp`.
- [x] Added `public.search_public_teams(text)` as `SECURITY INVOKER`, stable, `search_path = public, pg_temp`.
- [x] Revoked PUBLIC/authenticated execution and granted execution to `anon`.
- [x] Anonymous E2E proved private-team/public-match and public-team/private-match rows are hidden.
- [x] Anonymous E2E proved public LIVE is visible.
- [x] Anonymous E2E proved scheduled and finished feeds are independently capped at 10.
- [x] Anonymous E2E proved public team name/short-name search works and private-team/blank searches return zero rows.
- [x] RPC output keys were inspected and contained only the documented safe fields.
- [x] Anonymous `matches.memo` access returned `42501 permission denied`.
- [x] Anonymous `match_events` access returned `42501 permission denied`.
- [x] Deterministic `f600...` DB fixture was deleted and verified at zero rows.
- [x] Supabase Security Advisor reported no new Phase 6 finding. The only remaining warning is the pre-existing `auth_leaked_password_protection` warning.

### Task 3 — Server-only data access

- [x] RED test committed before implementation; CI run `32914094914` failed because `./data` did not exist.
- [x] Added `getPublicPortalMatches()` using the sessionless public client.
- [x] Added trimmed `searchPublicTeams()` with no RPC call for blank queries.
- [x] Both data functions fail soft to `[]` on RPC errors.
- [x] GREEN on CI run `32914144126`.

### Task 4 — Public match sections

- [x] RED render test committed before implementation.
- [x] Added LIVE, upcoming and recent-result server-renderable sections.
- [x] Added separate `/teams/[slug]` and `/live/[matchId]` links without nested interactive elements.
- [x] Added explicit empty states for all three groups.
- [x] Added Asia/Tokyo date/time formatting at module scope.
- [x] Added `vitest.config.ts` alias configuration so Vitest resolves the same `@/*` paths as TypeScript/Next.js.
- [x] GREEN on CI run `32914433843`.

### Task 5 — Team search

- [x] RED render test committed before implementation; existing 91 tests passed before the missing component failure.
- [x] Added GET form to `/` with `team_q`, `type=search`, max length 100 and preserved submitted value.
- [x] Added public team result links to `/teams/[slug]`.
- [x] Added exact no-result message `該当する公開チームは見つかりませんでした。`.
- [x] GREEN on CI run `32914567009`.

### Task 6 — Integrate `/`

- [x] RED page tests committed before implementation; the three new assertions failed against the old static landing page while the other 94 tests passed.
- [x] Converted `/` to an async Server Component.
- [x] Added first-value/trim/100-character normalization for repeated `team_q` values.
- [x] Started match/search reads in parallel and skipped search RPC for blank queries.
- [x] Preserved the product headline, explanatory copy, signup CTA and login action.
- [x] Removed the fake static MATCH CONSOLE preview.
- [x] Added `公開試合` with real LIVE/upcoming/result data.
- [x] Added `チームを探す` with submit-based public search.
- [x] Preserved the existing three product principles below the public portal.
- [x] Latest feature commit `a9ba83b0ddd09cf59d74e63c18d39cd86f9a4296` passed 97 tests, TypeScript, ESLint and Production build in GitHub Actions run `32914736970`.

## Runtime and security verification

- [x] Vercel Preview deployment `dpl_AA87Cu8Gu3C4HPM9EWMr7uG5pv3d` for feature commit `a9ba83b0ddd09cf59d74e63c18d39cd86f9a4296` is READY.
- [x] Branch alias root returned HTTP 200 with `x-matched-path: /`.
- [x] Runtime fixture rendered `Phase 6 Public Handball`, `Phase 6 Live Opponent`, LIVE score `8-7`, scheduled match, finished score `20-18`, `/live/<matchId>` and `/teams/<teamSlug>` links, and the team-search form.
- [x] A live match belonging to the private runtime team did not render in the public root output.
- [x] Runtime anonymous recheck confirmed `matches.memo` and `match_events` still return `42501 permission denied`.
- [x] Final Security Advisor check found no new Phase 6 warning.
- [x] Runtime `f610...` fixtures were deleted and verified at zero organizations, teams, matches, states and events.
- [ ] Automated HTTP-200 observation of `/?team_q=...` was not available: after the successful root fetch, Vercel Authentication began returning 302 at the protection layer for subsequent root/query requests, including temporary-share attempts. Search correctness is covered by real anonymous DB E2E plus server-render/unit tests; this limitation is not recorded as a successful Preview search observation.

## Pull request

- [x] Draft PR **#6 — `Phase 6: public portal and team search`** created against `phase-5-public-live`.
- [x] PR records migration/RLS evidence, 97-test GREEN CI, Vercel runtime evidence, cleanup and the protected-query limitation.
- [ ] Final documentation commit CI must be GREEN before Phase 6 is considered implementation-complete.

## Evidence summary

- Spec: `docs/superpowers/specs/2026-08-26-public-portal-search-design.md`
- Migration: `public_portal_search` / `20260826000933`
- Latest feature CI: `32914736970` — GREEN
- Tests: 97 passed
- Preview: `dpl_AA87Cu8Gu3C4HPM9EWMr7uG5pv3d` — READY
- Preview branch alias: `handball-team-platform-git-phase-6-public-portal-s-s-lab1.vercel.app`
- Draft PR: #6
- DB fixture cleanup: zero remaining Phase 6 fixture rows
- Security Advisor: no new Phase 6 warning; only existing leaked-password-protection warning
