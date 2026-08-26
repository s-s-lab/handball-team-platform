# Phase 6 Public Portal + Team Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/` into the anonymous public portal for live matches, upcoming matches, recent results, and public team search while preserving the existing service introduction.

**Architecture:** Reuse Phase 5's sessionless publishable-key Supabase client and RLS boundary. Add two narrow `SECURITY INVOKER` RPCs for portal match summaries and team search, shape all RPC data before rendering, and keep the top page server-rendered with a GET search form so no new client-side search state is required.

**Tech Stack:** Next.js 16.3.x App Router, React 19.x, TypeScript 5.9.x, Tailwind CSS 4.x, shadcn/ui, Supabase PostgreSQL/RLS, Vitest, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-26-public-portal-search-design.md`

## Global Constraints

- `/` remains both product introduction and public sports portal.
- Public portal match visibility relies on existing RLS: both the team and match must be public.
- Team search returns only public teams and searches `teams.name` and `teams.short_name` only.
- No player/staff/member names are searchable in Phase 6.
- No service-role key in application code.
- Public reads use `createPublicClient()` with no persisted/session-detected auth.
- RPC output is treated as untrusted and shaped before rendering.
- Portal feed contains all live matches, the next 10 scheduled matches, and the latest 10 finished matches; cancelled matches are excluded.
- Team search is GET/submit based, not keystroke-by-keystroke.
- PWA, Storage, extra filters, fuzzy search, pagination, analytics and final visual redesign are out of scope.

---

### Task 1: Public portal domain types and shaping

**Files:**
- Create: `src/features/public-portal/types.ts`
- Create: `src/features/public-portal/data-shaping.ts`
- Create: `src/features/public-portal/data-shaping.test.ts`

**Interfaces:**
- Produces `PublicPortalMatch` and `PublicTeamSearchResult`.
- Produces `shapePublicPortalMatches(input: unknown): PublicPortalMatch[]`.
- Produces `shapePublicTeamSearchResults(input: unknown): PublicTeamSearchResult[]`.
- Produces `groupPublicPortalMatches(matches: PublicPortalMatch[]): { live: PublicPortalMatch[]; scheduled: PublicPortalMatch[]; finished: PublicPortalMatch[] }`.

- [ ] **Step 1: Create the RED tests before production files.**

```ts
import { describe, expect, it } from "vitest";
import {
  groupPublicPortalMatches,
  shapePublicPortalMatches,
  shapePublicTeamSearchResults,
} from "./data-shaping";

const validMatch = {
  match_id: "66000000-0000-4000-8000-000000000001",
  match_name: "League Match",
  team_id: "66000000-0000-4000-8000-000000000002",
  team_name: "Blue Handball",
  team_slug: "blue-handball",
  team_short_name: "BLUE",
  opponent_name: "Red Handball",
  team_side: "home",
  scheduled_at: "2026-08-26T10:00:00+00:00",
  venue: "Main Gym",
  status: "live",
  home_score: 7,
  away_score: 6,
};

