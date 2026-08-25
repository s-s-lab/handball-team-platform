# Handball Team Platform

「ハンドボールチームに必要なものを、ひとつに。」をコンセプトにした、ハンドボール専用チーム運営・試合管理プラットフォームです。

## Status

Phase 1: foundation (Next.js / TypeScript / Tailwind CSS / shadcn/ui / Supabase Auth / CI / Vercel-ready)

## Principles

- Match Console is the highest-priority product surface.
- User accounts and team members are separate domain entities.
- Public information is opt-in, especially for minors.
- Supabase RLS is required for exposed internal data.
- GitHub is the single source of truth for source, migrations, tests, and docs.

See `docs/superpowers/specs/2026-08-25-handball-platform-foundation-design.md` and `docs/superpowers/plans/2026-08-25-phase-1-foundation.md` for the approved architecture and implementation plan.
