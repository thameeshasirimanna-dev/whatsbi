-- Migration: Update existing inventory tables to use category_id instead of category TEXT
-- Date: 2025-10-XX
-- Description: Adds category_id column, populates from category TEXT by creating categories, then drops category column
-- Assumes categories tables exist from migration 021

DO $$
DECLARE
    agent_record RECORD;
    inventory_table TEXT;
    categories_table TEXT;
    unique_category RECORD;
    category_name TEXT;
    category_id_val INTEGER;
BEGIN
    FOR agent_record IN SELECT id, agent_prefix FROM agents WHERE agent_prefix IS NOT NULL LOOP
        inventory_table := agent_record.agent_prefix || '_inventory_items';
        categories_table := agent_record.agent_prefix || '_categories';
        
        BEGIN
            -- Add category_id column if it doesn't exist
            EXECUTE format('
                ALTER TABLE %I 
                ADD COLUMN IF NOT EXISTS category_id INTEGER 
                REFERENCES %I(id) ON DELETE SET NULL
            ', inventory_table, categories_table);
            
            RAISE NOTICE 'Added category_id column to % for agent %', inventory_table, agent_record.agent_prefix;
            
            -- Collect unique category names from inventory where category IS NOT NULL and category_id IS NULL
            FOR unique_category IN 
                EXECUTE format('
                    SELECT DISTINCT category as name 
                    FROM %I 
                    WHERE category IS NOT NULL 
                    AND category_id IS NULL 
                    AND agent_id = %L
                ', inventory_table, agent_record.id)
            LOOP
                category_name := TRIM(unique_category.name);
                
                -- Skip if empty or invalid
                IF LENGTH(category_name) = 0 OR category_name !~ '^[a-zA-Z0-9 ]+$' THEN
                    CONTINUE;
                END IF;
                
                -- Check if category already exists
                EXECUTE format('SELECT id FROM %I WHERE LOWER(name) = LOWER($1)', categories_table)
                INTO category_id_val
                USING category_name;
                
                -- If not exists, create it
                IF category_id_val IS NULL THEN
                    EXECUTE format('
                        INSERT INTO %I (name, description, color, updated_at)
                        VALUES ($1, NULL, NULL, CURRENT_TIMESTAMP)
                        RETURNING id
                    ', categories_table)
                    INTO category_id_val
                    USING category_name;
                    
                    RAISE NOTICE 'Created category "%" (ID: %) in % for agent %', category_name, category_id_val, categories_table, agent_record.agent_prefix;
                END IF;
                
                -- Update all items with this category name to use the category_id
                EXECUTE format('
                    UPDATE %I 
                    SET category_id = $1 
                    WHERE LOWER(category) = LOWER($2) 
                    AND category_id IS NULL 
                    AND agent_id = $3
                ', inventory_table)
                USING category_id_val, category_name, agent_record.id;
                
                RAISE NOTICE 'Updated % items to use category_id % for category "%"', 
                    SQL%ROWCOUNT, category_id_val, category_name;
            END LOOP;
            
            -- Drop the old category column if it exists
            EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS category', inventory_table);
            
            -- Add index on category_id if not exists
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_category_id ON %I (category_id)', 
                inventory_table, inventory_table);
            
            RAISE NOTICE 'Successfully updated inventory structure for agent: %', agent_record.agent_prefix;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to update inventory for agent % (ID: %): %', 
                agent_record.agent_prefix, agent_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Completed updating inventory category structure for all existing agents.';
END $$;