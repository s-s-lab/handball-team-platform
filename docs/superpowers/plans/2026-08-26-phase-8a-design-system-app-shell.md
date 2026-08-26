# Phase 8A Design System and App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic authenticated admin shell with a modern, responsive handball team workspace shell and refreshed design system while preserving all Phase 7 match-console, offline, PWA, authentication, and public-LIVE behavior.

**Architecture:** Introduce a team-scoped workspace shell around existing authenticated routes, keep match console routes functionally isolated, and centralize visual tokens/navigation primitives in focused components. The shell must adapt to desktop sidebar, tablet rail/drawer, and mobile bottom navigation without changing existing Supabase authorization semantics.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, lucide-react, shadcn-style UI primitives, Supabase Auth, Vitest/React Testing Library, Playwright browser QA.

**Spec:** `docs/superpowers/specs/2026-08-26-phase-8-team-workspace-design.md`

## Global Constraints

- Preserve Phase 7 match console, offline recording, PWA behavior, public LIVE, and privacy model.
- Desktop navigation uses a persistent left sidebar.
- Tablet navigation uses a compact rail that can expand into a drawer.
- Mobile navigation uses a sticky bottom bar for Home / Schedule / Matches / Members / More.
- Players primarily browse; management actions remain gated by existing membership/role checks.
- Match console remains a specialized operational surface and must not be forced into the standard workspace-card layout.
- No new public data exposure is introduced in Phase 8A.
- Keep desktop, iPad/tablet, and mobile as first-class targets.

---

## File Map

**Create**
- `src/components/team-workspace/team-workspace-shell.tsx`
- `src/components/team-workspace/team-sidebar.tsx`
- `src/components/team-workspace/mobile-team-nav.tsx`
- `src/components/team-workspace/team-rail.tsx`
- `src/components/team-workspace/workspace-nav.ts`
- `src/components/team-workspace/team-workspace-shell.test.tsx`

**Modify**
- `src/app/globals.css`
- `src/app/app/layout.tsx`
- `src/app/app/page.tsx`
- `src/components/site/brand.tsx`
- `src/app/page.tsx`
- `src/app/page.test.tsx`
- current browser-QA Playwright spec.

## Interfaces

```ts
export type WorkspaceNavItem = {
  label: "ホーム" | "スケジュール" | "試合" | "メンバー" | "成績" | "設定";
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  mobilePrimary: boolean;
};

export function getWorkspaceNav(teamId: string): WorkspaceNavItem[];
export function isWorkspaceNavActive(pathname: string, href: string): boolean;
```

### Task 1: Navigation model and active-route behavior

- [ ] Write failing tests asserting team-scoped hrefs and exact-only activation for team home.
- [ ] Run `npm test -- src/components/team-workspace/team-workspace-shell.test.tsx` and confirm RED.
- [ ] Implement `workspace-nav.ts` with Home / Schedule / Matches / Members / Stats / Settings and lucide icons.
- [ ] Re-run the focused test and confirm GREEN.
- [ ] Commit `test: specify team workspace navigation`.

### Task 2: Athletic design tokens and global interaction defaults

- [ ] Add a failing assertion that `globals.css` exposes `--workspace-ink`, `--workspace-accent`, `--workspace-surface`, `--workspace-surface-strong`, `--workspace-success`, and `--workspace-live`.
- [ ] Run the focused test and confirm RED.
- [ ] Refresh `globals.css` with deep ink/navy navigation, bright athletic accent, warm neutral surfaces, dedicated live/success tokens, strong focus ring, Japanese-legible typography, and reduced-motion handling. Keep existing Tailwind semantic aliases intact.
- [ ] Re-run the focused test and confirm GREEN.
- [ ] Commit `style: establish handball workspace design tokens`.

### Task 3: Desktop sidebar

- [ ] Write failing component tests for team identity, six navigation labels, active `aria-current`, and logout/public links in the secondary footer.
- [ ] Run focused tests and confirm RED.
- [ ] Implement `TeamSidebar` as a dark `w-72` desktop-only surface with brand, team identity, icon navigation, active accent state, and secondary footer actions.
- [ ] Re-run tests and confirm GREEN.
- [ ] Commit `feat: add desktop team workspace sidebar`.

### Task 4: Tablet rail and mobile navigation

- [ ] Write failing tests asserting tablet icon labels, mobile Home/Schedule/Matches/Members plus `その他`, and Stats/Settings reachability through overflow.
- [ ] Run focused tests and confirm RED.
- [ ] Implement `TeamRail` for `md:flex lg:hidden` and an accessible expansion panel using existing primitives or an accessible no-dependency fallback.
- [ ] Implement `MobileTeamNav` with safe-area padding and fixed bottom navigation.
- [ ] Re-run tests and confirm GREEN.
- [ ] Commit `feat: add responsive team workspace navigation`.

### Task 5: Server workspace shell and team context resolution

- [ ] Write failing shell tests for users with and without a team.
- [ ] Run focused tests and confirm RED.
- [ ] Implement `TeamWorkspaceShell`; preserve the existing `supabase.auth.getClaims()` redirect in `src/app/app/layout.tsx`, resolve a preferred/first team via existing team-core data patterns, and render responsive navigation only when a team exists.
- [ ] Ensure main content reserves mobile bottom-nav space and desktop/sidebar width.
- [ ] Re-run tests and confirm GREEN.
- [ ] Commit `feat: integrate responsive team workspace shell`.

### Task 6: Refresh authenticated home and team chooser

- [ ] Write failing presentation tests for a team-workspace onboarding hierarchy and preserved organization-first empty state.
- [ ] Run focused tests and confirm RED.
- [ ] Refresh `/app` with stronger title hierarchy, large selectable team tiles, visually secondary organizations, and fewer nested generic cards without changing data semantics.
- [ ] Re-run tests and confirm GREEN.
- [ ] Commit `style: refresh authenticated team chooser`.

### Task 7: Public-facing token alignment

- [ ] Add failing structural assertions that public headline, public matches, team search, and auth links remain while the refreshed brand treatment is applied.
- [ ] Run focused tests and confirm RED.
- [ ] Refresh presentation only in `src/app/page.tsx` and `src/components/site/brand.tsx`; do not change public data queries.
- [ ] Re-run tests and confirm GREEN.
- [ ] Commit `style: align public portal with workspace identity`.

### Task 8: Browser regression QA

- [ ] Add browser assertions: desktop sidebar visible, tablet rail visible, mobile bottom nav visible, content unobscured.
- [ ] Assert match-console score/time controls, sync state, and offline queue remain usable.
- [ ] Run the repository browser-QA command and fix only shell/token regressions.
- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and browser QA; all must PASS.
- [ ] Commit `test: verify responsive workspace shell`.

## Phase 8A Completion Gate

Phase 8A is complete only when the authenticated workspace visibly reads as a modern sports-team product, desktop/tablet/mobile navigation all pass browser QA, onboarding stays functional, the public landing remains functional, and Phase 7 offline/reconnect/public-LIVE regression checks remain green.
