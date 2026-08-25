# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a tested, secure Next.js/Supabase foundation with authentication, application shell, CI gates, and Vercel-ready configuration.

**Architecture:** Next.js App Router serves public and authenticated shells. Supabase SSR clients are request-scoped on the server and browser-scoped in Client Components; `proxy.ts` refreshes sessions and gates `/app`. Pure helpers isolate validation and route decisions so security-critical behavior is unit-testable.

**Tech Stack:** Next.js 16.x, React 19.x, TypeScript, Tailwind CSS 4.x, shadcn/ui source components, Supabase SSR/JS, Vitest, ESLint, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-25-handball-platform-foundation-design.md`

## Global Constraints

- GitHub is the single source of truth.
- Do not commit `.env.local`, Supabase secret/service-role keys, or Vercel tokens.
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, not a service role key, in frontend-accessible configuration.
- Protect server-side identity with `auth.getClaims()`.
- Keep Phase 1 limited to foundation/auth; do not implement Organization/Team/Match domain behavior yet.
- Run test, typecheck, lint, and build before merging.

---

### Task 1: Repository and CI baseline

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `.gitignore`, `.env.example`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces npm scripts `test`, `typecheck`, `lint`, and `build` used by every later task and CI.

- [ ] Add package/config files for Next.js App Router, Tailwind 4, shadcn/ui, Supabase, Vitest and ESLint.
- [ ] Add CI that installs dependencies and runs all four quality gates with safe dummy public Supabase values for build-time evaluation.
- [ ] Commit configuration with tests before production behavior.

### Task 2: Test-first foundation helpers

**Files:**
- Create: `src/lib/env.test.ts`
- Create: `src/features/auth/credentials.test.ts`
- Create: `src/lib/auth/routes.test.ts`

**Interfaces:**
- Consumes future `getPublicEnv`, `parseCredentials`, `isProtectedPath`, `isAuthPath`, `safeNextPath`.
- Produces executable specifications for environment safety, credential validation, and redirect/path behavior.

- [ ] Write tests for missing/valid Supabase public configuration.
- [ ] Write tests for normalized email, password minimum length, and invalid form values.
- [ ] Write tests proving `/app` is protected while portal/team/live routes remain public, plus safe internal redirect behavior.
- [ ] Push and verify CI fails because the production helpers do not yet exist.

### Task 3: Implement helpers and Supabase SSR integration

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/features/auth/credentials.ts`
- Create: `src/lib/auth/routes.ts`
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`
- Create: `proxy.ts`

**Interfaces:**
- `getPublicEnv(env?): { supabaseUrl: string; supabasePublishableKey: string }`
- `parseCredentials(formData): { ok: true; value: { email: string; password: string } } | { ok: false; message: string }`
- `isProtectedPath(pathname): boolean`
- `isAuthPath(pathname): boolean`
- `safeNextPath(value, fallback?): string`

- [ ] Implement only the behavior required by the failing tests.
- [ ] Use current Supabase SSR cookie APIs and `getClaims()` in proxy protection.
- [ ] Run tests until green.

### Task 4: Authentication experience and application shell

**Files:**
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/app/login/page.tsx`, `src/app/signup/page.tsx`
- Create: `src/app/auth/actions.ts`, `src/app/auth/confirm/route.ts`, `src/app/auth/signout/route.ts`, `src/app/auth/check-email/page.tsx`, `src/app/auth/error/page.tsx`
- Create: `src/app/app/layout.tsx`, `src/app/app/page.tsx`
- Create: `src/components/ui/*`, `src/components/site/*`, `src/lib/utils.ts`

**Interfaces:**
- Login/sign-up forms submit to server actions.
- Successful sign-in redirects to `/app`; sign-up routes to email confirmation state.
- Authenticated shell can be reused by Phase 2 team-switching navigation.

- [ ] Build semantic, responsive public and authenticated shells using reusable shadcn-style primitives.
- [ ] Connect server actions to Supabase password authentication.
- [ ] Add confirmation and sign-out routes.
- [ ] Keep visible product scope to Phase 1; no fake match/team data.

### Task 5: Quality gates and integration handoff

**Files:**
- Modify only files required to correct test/type/lint/build failures.
- Generate and commit `package-lock.json` from the CI-resolved dependency graph.

**Interfaces:**
- Produces a mergeable `phase-1-foundation` branch and PR.

- [ ] Run GitHub Actions and resolve all failures.
- [ ] Confirm unit tests, TypeScript, ESLint and production build pass.
- [ ] Create a pull request to `main`.
- [ ] After Supabase project creation, configure real public env values and verify sign-up/sign-in/sign-out.
- [ ] After Vercel project linkage, verify Preview deployment on the PR at desktop and mobile widths.
