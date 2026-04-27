CREATE TABLE IF NOT EXISTS competition_window (
  id INTEGER PRIMARY KEY,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('hydra', 'chimera', 'clan_wars', 'siege')),
  season_year INTEGER NOT NULL CHECK (season_year >= 2024),
  week_of_year INTEGER NOT NULL CHECK (week_of_year BETWEEN 1 AND 53),
  cadence_slot TEXT NOT NULL CHECK (cadence_slot IN ('weekly', 'biweekly')),
  rotation_number INTEGER,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (activity_type IN ('hydra', 'chimera') AND cadence_slot = 'weekly' AND rotation_number IS NOT NULL) OR
    (activity_type IN ('clan_wars', 'siege') AND cadence_slot = 'biweekly' AND rotation_number IS NULL)
  ),
  CHECK (activity_type != 'hydra' OR rotation_number BETWEEN 1 AND 4),
  CHECK (activity_type != 'chimera' OR rotation_number BETWEEN 1 AND 3),
  UNIQUE (activity_type, season_year, week_of_year, cadence_slot)
);

CREATE TABLE IF NOT EXISTS player_profile (
  id INTEGER PRIMARY KEY,
  main_nickname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
  joined_at TEXT,
  left_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (left_at IS NULL OR joined_at IS NULL OR left_at >= joined_at)
);

CREATE TABLE IF NOT EXISTS player_alias (
  id INTEGER PRIMARY KEY,
  player_profile_id INTEGER NOT NULL REFERENCES player_profile(id),
  alias_type TEXT NOT NULL CHECK (alias_type IN ('game_nickname', 'telegram_handle')),
  alias_value TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  first_seen_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (last_seen_at IS NULL OR first_seen_at IS NULL OR last_seen_at >= first_seen_at),
  UNIQUE (alias_type, alias_value)
);

CREATE INDEX IF NOT EXISTS idx_player_alias_player_profile_id
  ON player_alias (player_profile_id);

