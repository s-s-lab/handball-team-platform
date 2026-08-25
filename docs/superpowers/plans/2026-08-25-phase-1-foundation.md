# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

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

- [x] Add package/config files for Next.js App Router, Tailwind 4, shadcn/ui, Supabase, Vitest and ESLint.
- [x] Add CI that installs dependencies and runs all four quality gates with safe dummy public Supabase values for build-time evaluation.
- [x] Commit configuration and executable specifications before the production helpers.

### Task 2: Test-first foundation helpers

- [x] Write tests for missing/valid Supabase public configuration.
- [x] Write tests for normalized email, password minimum length, and invalid form values.
- [x] Write tests proving `/app` is protected while portal/team/live routes remain public, plus safe internal redirect behavior.
- [ ] Observe the initial RED CI run before implementing helpers. The tests were committed first, but the new workflow did not execute until a workflow definition existed on the default branch; therefore a missing-module RED run was not captured in CI history.

### Task 3: Implement helpers and Supabase SSR integration

- [x] Implement the behavior required by the foundation tests.
- [x] Use current Supabase SSR cookie APIs and `getClaims()` in proxy protection.
- [x] Run the unit tests to GREEN (11 passing tests).
- [x] Review redirect/session handling and preserve Supabase cookie security attributes.

### Task 4: Authentication experience and application shell

- [x] Build semantic, responsive public and authenticated shells using reusable shadcn-style primitives.
- [x] Connect server actions to Supabase password authentication APIs.
- [x] Add confirmation and sign-out routes.
- [x] Keep visible product scope to Phase 1; no fake match/team data.
- [x] Validate redirect inputs at the Server Action boundary.

### Task 5: Quality gates and external integration

- [x] Run GitHub Actions and resolve code/configuration failures.
- [x] Confirm unit tests, TypeScript, ESLint and production build pass.
- [x] Generate and commit the CI-resolved `package-lock.json`.
- [x] Return CI to read-only permissions with npm cache + `npm ci`.
- [x] Create draft pull request #1 to `main`.
- [x] Create the dedicated Supabase project in `ap-northeast-1` and configure Vercel public Supabase environment values for Preview and Production.
- [x] Configure Supabase Auth Site URL, redirect allow-list, custom SMTP (Resend), and Confirm sign up template for SSR token-hash confirmation.
- [x] Link the GitHub repository to Vercel and verify a successful Next.js Preview deployment.
- [ ] Verify sign-up/email confirmation/sign-in/sign-out end to end against the deployed Supabase project.
- [ ] Verify public/auth screens at desktop and mobile widths on the Preview deployment.

## Current handoff

The external services are provisioned and connected. A new Preview deployment should be used after environment-variable and Auth configuration changes. Phase 1 remains draft until the live authentication flow and responsive Preview UI are verified.
