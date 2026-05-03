-- Hotfix for confirmed historical clan wars rewards status.
-- OCR historical import (0005) defaulted has_personal_rewards to 0 for all windows.
-- This migration marks manually confirmed windows with personal rewards.

UPDATE clan_wars_report
SET has_personal_rewards = 1
WHERE has_personal_rewards = 0
  AND source_system = 'historical-clan-wars-ocr'
  AND competition_window_id IN (
    SELECT id
    FROM competition_window
    WHERE activity_type = 'clan_wars'
      AND starts_at = '2026-01-13T00:00:00Z'
      AND ends_at = '2026-01-15T00:00:00Z'
  );