CREATE TABLE IF NOT EXISTS report_import (
  id INTEGER PRIMARY KEY,
  upload_type TEXT NOT NULL,
  source_kind TEXT,
  scope_type TEXT NOT NULL CHECK (scope_type = 'competition_window'),
  scope_key TEXT NOT NULL,
  replace_existing INTEGER NOT NULL DEFAULT 1 CHECK (replace_existing IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'failed')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  notes TEXT,
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE TABLE IF NOT EXISTS hydra_report (
  id INTEGER PRIMARY KEY,
  competition_window_id INTEGER NOT NULL UNIQUE REFERENCES competition_window(id),
  report_import_id INTEGER NOT NULL REFERENCES report_import(id),
  source_report_key TEXT,
  source_system TEXT,
  is_partial INTEGER NOT NULL DEFAULT 0 CHECK (is_partial IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hydra_player_result (
  id INTEGER PRIMARY KEY,
  hydra_report_id INTEGER NOT NULL REFERENCES hydra_report(id) ON DELETE CASCADE,
  player_profile_id INTEGER NOT NULL REFERENCES player_profile(id),
  display_name_at_import TEXT NOT NULL,
  total_damage INTEGER NOT NULL DEFAULT 0 CHECK (total_damage >= 0),
  keys_used INTEGER NOT NULL DEFAULT 0 CHECK (keys_used BETWEEN 0 AND 3),
  clan_rank INTEGER CHECK (clan_rank IS NULL OR clan_rank > 0),
  data_completeness TEXT NOT NULL DEFAULT 'aggregate_only'
    CHECK (data_completeness IN ('aggregate_only', 'partial_detail', 'full_detail')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (hydra_report_id, player_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_hydra_player_result_player_profile_id
  ON hydra_player_result (player_profile_id);

CREATE TABLE IF NOT EXISTS hydra_team_run (
  id INTEGER PRIMARY KEY,
  hydra_player_result_id INTEGER NOT NULL REFERENCES hydra_player_result(id) ON DELETE CASCADE,
  hydra_report_id INTEGER NOT NULL REFERENCES hydra_report(id) ON DELETE CASCADE,
  competition_window_id INTEGER NOT NULL REFERENCES competition_window(id),
  player_profile_id INTEGER NOT NULL REFERENCES player_profile(id),
  team_index INTEGER NOT NULL CHECK (team_index BETWEEN 1 AND 3),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('normal', 'hard', 'brutal', 'nightmare')),
  total_damage INTEGER NOT NULL DEFAULT 0 CHECK (total_damage >= 0),
  attempt_order INTEGER CHECK (attempt_order IS NULL OR attempt_order > 0),
  data_completeness TEXT NOT NULL
    CHECK (data_completeness IN ('aggregate_only', 'partial_detail', 'full_detail')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (hydra_player_result_id, team_index)
);

CREATE INDEX IF NOT EXISTS idx_hydra_team_run_player_window
  ON hydra_team_run (player_profile_id, competition_window_id);

CREATE TABLE IF NOT EXISTS hydra_team_champion_performance (
  id INTEGER PRIMARY KEY,
  hydra_team_run_id INTEGER NOT NULL REFERENCES hydra_team_run(id) ON DELETE CASCADE,
  player_profile_id INTEGER NOT NULL REFERENCES player_profile(id),
  competition_window_id INTEGER NOT NULL REFERENCES competition_window(id),
  champion_code TEXT NOT NULL,
  slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 1 AND 6),
  damage_done INTEGER NOT NULL DEFAULT 0 CHECK (damage_done >= 0),
  build_summary_json TEXT CHECK (build_summary_json IS NULL OR json_valid(build_summary_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (hydra_team_run_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_hydra_team_champion_performance_player_window
  ON hydra_team_champion_performance (player_profile_id, competition_window_id);

CREATE TABLE IF NOT EXISTS chimera_report (
  id INTEGER PRIMARY KEY,
  competition_window_id INTEGER NOT NULL UNIQUE REFERENCES competition_window(id),
  report_import_id INTEGER NOT NULL REFERENCES report_import(id),
  source_system TEXT,
  is_partial INTEGER NOT NULL DEFAULT 0 CHECK (is_partial IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chimera_player_result (
  id INTEGER PRIMARY KEY,
  chimera_report_id INTEGER NOT NULL REFERENCES chimera_report(id) ON DELETE CASCADE,
  player_profile_id INTEGER NOT NULL REFERENCES player_profile(id),
  display_name_at_import TEXT NOT NULL,
  total_damage INTEGER NOT NULL DEFAULT 0 CHECK (total_damage >= 0),
  keys_used INTEGER NOT NULL DEFAULT 0 CHECK (keys_used BETWEEN 0 AND 2),
  clan_rank INTEGER CHECK (clan_rank IS NULL OR clan_rank > 0),
  data_completeness TEXT NOT NULL DEFAULT 'aggregate_only'
    CHECK (data_completeness IN ('aggregate_only', 'partial_detail', 'full_detail')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (chimera_report_id, player_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_chimera_player_result_player_profile_id
  ON chimera_player_result (player_profile_id);

CREATE TABLE IF NOT EXISTS chimera_team_run (
  id INTEGER PRIMARY KEY,
  chimera_player_result_id INTEGER NOT NULL REFERENCES chimera_player_result(id) ON DELETE CASCADE,
  chimera_report_id INTEGER NOT NULL REFERENCES chimera_report(id) ON DELETE CASCADE,
  competition_window_id INTEGER NOT NULL REFERENCES competition_window(id),
  player_profile_id INTEGER NOT NULL REFERENCES player_profile(id),
  team_index INTEGER NOT NULL CHECK (team_index BETWEEN 1 AND 2),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'normal', 'hard', 'brutal', 'nightmare', 'ultra_nightmare')),
  total_damage INTEGER NOT NULL DEFAULT 0 CHECK (total_damage >= 0),
  attempt_order INTEGER CHECK (attempt_order IS NULL OR attempt_order > 0),
  data_completeness TEXT NOT NULL
    CHECK (data_completeness IN ('aggregate_only', 'partial_detail', 'full_detail')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (chimera_player_result_id, team_index)
);

CREATE INDEX IF NOT EXISTS idx_chimera_team_run_player_window
  ON chimera_team_run (player_profile_id, competition_window_id);

CREATE TABLE IF NOT EXISTS chimera_team_champion_performance (
  id INTEGER PRIMARY KEY,
  chimera_team_run_id INTEGER NOT NULL REFERENCES chimera_team_run(id) ON DELETE CASCADE,
  player_profile_id INTEGER NOT NULL REFERENCES player_profile(id),
  competition_window_id INTEGER NOT NULL REFERENCES competition_window(id),
  champion_code TEXT NOT NULL,
  slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 1 AND 6),
  damage_done INTEGER NOT NULL DEFAULT 0 CHECK (damage_done >= 0),
  build_summary_json TEXT CHECK (build_summary_json IS NULL OR json_valid(build_summary_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (chimera_team_run_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_chimera_team_champion_performance_player_window
  ON chimera_team_champion_performance (player_profile_id, competition_window_id);

CREATE TABLE IF NOT EXISTS clan_wars_report (
  id INTEGER PRIMARY KEY,
  competition_window_id INTEGER NOT NULL UNIQUE REFERENCES competition_window(id),
  report_import_id INTEGER NOT NULL REFERENCES report_import(id),
  source_system TEXT,
  is_partial INTEGER NOT NULL DEFAULT 0 CHECK (is_partial IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clan_wars_player_score (
  id INTEGER PRIMARY KEY,
  clan_wars_report_id INTEGER NOT NULL REFERENCES clan_wars_report(id) ON DELETE CASCADE,
  competition_window_id INTEGER NOT NULL REFERENCES competition_window(id),
  player_profile_id INTEGER NOT NULL REFERENCES player_profile(id),
  display_name_at_import TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (clan_wars_report_id, player_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_clan_wars_player_score_window_player
  ON clan_wars_player_score (competition_window_id, player_profile_id);

CREATE TABLE IF NOT EXISTS siege_report (
  id INTEGER PRIMARY KEY,
  competition_window_id INTEGER NOT NULL UNIQUE REFERENCES competition_window(id),
  report_import_id INTEGER NOT NULL REFERENCES report_import(id),
  opponent_clan_name TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
  our_score INTEGER NOT NULL CHECK (our_score >= 0),
  their_score INTEGER NOT NULL CHECK (their_score >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS champion_roster_observation (
  id INTEGER PRIMARY KEY,
  player_profile_id INTEGER NOT NULL REFERENCES player_profile(id),
  champion_code TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('hydra', 'chimera', 'siege')),
  evidence_ref_id INTEGER NOT NULL CHECK (evidence_ref_id > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (last_seen_at >= first_seen_at),
  UNIQUE (player_profile_id, champion_code)
);

CREATE INDEX IF NOT EXISTS idx_champion_roster_observation_player
  ON champion_roster_observation (player_profile_id);
