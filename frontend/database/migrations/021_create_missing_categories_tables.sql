-- Migration: Create missing categories tables for existing agents
-- This runs only the categories table creation part for agents where other tables already exist
-- Assumes dynamic_table_creation.sql has been applied and the function exists
-- Run this after 020 if categories tables are missing due to early failure in create_agent_tables

DO $$
DECLARE
    agent_record RECORD;
    categories_table TEXT;
BEGIN
    FOR agent_record IN SELECT id, agent_prefix FROM agents WHERE agent_prefix IS NOT NULL LOOP
        categories_table := agent_record.agent_prefix || '_categories';
        
        BEGIN
            -- Check if categories table already exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = categories_table AND table_schema = 'public'
            ) THEN
                -- Create categories table
                EXECUTE format('
                    CREATE TABLE %I (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE CHECK (name ~ ''^[a-zA-Z0-9 ]{1,50}$''),
                        description TEXT,
                        color VARCHAR(7) DEFAULT ''#000000'' CHECK (color ~ ''^#[0-9A-Fa-f]{6}$'' OR color = ''''),
                        created_at TIMESTAMPTZ DEFAULT now(),
                        updated_at TIMESTAMPTZ DEFAULT now()
                    );
                    ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
                    CREATE INDEX IF NOT EXISTS %s_name_idx ON %I (name);
                    CREATE INDEX IF NOT EXISTS %s_color_idx ON %I (color);
                    DROP POLICY IF EXISTS "Agent can access own categories" ON %I;
                    CREATE POLICY "Agent can access own categories" ON %I
                        FOR ALL USING (
                            auth.uid() IN (
                                SELECT user_id FROM agents
                                WHERE agent_prefix = substring(%L from ''^(.+)_categories$'')
                            )
                        )
                        WITH CHECK (
                            auth.uid() IN (
                                SELECT user_id FROM agents
                                WHERE agent_prefix = substring(%L from ''^(.+)_categories$'')
                            )
                        );
                    ALTER PUBLICATION supabase_realtime ADD TABLE %I;
                ', categories_table, categories_table,
                   categories_table || '_name_idx', categories_table,
                   categories_table || '_color_idx', categories_table,
                   categories_table, categories_table, categories_table,
                   categories_table, categories_table, categories_table);
                
                RAISE NOTICE 'Created missing categories table: % for agent % (ID: %)', categories_table, agent_record.agent_prefix, agent_record.id;
            ELSE
                RAISE NOTICE 'Categories table % already exists for agent % (ID: %)', categories_table, agent_record.agent_prefix, agent_record.id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create categories table for agent % (ID: %): %', agent_record.agent_prefix, agent_record.id, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE 'Completed creating missing categories tables for all existing agents.';
END $$;