-- Migration to add ai_instructions to agents table
BEGIN;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS ai_instructions TEXT;

COMMIT;
