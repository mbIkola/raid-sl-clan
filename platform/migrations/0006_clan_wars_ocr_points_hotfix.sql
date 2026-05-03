-- Hotfix for known OCR artifacts in historical clan wars import.
-- Some rows imported by 0005 had an extra leading digit in points.

UPDATE clan_wars_player_score
SET points = 117545
WHERE points = 2117545
  AND player_profile_id IN (
    SELECT id
    FROM player_profile
    WHERE main_nickname = '(BiБр) Крегул'
  )
  AND clan_wars_report_id IN (
    SELECT cwr.id
    FROM clan_wars_report cwr
    JOIN competition_window cw ON cw.id = cwr.competition_window_id
    WHERE cw.activity_type = 'clan_wars'
      AND cw.starts_at = '2026-02-24T00:00:00Z'
      AND cw.ends_at = '2026-02-26T00:00:00Z'
  );

UPDATE clan_wars_player_score
SET points = 154714
WHERE points = 1154714
  AND player_profile_id IN (
    SELECT id
    FROM player_profile
    WHERE main_nickname = 'Nightfear'
  )
  AND clan_wars_report_id IN (
    SELECT cwr.id
    FROM clan_wars_report cwr
    JOIN competition_window cw ON cw.id = cwr.competition_window_id
    WHERE cw.activity_type = 'clan_wars'
      AND cw.starts_at = '2026-01-13T00:00:00Z'
      AND cw.ends_at = '2026-01-15T00:00:00Z'
  );
