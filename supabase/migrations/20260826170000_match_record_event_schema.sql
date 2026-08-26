alter type public.match_event_type add value if not exists 'seven_meter_missed';
alter type public.match_event_type add value if not exists 'warning';
alter type public.match_event_type add value if not exists 'suspension';
alter type public.match_event_type add value if not exists 'disqualification';
alter type public.match_event_type add value if not exists 'team_timeout';
alter type public.match_event_type add value if not exists 'event_reverted';

alter table public.match_state
  add column if not exists competition_elapsed_ms bigint not null default 0
  check (competition_elapsed_ms >= 0);

alter table public.match_events
  add column if not exists period smallint check (period is null or period >= 1),
  add column if not exists period_elapsed_ms bigint check (period_elapsed_ms is null or period_elapsed_ms >= 0),
  add column if not exists competition_elapsed_ms bigint check (competition_elapsed_ms is null or competition_elapsed_ms >= 0),
  add column if not exists subject_side public.team_side,
  add column if not exists subject_team_member_id uuid references public.team_members(id) on delete set null,
  add column if not exists subject_match_roster_id uuid references public.match_rosters(id) on delete set null;

create index if not exists match_events_match_competition_time_idx
  on public.match_events(match_id, competition_elapsed_ms, state_version);

create index if not exists match_events_match_subject_roster_idx
  on public.match_events(match_id, subject_match_roster_id, event_type, state_version);

create index if not exists match_events_match_subject_member_idx
  on public.match_events(match_id, subject_team_member_id, event_type, state_version);
