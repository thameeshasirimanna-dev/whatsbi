-- Migration 044: Add sms_credits column to agents table for Normal SMS marketing
-- agents table already has `credits` for WhatsApp Marketing Template messages (Rs. 30/msg).
-- This adds `sms_credits` NUMERIC(10, 2) DEFAULT 0.00 for Normal SMS marketing (Rs. 1/SMS).

ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS sms_credits NUMERIC(10, 2) DEFAULT 0.00;

-- Update existing agents with NULL sms_credits to 0.00
UPDATE public.agents 
SET sms_credits = 0.00 
WHERE sms_credits IS NULL;
