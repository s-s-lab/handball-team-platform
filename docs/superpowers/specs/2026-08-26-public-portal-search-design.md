# Phase 6 Public Portal + Team Search Design

## Goal

Turn `/` into the public entry point for Handball Team Platform while preserving the existing service introduction. Anonymous visitors should be able to see currently live public matches, upcoming public matches, recent public results, and search public teams without signing in.

## Product Direction

The top page remains both a product introduction and a sports portal. The public information comes first because it is immediately useful to players, parents, supporters, and opponents; the existing product explanation remains below it for team administrators evaluating the service.

The page order is:

1. Header / brand / login and signup actions.
2. Compact existing hero message: `ハンドボールチームに必要なものを、ひとつに。`
3. LIVE matches.
4. Upcoming matches.
5. Recent results.
6. Team search.
7. Existing product principles / service introduction.

This phase extends the existing ink + teal design system and existing card/list vocabulary. It does not start the final visual redesign, add hero imagery, or introduce a second portal route.

## Public Data Boundary

Phase 6 reuses the Phase 5 public RLS boundary. Anonymous data access continues to use the sessionless publishable-key Supabase client. No service-role key is used by application code.

A match may appear in the portal only when both the parent team and match are public under existing RLS. A team may appear in search only when the team is public under existing RLS.

Two new `SECURITY INVOKER` RPCs are added:

### `get_public_portal_matches()`

Returns only fields already approved for public match display plus safe team identity fields:

- `match_id`
- `match_name`
- `team_id`
- `team_name`
- `team_slug`
- `team_short_name`
- `opponent_name`
- `team_side`
- `scheduled_at`
- `venue`
- `status`
- `home_score`
- `away_score`

It returns:

- all currently `live` public matches,
- the next 10 `scheduled` public matches ordered ascending by `scheduled_at`,
- the latest 10 `finished` public matches ordered descending by `scheduled_at`.

Cancelled matches are not included in the portal feed in this phase.

The RPC does not expose match memo, roster data, member/user ids, scorer ids, event payloads, visibility flags, or mutation functions.

### `search_public_teams(p_query text)`

Searches only public team identity fields:

- `teams.name`
- `teams.short_name`

The normalized query is trimmed. Empty queries return zero rows. Results are limited to 20 and ordered with exact/prefix name matches before broader case-insensitive substring matches.

Returned fields are:

- `id`
- `name`
- `slug`
- `short_name`
- `description`

Player/staff names are never searched and are never included in the search RPC.

## Application Types and Data Flow

Create a focused `public-portal` feature area.

```ts
export type PublicPortalMatch = {
  matchId: string;
  matchName: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamShortName: string | null;
  opponentName: string;
  teamSide: "home" | "away";
  scheduledAt: string;
  venue: string | null;
  status: "live" | "scheduled" | "finished";
  homeScore: number;
  awayScore: number;
};

export type PublicTeamSearchResult = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  description: string | null;
};
```

Server-only functions:

```ts
getPublicPortalMatches(): Promise<PublicPortalMatch[]>
searchPublicTeams(query: string): Promise<PublicTeamSearchResult[]>
```

Both use `createPublicClient()` so logged-in and logged-out visitors use the same anonymous public path.

RPC payloads are treated as untrusted. Dedicated shaping functions validate UUIDs, dates, status/side enums, score numbers, and nullable strings. Invalid rows are filtered rather than rendered.

## Top Page Behavior

`src/app/page.tsx` becomes an async Server Component.

It reads optional `searchParams.team_q`. The portal match request and team search request are started together and resolved with `Promise.all`. When no non-empty search query is present, team search resolves locally to an empty array and no search RPC request is made.

The page does not use `Date.now()` during JSX render. Ordering is authoritative from the portal RPC.

### LIVE section

- Appears before other match sections.
- Each row shows team name, opponent, current score, venue when present, and a visible `LIVE` state.
- Whole row links to `/live/[matchId]`.
- Team name also provides a clear path to `/teams/[teamSlug]` without nesting interactive links; the row is structured so live-view and team-page actions remain separate accessible links.
- Empty state: `現在LIVE公開中の試合はありません。`

