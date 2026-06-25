import { query } from "./client";

let dbReady = false;

export async function ensureSchema(): Promise<void> {
  if (dbReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL UNIQUE,
      temperature_unit TEXT NOT NULL DEFAULT 'celsius',
      wind_speed_unit TEXT NOT NULL DEFAULT 'kmh',
      precipitation_unit TEXT NOT NULL DEFAULT 'mm',
      default_location_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_preferences(user_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS saved_locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      country TEXT,
      country_code TEXT,
      admin1 TEXT,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_locations_user_id ON saved_locations(user_id)`);

  // FK: default_location_id → saved_locations
  // Use DO block to make idempotent
  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_default_location'
      ) THEN
        ALTER TABLE user_preferences
          ADD CONSTRAINT fk_default_location
          FOREIGN KEY (default_location_id) REFERENCES saved_locations(id) ON DELETE SET NULL;
      END IF;
    END $$
  `);

  dbReady = true;
}
