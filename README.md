# Handball Team Platform

「ハンドボールチームに必要なものを、ひとつに。」をコンセプトにした、ハンドボール専用チーム運営・試合管理プラットフォームです。

## Current status

Phase 1 foundation is implemented on `phase-1-foundation` and reviewed through GitHub Actions.

Implemented:

- Next.js App Router / React / TypeScript
- Tailwind CSS / shadcn-style source components
- Supabase browser/server SSR client foundation
- Email/password sign-up, sign-in, confirmation and sign-out flows
- Protected `/app` area using Supabase `auth.getClaims()`
- Public landing page and responsive authenticated app shell
- Safe public environment-variable handling
- Reproducible `package-lock.json`
- CI gates: unit tests, TypeScript, ESLint and production build

External integration still required before Phase 1 can be considered fully deployed:

- Create/link the dedicated Supabase project and install its publishable environment values.
- Configure the Supabase Auth confirmation URL/template and run the real sign-up/sign-in/sign-out flow.
- Import this GitHub repository into Vercel and verify a Preview deployment on desktop and mobile.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Required public environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Never place a Supabase service-role or secret key in a `NEXT_PUBLIC_*` variable or commit it to GitHub.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

GitHub Actions runs these checks for the Phase 1 branch and pull requests to `main`.

## Architecture principles

- Match Console is the highest-priority product surface.
- User accounts and team members are separate domain entities.
- Public information is opt-in, especially for minors.
- Supabase RLS is required for exposed internal data.
- GitHub is the single source of truth for source, migrations, tests and docs.
- Match state will use `MatchEvent + MatchState`, timer anchors, idempotent client action IDs and durable local buffering in the later Match Console phase.

See `docs/superpowers/specs/2026-08-25-handball-platform-foundation-design.md` and `docs/superpowers/plans/2026-08-25-phase-1-foundation.md` for the approved architecture and implementation plan.
