-- Phase 7 performance hardening identified by Supabase Performance Advisor.
-- Keep behavior unchanged while avoiding per-row auth.uid() evaluation and
-- adding covering indexes for foreign keys introduced/used by match records.

create index if not exists match_events_actor_user_id_idx
  on public.match_events (actor_user_id)
  where actor_user_id is not null;

create index if not exists match_events_subject_match_roster_id_idx
  on public.match_events (subject_match_roster_id)
  where subject_match_roster_id is not null;

create index if not exists match_events_subject_team_member_id_idx
  on public.match_events (subject_team_member_id)
  where subject_team_member_id is not null;

create index if not exists match_rosters_team_member_id_idx
  on public.match_rosters (team_member_id)
  where team_member_id is not null;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
