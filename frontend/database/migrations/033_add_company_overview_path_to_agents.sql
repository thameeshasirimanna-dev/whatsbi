-- Migration to add company_overview_path to agents table
BEGIN;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS company_overview_path TEXT;

COMMIT;
