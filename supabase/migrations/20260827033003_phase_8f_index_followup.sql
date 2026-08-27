create index if not exists matches_season_id_idx
  on public.matches (season_id)
  where season_id is not null;

create index if not exists season_player_stats_updated_by_idx
  on public.season_player_stats (updated_by)
  where updated_by is not null;
