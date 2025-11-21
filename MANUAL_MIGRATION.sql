-- MANUAL MIGRATION INSTRUCTIONS
--
-- Run this SQL script against your PostgreSQL database.
-- You can run it in one of two ways:
--
-- Option 1: Using psql command line (if you have access):
--   psql -h <your_host> -p <your_port> -U postgres -d postgres -f this_file.sql
--
-- Option 2: Using a PostgreSQL GUI tool (like pgAdmin, DBeaver, etc.):
--   1. Connect to your database
--   2. Open this file and execute it
--
-- Option 3: Through your database management interface

-- Add map_id column to spaces table
ALTER TABLE spaces 
ADD COLUMN IF NOT EXISTS map_id VARCHAR(50) DEFAULT 'office-01';

-- Update existing spaces to have office-01 as default map
UPDATE spaces 
SET map_id = 'office-01' 
WHERE map_id IS NULL;

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length, column_default
FROM information_schema.columns 
WHERE table_name = 'spaces' AND column_name = 'map_id';

-- Show all columns in spaces table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'spaces'
ORDER BY ordinal_position;
