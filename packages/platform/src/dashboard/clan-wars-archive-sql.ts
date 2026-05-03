export const selectClanWarsArchiveHistorySql = `
WITH recent_windows AS (
  SELECT id, starts_at, ends_at
  FROM competition_window
  WHERE activity_type = 'clan_wars'
  ORDER BY starts_at DESC, id DESC
  LIMIT ?
)
SELECT
  rw.starts_at,
  rw.ends_at,
  COALESCE(cwr.has_personal_rewards, 0) AS has_personal_rewards,
  COALESCE(SUM(cwps.points), 0) AS clan_total_points,
  COALESCE(COUNT(DISTINCT CASE WHEN cwps.points > 0 THEN cwps.player_profile_id END), 0) AS active_contributors,
  COALESCE((
    SELECT pp2.main_nickname
    FROM clan_wars_report cwr2
    JOIN clan_wars_player_score cwps2 ON cwps2.clan_wars_report_id = cwr2.id
    JOIN player_profile pp2 ON pp2.id = cwps2.player_profile_id
    WHERE cwr2.competition_window_id = rw.id
    ORDER BY cwps2.points DESC, pp2.main_nickname ASC
    LIMIT 1
  ), '-') AS top_player_name,
  COALESCE((
    SELECT cwps2.points
    FROM clan_wars_report cwr2
    JOIN clan_wars_player_score cwps2 ON cwps2.clan_wars_report_id = cwr2.id
    JOIN player_profile pp2 ON pp2.id = cwps2.player_profile_id
    WHERE cwr2.competition_window_id = rw.id
    ORDER BY cwps2.points DESC, pp2.main_nickname ASC
    LIMIT 1
  ), 0) AS top_player_points
FROM recent_windows rw
LEFT JOIN clan_wars_report cwr ON cwr.competition_window_id = rw.id
LEFT JOIN clan_wars_player_score cwps ON cwps.clan_wars_report_id = cwr.id
GROUP BY rw.id, rw.starts_at, rw.ends_at, cwr.has_personal_rewards
ORDER BY rw.starts_at DESC, rw.id DESC;
`;

export const selectClanWarsArchivePlayerWindowSql = `
WITH recent_windows AS (
  SELECT id, starts_at
  FROM competition_window
  WHERE activity_type = 'clan_wars'
  ORDER BY starts_at DESC, id DESC
  LIMIT ?
), active_players AS (
  SELECT id, main_nickname
  FROM player_profile
  WHERE status = 'active'
)
SELECT
  rw.starts_at AS window_start,
  ap.main_nickname AS player_name,
  COALESCE(cwps.points, 0) AS points
FROM recent_windows rw
CROSS JOIN active_players ap
LEFT JOIN clan_wars_report cwr ON cwr.competition_window_id = rw.id
LEFT JOIN clan_wars_player_score cwps
  ON cwps.clan_wars_report_id = cwr.id
  AND cwps.player_profile_id = ap.id
ORDER BY rw.starts_at DESC, ap.main_nickname ASC;
`;
