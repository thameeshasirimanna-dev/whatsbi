-- Migration to add invoice_template_path to agents table
BEGIN;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS invoice_template_path TEXT;

COMMIT;