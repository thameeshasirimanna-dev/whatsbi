-- Migration to add company_overview to agents table
BEGIN;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS company_overview TEXT;

COMMIT;