### Upcoming section

- Shows up to 10 matches.
- Shows Japanese date/time, team vs opponent, venue, HOME/AWAY context.
- Links to `/live/[matchId]`; scheduled public matches already have a public live route and show pre-match state.
- Empty state: `現在公開されている今後の試合はありません。`

### Recent results section

- Shows up to 10 finished matches.
- Shows final score from the team perspective and match date.
- Links to `/live/[matchId]`, where the finished state is read-only.
- Empty state: `最近公開された試合結果はありません。`

## Team Search Behavior

The search uses a normal GET form targeting `/`:

```html
<form action="/" method="get">
  <input name="team_q" />
</form>
```

This intentionally avoids a keystroke-by-keystroke database query and works without client JavaScript.

- Input label: `チームを探す`
- Placeholder: `チーム名・略称で検索`
- Submit: `検索`
- Whitespace-only input behaves as no search.
- When a non-empty query returns zero results, show `該当する公開チームは見つかりませんでした。`
- Each result links to `/teams/[slug]` and shows name, optional short name, and a short description when present.
- Search query is preserved in the input after submit.

## Existing Hero and Service Introduction

The existing top-page brand/header and main headline remain. The hero should be reduced enough that public match content is visible without excessive scrolling on a typical laptop, but its message and team-admin signup action remain intact.

The existing three product principles stay below the public portal sections. No new marketing claims or fake match/team data are added.

## Security Requirements

- `get_public_portal_matches()` and `search_public_teams(text)` are `SECURITY INVOKER` with fixed `search_path = public, pg_temp`.
- Revoke execute from `public` and `authenticated`; grant execute only to `anon`, matching the Phase 5 public RPC pattern.
- Existing table RLS remains the visibility boundary.
- No direct anonymous grant is added for private fields.
- Search does not inspect `team_members`.
- Portal match RPC does not inspect `match_events` or `match_rosters`.
- Anonymous direct reads of private match columns remain denied.

## Error Handling

Public portal reads are fail-soft. If an RPC returns an error or malformed rows, the feature data function returns an empty list for that area rather than crashing the entire landing page.

A failed search therefore renders the same neutral no-results surface; server/runtime errors should still be visible in platform logs rather than exposed to visitors.

## Testing

### Unit tests

- Valid portal match rows are shaped correctly.
- Invalid UUID/date/status/score rows are filtered.
- Valid search rows are shaped correctly.
- Invalid search rows are filtered.
- Portal grouping returns `live`, `scheduled`, and `finished` groups without mixing statuses.

### Database E2E

Use deterministic temporary fixture ids and clean them afterward.

Prove under `anon`:

1. Private team + public match does not appear in portal.
2. Public team + private match does not appear in portal.
3. Public team + public live/scheduled/finished matches appear with only safe keys.
4. More than 10 scheduled matches returns only the next 10.
5. More than 10 finished matches returns only the latest 10.
6. Public-team search matches `name` and `short_name`.
7. Private teams never appear in search.
8. Search output contains no member/user fields.
9. Anonymous match memo and `match_events` access remains denied.
10. Fixture rows return to zero after cleanup.

### CI and Preview

Require full GitHub CI GREEN: unit tests, TypeScript, ESLint, production build.

Create a temporary public fixture and verify the latest Vercel Preview:

- `/` returns HTTP 200.
- HTML contains fixture LIVE match/team labels and score.
- `/?team_q=<fixture>` returns HTTP 200 and contains the matching public team.
- A hidden fixture name does not appear.
- `/live/[matchId]` and `/teams/[slug]` links are present.

Responsive QA should check desktop and mobile widths for horizontal overflow, score readability, form usability, and tap targets.

## Scope Exclusions

Not included in Phase 6:

- PWA/offline support.
- Storage/team logos/member photos.
- Live Realtime behavior changes; Phase 5 remains responsible for live viewer updates.
- Player/member search.
- Filters by prefecture, category, age, sex, competition, or date.
- Full-text or fuzzy-search extensions.
- Pagination/infinite scroll.
- Final visual redesign.
- Analytics, rankings, standings, brackets, or statistics.
