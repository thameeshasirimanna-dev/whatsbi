-- Migration to add message_category enum for templates
-- This enum is shared across all dynamic templates tables

CREATE TYPE IF NOT EXISTS message_category AS ENUM ('utility', 'marketing', 'authentication');