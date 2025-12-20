-- Migration: Add inventory management system
-- Date: 2025-01-XX
-- Description: Adds inventory_items table to agent dynamic schema

-- Create inventory_items tables for existing agents
DO $$
DECLARE
    agent_record RECORD;
    inventory_table TEXT;
BEGIN
    FOR agent_record IN SELECT id, agent_prefix FROM agents WHERE agent_prefix IS NOT NULL
    LOOP
        inventory_table := agent_record.agent_prefix || '_inventory_items';

        -- Create inventory table if it doesn't exist
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I (
                id SERIAL PRIMARY KEY,
                agent_id BIGINT NOT NULL DEFAULT %L REFERENCES agents(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
                price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
                category TEXT,
                sku VARCHAR(100),
                image_url TEXT,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );
            ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
            CREATE INDEX IF NOT EXISTS %s ON %I (name);
            CREATE INDEX IF NOT EXISTS %s ON %I (category);
            CREATE INDEX IF NOT EXISTS %s ON %I (sku);
            DROP POLICY IF EXISTS "Agent can access own inventory" ON %I;
            CREATE POLICY "Agent can access own inventory" ON %I
                FOR ALL USING (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id))
                WITH CHECK (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id));
            ALTER PUBLICATION supabase_realtime ADD TABLE %I;
        ', inventory_table, agent_record.id, inventory_table, inventory_table || '_name_idx', inventory_table, inventory_table || '_category_idx', inventory_table, inventory_table || '_sku_idx', inventory_table, inventory_table, inventory_table, inventory_table);

        RAISE NOTICE 'Created inventory_items table for existing agent: %', agent_record.agent_prefix;
    END LOOP;
END;
$$;