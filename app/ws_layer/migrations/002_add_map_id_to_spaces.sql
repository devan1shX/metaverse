-- Migration: Add map_id column to spaces table
-- Purpose: Enable dynamic map selection for spaces

-- Add map_id column with default value
ALTER TABLE spaces 
ADD COLUMN IF NOT EXISTS map_id VARCHAR(50) DEFAULT 'office-01';

-- Update existing spaces to have office-01 as default map
UPDATE spaces 
SET map_id = 'office-01' 
WHERE map_id IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN spaces.map_id IS 'The map/tilemap identifier for this space (e.g., office-01, office-02)';
