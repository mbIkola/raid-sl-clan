export const selectClanWarsArchiveHistorySql = `
WITH recent_windows AS (
  SELECT
    cw.id,
    cw.starts_at,
    cw.ends_at,
    cwr.id AS report_id,
    cwr.has_personal_rewards
  FROM competition_window cw
  JOIN clan_wars_report cwr
    ON cwr.id = (
      SELECT cwr2.id
      FROM clan_wars_report cwr2
      WHERE cwr2.competition_window_id = cw.id
      ORDER BY cwr2.created_at DESC, cwr2.id DESC
      LIMIT 1
    )
  WHERE cw.activity_type = 'clan_wars'
    AND cw.starts_at <= ?
  ORDER BY cw.starts_at DESC, cw.id DESC
  LIMIT ?
)
SELECT
  rw.starts_at,
  rw.ends_at,
  rw.has_personal_rewards AS has_personal_rewards,
  COALESCE(SUM(cwps.points), 0) AS clan_total_points,
  COALESCE(COUNT(DISTINCT CASE WHEN cwps.points > 0 THEN cwps.player_profile_id END), 0) AS active_contributors,
  COALESCE((
    SELECT pp.main_nickname
    FROM clan_wars_player_score cwps2
    JOIN player_profile pp ON pp.id = cwps2.player_profile_id
    WHERE cwps2.clan_wars_report_id = rw.report_id
    ORDER BY cwps2.points DESC, pp.main_nickname ASC
    LIMIT 1
  ), '-') AS top_player_name,
  COALESCE((
    SELECT cwps2.points
    FROM clan_wars_player_score cwps2
    JOIN player_profile pp ON pp.id = cwps2.player_profile_id
    WHERE cwps2.clan_wars_report_id = rw.report_id
    ORDER BY cwps2.points DESC, pp.main_nickname ASC
    LIMIT 1
  ), 0) AS top_player_points
FROM recent_windows rw
LEFT JOIN clan_wars_player_score cwps ON cwps.clan_wars_report_id = rw.report_id
GROUP BY rw.id, rw.starts_at, rw.ends_at, rw.has_personal_rewards, rw.report_id
ORDER BY rw.starts_at DESC, rw.id DESC;
`;

export const selectClanWarsArchivePlayerWindowSql = `
WITH recent_windows AS (
  SELECT
    cw.id,
    cw.starts_at,
    cwr.id AS report_id
  FROM competition_window cw
  JOIN clan_wars_report cwr
    ON cwr.id = (
      SELECT cwr2.id
      FROM clan_wars_report cwr2
      WHERE cwr2.competition_window_id = cw.id
      ORDER BY cwr2.created_at DESC, cwr2.id DESC
      LIMIT 1
    )
  WHERE cw.activity_type = 'clan_wars'
    AND cw.starts_at <= ?
  ORDER BY cw.starts_at DESC, cw.id DESC
  LIMIT ?
), active_players AS (
  SELECT id, main_nickname
  FROM player_profile
  WHERE status = 'active'
)
SELECT
  rw.starts_at AS window_start,
  ap.id AS player_id,
  ap.main_nickname AS player_name,
  COALESCE(cwps.points, 0) AS points
FROM recent_windows rw
CROSS JOIN active_players ap
LEFT JOIN clan_wars_player_score cwps
  ON cwps.clan_wars_report_id = rw.report_id
  AND cwps.player_profile_id = ap.id
ORDER BY rw.starts_at DESC, ap.main_nickname ASC;
`;
