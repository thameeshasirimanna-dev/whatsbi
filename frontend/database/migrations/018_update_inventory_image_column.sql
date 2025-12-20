-- Migration: Update inventory image column to support multiple images
-- Date: 2025-10-XX
-- Description: Change image_url to image_urls (JSON array) to support up to 5 images

-- Update existing agents' inventory tables
DO $$
DECLARE
    agent_record RECORD;
    inventory_table TEXT;
BEGIN
    FOR agent_record IN SELECT id, agent_prefix FROM agents WHERE agent_prefix IS NOT NULL
    LOOP
        inventory_table := agent_record.agent_prefix || '_inventory_items';

        -- Rename column to image_urls and change type to JSONB
        EXECUTE format('ALTER TABLE %I RENAME COLUMN image_url TO image_urls', inventory_table);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN image_urls TYPE JSONB USING CASE WHEN image_urls IS NULL OR image_urls = '''' THEN NULL ELSE json_build_array(image_urls) END', inventory_table);

        RAISE NOTICE 'Updated column image_urls for agent: %', agent_record.agent_prefix;
    END LOOP;
END;
$$;