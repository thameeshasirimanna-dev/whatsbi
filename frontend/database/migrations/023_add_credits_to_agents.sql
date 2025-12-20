-- Migration: Add credits column to agents table
-- This adds a credits field to track agent credits for template messages.

ALTER TABLE public.agents 
ADD COLUMN credits NUMERIC(10, 2) DEFAULT 0.00;