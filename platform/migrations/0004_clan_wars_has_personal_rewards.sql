ALTER TABLE clan_wars_report
ADD COLUMN has_personal_rewards INTEGER NOT NULL DEFAULT 0 CHECK (has_personal_rewards IN (0, 1));