describe("shapePublicPortalMatches", () => {
  it("maps valid safe portal rows and filters malformed rows", () => {
    const result = shapePublicPortalMatches([
      validMatch,
      { ...validMatch, match_id: "bad" },
      { ...validMatch, scheduled_at: "not-a-date" },
      { ...validMatch, status: "cancelled" },
      { ...validMatch, home_score: "seven" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      matchId: validMatch.match_id,
      teamSlug: "blue-handball",
      status: "live",
      homeScore: 7,
      awayScore: 6,
    });
  });
});

describe("shapePublicTeamSearchResults", () => {
  it("maps only valid team identity rows", () => {
    expect(
      shapePublicTeamSearchResults([
        {
          id: "66000000-0000-4000-8000-000000000003",
          name: "Blue Handball",
          slug: "blue-handball",
          short_name: "BLUE",
          description: "Tokyo handball team",
        },
        { id: "bad", name: "Broken", slug: "broken", short_name: null, description: null },
      ]),
    ).toEqual([
      {
        id: "66000000-0000-4000-8000-000000000003",
        name: "Blue Handball",
        slug: "blue-handball",
        shortName: "BLUE",
        description: "Tokyo handball team",
      },
    ]);
  });
});

describe("groupPublicPortalMatches", () => {
  it("keeps live, scheduled and finished matches separate", () => {
    const matches = shapePublicPortalMatches([
      validMatch,
      { ...validMatch, match_id: "66000000-0000-4000-8000-000000000004", status: "scheduled" },
      { ...validMatch, match_id: "66000000-0000-4000-8000-000000000005", status: "finished" },
    ]);

    const grouped = groupPublicPortalMatches(matches);
    expect(grouped.live.map((m) => m.status)).toEqual(["live"]);
    expect(grouped.scheduled.map((m) => m.status)).toEqual(["scheduled"]);
    expect(grouped.finished.map((m) => m.status)).toEqual(["finished"]);
  });
});
```

- [ ] **Step 2: Run the targeted test and require RED.**

Run:

```bash
npm test -- src/features/public-portal/data-shaping.test.ts
```

Expected: FAIL because `data-shaping.ts` does not exist.

- [ ] **Step 3: Add the domain types.**

```ts
export type PublicPortalMatchStatus = "live" | "scheduled" | "finished";
export type PublicPortalTeamSide = "home" | "away";

export type PublicPortalMatch = {
  matchId: string;
  matchName: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamShortName: string | null;
  opponentName: string;
  teamSide: PublicPortalTeamSide;
  scheduledAt: string;
  venue: string | null;
  status: PublicPortalMatchStatus;
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

- [ ] **Step 4: Implement narrow runtime guards and shapers.**

Use a UUID regex matching the existing public-live feature, require parseable dates, finite non-negative integer scores, valid `home|away`, and valid `live|scheduled|finished`. Treat the input as an array only; otherwise return `[]`.

```ts
export function groupPublicPortalMatches(matches: PublicPortalMatch[]) {
  return {
    live: matches.filter((match) => match.status === "live"),
    scheduled: matches.filter((match) => match.status === "scheduled"),
    finished: matches.filter((match) => match.status === "finished"),
  };
}
```

- [ ] **Step 5: Run targeted tests + typecheck + lint and require GREEN.**

```bash
npm test -- src/features/public-portal/data-shaping.test.ts
npm run typecheck
npm run lint
```

- [ ] **Step 6: Commit the Task 1 files.**

```bash
git add src/features/public-portal
 git commit -m "feat: add public portal data shaping"
```

---

### Task 2: Portal/search database RPC boundary

**Files:**
- Create: `supabase/migrations/20260826110000_public_portal_search.sql`

**Interfaces:**
- Produces `public.get_public_portal_matches()`.
- Produces `public.search_public_teams(text)`.
- Both functions are `SECURITY INVOKER`, fixed search path, execute granted to `anon` only.

- [ ] **Step 1: Commit the migration SQL before applying it.**

Use this exact safe return shape for the portal RPC:

```sql
create or replace function public.get_public_portal_matches()
returns table (
  match_id uuid,
  match_name text,
  team_id uuid,
  team_name text,
  team_slug text,
  team_short_name text,
  opponent_name text,
  team_side public.team_side,
  scheduled_at timestamptz,
  venue text,
  status public.match_status,
  home_score integer,
  away_score integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with live_matches as (
    select m.*, s.home_score, s.away_score
    from public.matches m
    join public.match_state s on s.match_id = m.id
    where m.status = 'live'
  ),
  scheduled_matches as (
    select m.*, s.home_score, s.away_score
    from public.matches m
    join public.match_state s on s.match_id = m.id
    where m.status = 'scheduled'
    order by m.scheduled_at asc
    limit 10
  ),
  finished_matches as (
    select m.*, s.home_score, s.away_score
    from public.matches m
    join public.match_state s on s.match_id = m.id
    where m.status = 'finished'
    order by m.scheduled_at desc
    limit 10
  ),
  portal_matches as (
    select * from live_matches
    union all
    select * from scheduled_matches
    union all
    select * from finished_matches
  )
  select
    pm.id,
    pm.name,
    t.id,
    t.name,
    t.slug,
    t.short_name,
    pm.opponent_name,
    pm.team_side,
    pm.scheduled_at,
    pm.venue,
    pm.status,
    pm.home_score,
    pm.away_score
  from portal_matches pm
  join public.teams t on t.id = pm.team_id
  order by
    case pm.status when 'live' then 0 when 'scheduled' then 1 else 2 end,
    case when pm.status = 'finished' then null else pm.scheduled_at end asc nulls last,
    case when pm.status = 'finished' then pm.scheduled_at end desc nulls last;
$$;
```

Because `matches` and `teams` are RLS-filtered for `anon`, hidden rows do not enter the invoker result. Verify this behavior explicitly after applying.

- [ ] **Step 2: Add the team-search invoker RPC.**

```sql
create or replace function public.search_public_teams(p_query text)
returns table (
  id uuid,
  name text,
  slug text,
  short_name text,
  description text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with input as (
    select lower(btrim(coalesce(p_query, ''))) as q
  )
  select t.id, t.name, t.slug, t.short_name, t.description
  from public.teams t
  cross join input
  where input.q <> ''
    and (
      lower(t.name) like '%' || input.q || '%'
      or lower(coalesce(t.short_name, '')) like '%' || input.q || '%'
    )
  order by
    case
      when lower(t.name) = input.q then 0
      when lower(coalesce(t.short_name, '')) = input.q then 1
      when lower(t.name) like input.q || '%' then 2
      when lower(coalesce(t.short_name, '')) like input.q || '%' then 3
      else 4
    end,
    t.name asc
  limit 20;
$$;
```

- [ ] **Step 3: Lock execute privileges to anon.**

```sql
revoke all on function public.get_public_portal_matches() from public;
revoke all on function public.get_public_portal_matches() from authenticated;
grant execute on function public.get_public_portal_matches() to anon;

revoke all on function public.search_public_teams(text) from public;
revoke all on function public.search_public_teams(text) from authenticated;
grant execute on function public.search_public_teams(text) to anon;
```

Do not add any new table grant for `team_members`, `match_events`, `match_rosters`, or `matches.memo`.

- [ ] **Step 4: Apply exactly the committed migration with Supabase migration tooling.**

Migration name: `public_portal_search`.

- [ ] **Step 5: Verify function security mode and privileges with SQL.**

Query `pg_proc`, `pg_namespace`, and `information_schema.routine_privileges` and require both functions to be invoker functions with only the intended public execution path.

- [ ] **Step 6: Run deterministic anonymous DB E2E.**

Create temporary fixture ids under prefix `f600...` with:

- one private team and one public match,
- one public team and one private match,
- one public team with one live match,
- 12 public scheduled matches with increasing timestamps,
- 12 public finished matches with increasing timestamps,
- one private team named `Phase 6 Hidden Club`,
- one public team whose short name is `P6SEA`.

Under `anon`, assert:

```sql
select count(*) = 0 from public.get_public_portal_matches()
where team_name = 'Phase 6 Private Team';
```

```sql
select count(*) = 0 from public.get_public_portal_matches()
where match_name = 'Phase 6 Private Match';
```

```sql
select count(*) = 10 from public.get_public_portal_matches()
where status = 'scheduled';
```

```sql
select count(*) = 10 from public.get_public_portal_matches()
where status = 'finished';
```

```sql
select count(*) = 1 from public.search_public_teams('P6SEA');
```

```sql
select count(*) = 0 from public.search_public_teams('Phase 6 Hidden Club');
```

Also verify returned portal/search column names are exactly the specified safe keys and anonymous access to `matches.memo` and `match_events` is still denied.

- [ ] **Step 7: Delete all fixture rows and verify zero `f600...` rows remain.**

- [ ] **Step 8: Run Supabase Security Advisor.**

Require no new Phase 6 warning. Record any existing unrelated warning without changing scope.

- [ ] **Step 9: Commit any additive corrective migration only if the verification found a Phase 6 issue.**

---

### Task 3: Server-only portal/search data access

**Files:**
- Create: `src/features/public-portal/data.ts`

**Interfaces:**
- Consumes Task 1 shaping helpers and `createPublicClient()`.
- Produces `getPublicPortalMatches(): Promise<PublicPortalMatch[]>`.
- Produces `searchPublicTeams(query: string): Promise<PublicTeamSearchResult[]>`.

- [ ] **Step 1: Implement the portal data function.**

```ts
import "server-only";

import { createPublicClient } from "@/lib/supabase/public-client";
import {
  shapePublicPortalMatches,
  shapePublicTeamSearchResults,
} from "./data-shaping";
import type { PublicPortalMatch, PublicTeamSearchResult } from "./types";

export async function getPublicPortalMatches(): Promise<PublicPortalMatch[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_portal_matches");
  if (error) return [];
  return shapePublicPortalMatches(data ?? []);
}
```

- [ ] **Step 2: Implement trimmed submit-only team search.**

```ts
export async function searchPublicTeams(query: string): Promise<PublicTeamSearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("search_public_teams", {
    p_query: normalized,
  });
  if (error) return [];
  return shapePublicTeamSearchResults(data ?? []);
}
```

- [ ] **Step 3: Run typecheck and lint.**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: Commit Task 3.**

```bash
git add src/features/public-portal/data.ts
 git commit -m "feat: add public portal data access"
```

---

### Task 4: Reusable public portal match sections

**Files:**
- Create: `src/components/public-portal/portal-match-sections.tsx`

**Interfaces:**
- Consumes `PublicPortalMatch[]`.
- Uses `groupPublicPortalMatches()`.
- Produces a server-renderable component with LIVE, upcoming, and recent-result sections.

- [ ] **Step 1: Implement formatting helpers at module scope.**

Use `Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })` for upcoming matches and a date-only formatter for finished matches.

- [ ] **Step 2: Implement a non-nested accessible row anatomy.**

Do not wrap the whole card in a link if the card also contains a team link. Use a semantic article with two separate links:

```tsx
<article className="border-b border-border/70 px-4 py-4 last:border-b-0 sm:px-5">
  <div className="flex items-start justify-between gap-4">
    <div className="min-w-0 flex-1">
      <Link href={`/teams/${match.teamSlug}`} className="font-bold hover:underline">
        {match.teamName}
      </Link>
      <p className="mt-1 text-sm text-muted-foreground">vs {match.opponentName}</p>
    </div>
    <Link href={`/live/${match.matchId}`} className="...">
      試合を見る
    </Link>
  </div>
</article>
```

- [ ] **Step 3: Render LIVE first.**

LIVE rows show:

- `LIVE` destructive-status label,
- team and opponent,
- team-perspective score,
- optional venue,
- separate `/live/[matchId]` action.

Empty state copy: `現在LIVE公開中の試合はありません。`

- [ ] **Step 4: Render upcoming second.**

Rows show date/time, team/opponent, HOME/AWAY and optional venue. Empty state: `現在公開されている今後の試合はありません。`

- [ ] **Step 5: Render recent results third.**

Rows show date and final team-perspective score. Empty state: `最近公開された試合結果はありません。`

- [ ] **Step 6: Run typecheck + lint.**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 7: Commit Task 4.**

```bash
git add src/components/public-portal/portal-match-sections.tsx
 git commit -m "feat: add public portal match sections"
```

---

### Task 5: Team search server form and results

**Files:**
- Create: `src/components/public-portal/team-search.tsx`

**Interfaces:**
- Consumes `{ query: string; results: PublicTeamSearchResult[]; submitted: boolean }`.
- Produces a GET form to `/` and result links to `/teams/[slug]`.

- [ ] **Step 1: Implement the GET form with explicit label.**

```tsx
<form action="/" method="get" className="flex flex-col gap-3 sm:flex-row">
  <label htmlFor="team-search" className="sr-only">チームを探す</label>
  <input
    id="team-search"
    name="team_q"
    defaultValue={query}
    placeholder="チーム名・略称で検索"
    className="h-11 flex-1 rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
  />
  <Button type="submit" className="h-11">検索</Button>
</form>
```

- [ ] **Step 2: Implement submitted-empty and result states.**

When `submitted && results.length === 0`, render exactly:

`該当する公開チームは見つかりませんでした。`

When results exist, render a vertical list. Each result shows team name, optional short name, and optional description; the whole result can be one `/teams/[slug]` link because it contains no nested actions.

- [ ] **Step 3: Run typecheck + lint.**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: Commit Task 5.**

```bash
git add src/components/public-portal/team-search.tsx
 git commit -m "feat: add public team search"
```

---

### Task 6: Integrate the public portal into `/`

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Page receives `searchParams: Promise<{ team_q?: string | string[] }>`.
- Uses Task 3 data functions in parallel.
- Uses Task 4 and Task 5 components.

- [ ] **Step 1: Convert the page to an async Server Component.**

```ts
type HomePageProps = {
  searchParams: Promise<{ team_q?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.team_q) ? params.team_q[0] ?? "" : params.team_q ?? "";
  const query = rawQuery.trim().slice(0, 100);

  const matchesPromise = getPublicPortalMatches();
  const teamsPromise = query ? searchPublicTeams(query) : Promise.resolve([]);
  const [matches, teams] = await Promise.all([matchesPromise, teamsPromise]);
  // ...
}
```

Do not call `Date.now()` in JSX render.

- [ ] **Step 2: Keep the existing header and compact the current hero.**

Preserve:

- `ハンドボールチームに必要なものを、ひとつに。`
- existing explanatory paragraph,
- `チーム運営を始める` signup CTA,
- login action.

Reduce hero vertical padding from the current `py-20 / md:py-28` to approximately `py-12 / md:py-16` and remove the large static MATCH CONSOLE preview from the first viewport. The real public match portal becomes the product signal instead of fake static match data.

- [ ] **Step 3: Insert the public match portal immediately below the hero.**

Use a max-width consistent with existing pages. Section title: `公開試合`. Supporting copy: `LIVEスコア、今後の試合、最近の結果をログインなしで確認できます。`

Render `<PortalMatchSections matches={matches} />`.

- [ ] **Step 4: Insert team search after match sections.**

Section title: `チームを探す`. Supporting copy: `公開されているチームを、チーム名・略称から検索できます。`

Render:

```tsx
<TeamSearch query={query} results={teams} submitted={Boolean(query)} />
```

- [ ] **Step 5: Keep the existing three product principles below the portal/search content.**

Do not add fake metrics, fake teams, fake standings, hero badges, extra filters, or marketing claims.

- [ ] **Step 6: Run full local-equivalent quality gates in CI-triggering commit.**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 7: Commit Task 6.**

```bash
git add src/app/page.tsx
 git commit -m "feat: turn home into public portal"
```

---

### Task 7: Runtime verification and stacked Draft PR

**Files:**
- Modify: `docs/superpowers/plans/2026-08-26-phase-6-public-portal-search.md`

- [ ] **Step 1: Require full GitHub CI GREEN on the latest feature commit.**

Verify Unit tests, TypeScript, ESLint and Production build all pass.

- [ ] **Step 2: Require latest Vercel Preview READY.**

Record the deployment id/url and latest feature commit SHA.

- [ ] **Step 3: Create deterministic temporary public and private fixtures.**

Create a public team `Phase 6 Public Handball` with short name `P6SEA`, one live public match with score `8-7`, one scheduled public match, one finished public match, and a private team `Phase 6 Hidden Club`.

- [ ] **Step 4: Fetch the latest Preview `/`.**

Require HTTP 200 and HTML containing:

- `Phase 6 Public Handball`
- public live opponent label
- score `8` and `7`
- `/live/<fixture-match-id>`
- `/teams/<fixture-team-slug>`

Require the hidden team label is absent.

- [ ] **Step 5: Fetch `/?team_q=P6SEA`.**

Require HTTP 200 and the public team result. Fetch `/?team_q=Phase%206%20Hidden%20Club` and require the hidden team is absent.

- [ ] **Step 6: Verify anonymous private-field protections remain intact.**

Recheck permission denial for `matches.memo` and `match_events` rather than relying only on previous Phase 5 evidence.

- [ ] **Step 7: Delete all fixture rows and verify zero Phase 6 fixture rows remain.**

- [ ] **Step 8: Run Supabase Security Advisor after final data/runtime verification.**

Require no new Phase 6 security warning.

- [ ] **Step 9: Create Draft PR targeting `phase-5-public-live`.**

Title: `Phase 6: public portal and team search`.

PR body must record:

- the two invoker RPCs,
- anonymous RLS/security checks,
- unit-test count and full CI result,
- Vercel Preview runtime checks for `/` and `/?team_q=...`,
- fixture cleanup confirmation,
- scope exclusions.

- [ ] **Step 10: Update this plan with the final PR number, CI run id, Vercel deployment id, migration name and DB verification evidence, then commit the plan.**

- [ ] **Step 11: Require CI GREEN again on the final documentation commit.**
