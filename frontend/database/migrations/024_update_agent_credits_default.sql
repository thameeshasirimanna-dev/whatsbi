-- Migration: Update default credits to 1.00 for agents
-- Sets existing agents with 0 credits to 1, and changes column default to 1.00

-- Update existing agents that have 0 credits to 1
UPDATE public.agents 
SET credits = 1.00 
WHERE credits = 0.00 OR credits IS NULL;

-- Set the default value for new agents
ALTER TABLE public.agents 
ALTER COLUMN credits SET DEFAULT 1.00;