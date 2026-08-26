create index if not exists team_events_created_by_idx
  on public.team_events(created_by)
  where created_by is not null;
