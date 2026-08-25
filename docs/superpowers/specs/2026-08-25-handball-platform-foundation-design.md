# Handball Team Platform Foundation Design

## Product goal

Build a production-oriented MVP foundation for a handball-specific team operations and match management platform. The highest-quality bar is the future Match Console: tablet landscape usability, resilient timer/score state, auditable events, and safe synchronization.

## Approved architecture

- Frontend: Next.js App Router + React + TypeScript.
- UI: Tailwind CSS + shadcn/ui source components, with a restrained modern sports visual system.
- Backend: Supabase PostgreSQL, Auth, Realtime, Storage.
- Hosting: Vercel with GitHub as the source of truth.
- PWA: prepared structurally in the MVP, finalized in the quality phase.
- No Cloudflare in MVP.

## Core domain decisions

1. `auth.users` represents service accounts; `team_members` represents roster/staff records. They are separate and optionally linked.
2. Organizations own multiple teams; a user may belong to multiple teams with different roles.
3. Match state uses a hybrid model: `match_events` stores auditable operations, while `match_state` stores the fast current projection.
4. Timer persistence uses an anchor timestamp + remaining duration, never one database write per second.
5. Match Console writes first to durable local storage, then synchronizes to Supabase with idempotent client action IDs.
6. Public member information is opt-in. Minor-related identifying information is private by default.
7. RLS must authorize organization/team membership, not merely authentication.

## Phase 1 scope

Phase 1 establishes only the platform foundation:

- Next.js / TypeScript / Tailwind / shadcn/ui baseline.
- Supabase browser/server clients using the current SSR cookie pattern.
- Email/password sign-up, sign-in, confirmation, sign-out.
- Session refresh through Next.js `proxy.ts` and protected `/app` routing.
- Public landing shell and authenticated application shell.
- Environment variable safety (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- GitHub Actions gates for tests, typecheck, lint and build.
- Vercel-ready repository structure.

Organization, Team, TeamMember, Match and Match Console domain tables are deliberately deferred to their specified phases.

## Security decisions

- Never expose service-role or secret keys to the browser.
- Use Supabase publishable key for public/browser clients.
- Use `auth.getClaims()` to validate identity in server-side protection paths.
- Do not trust `user_metadata` for authorization.
- Authenticated routes must not be statically cached as user-specific shared output.
- Future public data will use tightly scoped RLS/security-invoker read interfaces rather than broad anonymous access to internal tables.

## UI direction

The Phase 1 shell uses a high-contrast neutral foundation with a deep ink primary and energetic handball accent. Typography, controls and spacing prioritize quick scanning, large tap targets and future tablet-landscape reuse. This phase avoids speculative portal features and keeps visual components reusable for the Match Console.

## Verification strategy

- Unit tests for environment parsing, auth credential validation, and route classification.
- GitHub Actions runs dependency install, unit tests, TypeScript, ESLint and production build.
- Preview deployment is connected after the Vercel project is linked to the repository.
- Auth end-to-end verification is completed once the new Supabase project is created and environment variables are installed.
