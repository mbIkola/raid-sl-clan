-- Inferred from tool/ocr-clan-results over ~/Downloads/clanwars resources.
-- Decision rule: explicit OCR marker for "Личные награды" on the clan wars page.

WITH inferred_windows(starts_at, ends_at, source_file) AS (
  VALUES
    ('2025-04-08T00:00:00Z', '2025-04-10T00:00:00Z', '10.04.25.jpg'),
    ('2025-05-06T00:00:00Z', '2025-05-08T00:00:00Z', '08.05.25.jpg'),
    ('2025-07-29T00:00:00Z', '2025-07-31T00:00:00Z', '31.07.25.jpg'),
    ('2025-08-26T00:00:00Z', '2025-08-28T00:00:00Z', '28.08.25.jpg'),
    ('2025-09-23T00:00:00Z', '2025-09-25T00:00:00Z', '25.09.25.jpg'),
    ('2025-10-21T00:00:00Z', '2025-10-23T00:00:00Z', '23.10.25.jpg'),
    ('2025-11-18T00:00:00Z', '2025-11-20T00:00:00Z', '20.11.25.jpg'),
    ('2025-12-16T00:00:00Z', '2025-12-18T00:00:00Z', '18.12.25.jpg'),
    ('2026-01-13T00:00:00Z', '2026-01-15T00:00:00Z', '15.01.26.jpg'),
    ('2026-02-10T00:00:00Z', '2026-02-12T00:00:00Z', '12.02.26.jpg'),
    ('2026-03-10T00:00:00Z', '2026-03-12T00:00:00Z', '11.03.26.jpg'),
    ('2026-04-07T00:00:00Z', '2026-04-09T00:00:00Z', '08.04.26.jpg')
)
UPDATE clan_wars_report
SET has_personal_rewards = 1
WHERE source_system = 'historical-clan-wars-ocr'
  AND has_personal_rewards = 0
  AND competition_window_id IN (
    SELECT cw.id
    FROM competition_window cw
    JOIN inferred_windows iw
      ON iw.starts_at = cw.starts_at
     AND iw.ends_at = cw.ends_at
    WHERE cw.activity_type = 'clan_wars'
  );
