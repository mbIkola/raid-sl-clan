export const selectHydraReadinessSql = `
WITH latest_window AS (
  SELECT id, starts_at, ends_at
  FROM competition_window
  WHERE activity_type = 'hydra'
  ORDER BY ends_at DESC, id DESC
  LIMIT 1
)
SELECT
  lw.starts_at,
  lw.ends_at,
  COALESCE(SUM(hpr.total_damage), 0) AS total_score,
  COALESCE(SUM(hpr.keys_used), 0) AS keys_spent
FROM latest_window lw
LEFT JOIN hydra_report hr ON hr.competition_window_id = lw.id
LEFT JOIN hydra_player_result hpr ON hpr.hydra_report_id = hr.id
GROUP BY lw.id, lw.starts_at, lw.ends_at;
`;

export const selectChimeraReadinessSql = `
WITH latest_window AS (
  SELECT id, starts_at, ends_at
  FROM competition_window
  WHERE activity_type = 'chimera'
  ORDER BY ends_at DESC, id DESC
  LIMIT 1
)
SELECT
  lw.starts_at,
  lw.ends_at,
  COALESCE(SUM(cpr.total_damage), 0) AS total_score,
  COALESCE(SUM(cpr.keys_used), 0) AS keys_spent
FROM latest_window lw
LEFT JOIN chimera_report cr ON cr.competition_window_id = lw.id
LEFT JOIN chimera_player_result cpr ON cpr.chimera_report_id = cr.id
GROUP BY lw.id, lw.starts_at, lw.ends_at;
`;

export const selectClanWarsReadinessSql = `
WITH latest_window AS (
  SELECT id, starts_at, ends_at
  FROM competition_window
  WHERE activity_type = 'clan_wars'
  ORDER BY starts_at DESC, id DESC
  LIMIT 1
), latest_report AS (
  SELECT cwr.has_personal_rewards
  FROM clan_wars_report cwr
  JOIN latest_window lw ON lw.id = cwr.competition_window_id
  ORDER BY cwr.created_at DESC, cwr.id DESC
  LIMIT 1
)
SELECT
  lw.starts_at,
  lw.ends_at,
  COALESCE(lr.has_personal_rewards, 0) AS has_personal_rewards
FROM latest_window lw
LEFT JOIN latest_report lr ON 1 = 1;
`;

export const selectSiegeReadinessSql = `
SELECT starts_at, ends_at
FROM competition_window
WHERE activity_type = 'siege'
ORDER BY starts_at DESC, id DESC
LIMIT 1;
`;

const selectHydraRankingBaseSql = `
WITH recent_windows AS (
  SELECT id
  FROM competition_window
  WHERE activity_type = 'hydra'
  ORDER BY ends_at DESC, id DESC
  LIMIT ?
)
SELECT
  pp.main_nickname AS player_name,
  COALESCE(SUM(CASE WHEN hr.id IS NOT NULL THEN hpr.total_damage ELSE 0 END), 0) AS score
FROM player_profile pp
LEFT JOIN hydra_player_result hpr ON hpr.player_profile_id = pp.id
LEFT JOIN hydra_report hr
  ON hr.id = hpr.hydra_report_id
  AND hr.competition_window_id IN (SELECT id FROM recent_windows)
WHERE pp.status = 'active'
GROUP BY pp.id, pp.main_nickname
`;

const selectChimeraRankingBaseSql = `
WITH recent_windows AS (
  SELECT id
  FROM competition_window
  WHERE activity_type = 'chimera'
  ORDER BY ends_at DESC, id DESC
  LIMIT ?
)
SELECT
  pp.main_nickname AS player_name,
  COALESCE(SUM(CASE WHEN cr.id IS NOT NULL THEN cpr.total_damage ELSE 0 END), 0) AS score
FROM player_profile pp
LEFT JOIN chimera_player_result cpr ON cpr.player_profile_id = pp.id
LEFT JOIN chimera_report cr
  ON cr.id = cpr.chimera_report_id
  AND cr.competition_window_id IN (SELECT id FROM recent_windows)
WHERE pp.status = 'active'
GROUP BY pp.id, pp.main_nickname
`;

const selectClanWarsRankingBaseSql = `
WITH latest_reward_reports AS (
  SELECT id
  FROM clan_wars_report
  WHERE has_personal_rewards = 1
  ORDER BY created_at DESC, id DESC
  LIMIT 4
)
SELECT
  pp.main_nickname AS player_name,
  COALESCE(SUM(cwps.points), 0) AS score
FROM player_profile pp
LEFT JOIN clan_wars_player_score cwps
  ON cwps.player_profile_id = pp.id
  AND cwps.clan_wars_report_id IN (SELECT id FROM latest_reward_reports)
WHERE pp.status = 'active'
GROUP BY pp.id, pp.main_nickname
`;

export const selectHydraRankingSql = (order: 'ASC' | 'DESC') =>
  `${selectHydraRankingBaseSql} ORDER BY score ${order}, pp.main_nickname ASC LIMIT ?;`;

export const selectChimeraRankingSql = (order: 'ASC' | 'DESC') =>
  `${selectChimeraRankingBaseSql} ORDER BY score ${order}, pp.main_nickname ASC LIMIT ?;`;

export const selectClanWarsRankingSql = (order: 'ASC' | 'DESC') =>
  `${selectClanWarsRankingBaseSql} ORDER BY score ${order}, pp.main_nickname ASC LIMIT ?;`;

export const selectHydraTrendSql = `
WITH recent_windows AS (
  SELECT id, ends_at
  FROM competition_window
  WHERE activity_type = 'hydra'
  ORDER BY ends_at DESC, id DESC
  LIMIT ?
)
SELECT
  rw.ends_at,
  COALESCE(SUM(hpr.total_damage), 0) AS total_score
FROM recent_windows rw
LEFT JOIN hydra_report hr ON hr.competition_window_id = rw.id
LEFT JOIN hydra_player_result hpr ON hpr.hydra_report_id = hr.id
GROUP BY rw.id, rw.ends_at
ORDER BY rw.ends_at ASC;
`;

export const selectChimeraTrendSql = `
WITH recent_windows AS (
  SELECT id, ends_at
  FROM competition_window
  WHERE activity_type = 'chimera'
  ORDER BY ends_at DESC, id DESC
  LIMIT ?
)
SELECT
  rw.ends_at,
  COALESCE(SUM(cpr.total_damage), 0) AS total_score
FROM recent_windows rw
LEFT JOIN chimera_report cr ON cr.competition_window_id = rw.id
LEFT JOIN chimera_player_result cpr ON cpr.chimera_report_id = cr.id
GROUP BY rw.id, rw.ends_at
ORDER BY rw.ends_at ASC;
`;
