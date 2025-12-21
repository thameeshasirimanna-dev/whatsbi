-- Migration: Add WHATSAPP_APP_SECRET column to whatsapp_configuration table
-- Run this in Supabase SQL Editor

-- Add the new column
ALTER TABLE whatsapp_configuration
ADD COLUMN whatsapp_app_secret TEXT;

-- Generate secrets for existing configurations
UPDATE whatsapp_configuration
SET whatsapp_app_secret = encode(gen_random_bytes(32), 'hex')
WHERE whatsapp_app_secret IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN whatsapp_configuration.whatsapp_app_secret IS 'Unique app secret for each agent WhatsApp configuration';