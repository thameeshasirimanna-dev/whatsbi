-- Migration: Add media support to messages tables
-- This migration adds media_type and media_url columns to support image/media messages
-- Applies to both base schema (if exists) and all dynamic agent tables

BEGIN;

-- Add enum for media types if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type') THEN
        CREATE TYPE media_type AS ENUM ('none', 'image', 'video', 'audio', 'document', 'sticker');
    END IF;
END $$;

-- Function to add media columns to a specific messages table
CREATE OR REPLACE FUNCTION add_media_columns_to_table(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Add media_type column if it doesn't exist
    EXECUTE format('
        ALTER TABLE IF EXISTS %I 
        ADD COLUMN IF NOT EXISTS media_type media_type DEFAULT ''none''
    ', table_name);
    
    -- Add media_url column if it doesn't exist
    EXECUTE format('
        ALTER TABLE IF EXISTS %I 
        ADD COLUMN IF NOT EXISTS media_url TEXT
    ', table_name);
    
    -- Add caption column for media messages if it doesn't exist
    EXECUTE format('
        ALTER TABLE IF EXISTS %I 
        ADD COLUMN IF NOT EXISTS caption TEXT
    ', table_name);
    
    -- Create index on media_type if it doesn't exist
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%s_media_type 
        ON %I (media_type) 
        WHERE media_type != ''none''
    ', table_name, table_name);
    
    RAISE NOTICE 'Media columns added to table: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- Apply to any base messages table (if it exists)
SELECT add_media_columns_to_table('messages');

-- Apply to all dynamic agent messages tables
DO $$
DECLARE
    agent_record RECORD;
    messages_table_name TEXT;
BEGIN
    -- Get all agent prefixes from agents table
    FOR agent_record IN 
        SELECT agent_prefix FROM agents 
        WHERE agent_prefix IS NOT NULL AND agent_prefix != ''
    LOOP
        messages_table_name := agent_record.agent_prefix || '_messages';
        
        -- Check if the table exists before trying to modify
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = messages_table_name
        ) THEN
            PERFORM add_media_columns_to_table(messages_table_name);
        ELSE
            RAISE NOTICE 'Messages table % does not exist, skipping', messages_table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Media support migration completed for all agent tables';
END $$;

-- Update existing messages to set media_type to 'none' for backward compatibility
DO $$
DECLARE
    agent_record RECORD;
    messages_table_name TEXT;
BEGIN
    FOR agent_record IN 
        SELECT agent_prefix FROM agents 
        WHERE agent_prefix IS NOT NULL AND agent_prefix != ''
    LOOP
        messages_table_name := agent_record.agent_prefix || '_messages';
        
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = messages_table_name
        ) THEN
            -- Update existing records to set media_type to 'none'
            EXECUTE format('
                UPDATE %I 
                SET media_type = ''none'' 
                WHERE media_type IS NULL
            ', messages_table_name);
            
            RAISE NOTICE 'Updated existing messages in table: %', messages_table_name;
        END IF;
    END LOOP;
END $$;

-- Clean up the helper function (optional - can keep for future use)
-- DROP FUNCTION IF EXISTS add_media_columns_to_table(TEXT);

COMMIT;