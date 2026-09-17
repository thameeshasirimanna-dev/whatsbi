-- Migration 041: Add dedicated ai_balance column for DeepSeek AI
-- Keeps the existing `credits` column exclusively for WhatsApp template messages.
-- Adds `ai_balance` NUMERIC(14, 6) with default USD 4.000000 for DeepSeek AI token consumption.

-- 1. Add ai_balance column to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS ai_balance NUMERIC(14, 6) DEFAULT 4.000000;

-- 2. Populate ai_balance for existing agents where it is NULL or 0
UPDATE public.agents 
SET ai_balance = 4.000000 
WHERE ai_balance IS NULL OR ai_balance = 0.00;
