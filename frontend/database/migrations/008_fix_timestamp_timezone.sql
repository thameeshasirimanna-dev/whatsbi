-- Migration: Fix Timestamp Timezone Issues
-- This migration converts all TIMESTAMP WITHOUT TIME ZONE columns to TIMESTAMPTZ
-- to properly handle timezone information for WhatsApp messages and other data

-- Note: This migration will affect all existing agent tables
-- It converts timestamps while preserving data by assuming existing timestamps are in UTC

DO $$
DECLARE
    agent_record RECORD;
    table_name TEXT;
    sql_command TEXT;
BEGIN
    -- Loop through all agents to update their dynamic tables
    FOR agent_record IN SELECT agent_prefix FROM agents LOOP
        RAISE NOTICE 'Updating timestamp columns for agent: %', agent_record.agent_prefix;
        
        -- Update customers table
        table_name := agent_record.agent_prefix || '_customers';
        BEGIN
            sql_command := format('ALTER TABLE %I ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC''', table_name);
            EXECUTE sql_command;
            RAISE NOTICE 'Updated % table: created_at column', table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to update % table: % - %', table_name, SQLSTATE, SQLERRM;
        END;
        
        -- Update messages table (most important for WhatsApp timestamps)
        table_name := agent_record.agent_prefix || '_messages';
        BEGIN
            sql_command := format('ALTER TABLE %I ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE ''UTC''', table_name);
            EXECUTE sql_command;
            RAISE NOTICE 'Updated % table: timestamp column', table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to update % table: % - %', table_name, SQLSTATE, SQLERRM;
        END;
        
        -- Update orders table
        table_name := agent_record.agent_prefix || '_orders';
        BEGIN
            sql_command := format('ALTER TABLE %I ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC''', table_name);
            EXECUTE sql_command;
            sql_command := format('ALTER TABLE %I ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''', table_name);
            EXECUTE sql_command;
            RAISE NOTICE 'Updated % table: created_at and updated_at columns', table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to update % table: % - %', table_name, SQLSTATE, SQLERRM;
        END;
        
        -- Update order_items table
        table_name := agent_record.agent_prefix || '_orders_items';
        BEGIN
            sql_command := format('ALTER TABLE %I ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC''', table_name);
            EXECUTE sql_command;
            RAISE NOTICE 'Updated % table: created_at column', table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to update % table: % - %', table_name, SQLSTATE, SQLERRM;
        END;
        
        -- Update invoices table
        table_name := agent_record.agent_prefix || '_orders_invoices';
        BEGIN
            sql_command := format('ALTER TABLE %I ALTER COLUMN generated_at TYPE TIMESTAMPTZ USING generated_at AT TIME ZONE ''UTC''', table_name);
            EXECUTE sql_command;
            sql_command := format('ALTER TABLE %I ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''', table_name);
            EXECUTE sql_command;
            RAISE NOTICE 'Updated % table: generated_at and updated_at columns', table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to update % table: % - %', table_name, SQLSTATE, SQLERRM;
        END;
        
    END LOOP;
    
    RAISE NOTICE 'Timestamp timezone migration completed successfully';
END;
$$;