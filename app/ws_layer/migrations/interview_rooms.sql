-- ============================================================
-- Interview Rooms Migration
-- Run this in your PostgreSQL DB (psql or pgAdmin)
-- ============================================================

-- Add interview-specific columns to spaces table
ALTER TABLE spaces
  ADD COLUMN IF NOT EXISTS space_type VARCHAR(20) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS interview_config JSONB DEFAULT '{}';

-- interview_config shape:
-- {
--   "snapshot_interval_min": 5,   -- how often to capture candidate webcam
--   "max_duration_min": 45,        -- default timer duration
--   "waiting_room_enabled": true   -- whether a waiting room is shown to candidates
-- }

-- Update existing spaces to have general type
UPDATE spaces SET space_type = 'general' WHERE space_type IS NULL;

-- Verify columns added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'spaces'
  AND column_name IN ('space_type', 'interview_config')
ORDER BY column_name;
