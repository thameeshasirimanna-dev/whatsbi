-- Migration to add customer stage columns to existing agent-specific customers tables using a dynamic function approach
-- This creates a function to add columns and calls it for all existing agents' tables

-- Drop function if exists
DROP FUNCTION IF EXISTS add_stage_columns_to_customers_table(TEXT) CASCADE;

-- Create function to add stage columns to a specific customers table
CREATE OR REPLACE FUNCTION add_stage_columns_to_customers_table(p_table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Add lead_stage if not exists
    EXECUTE format('
        ALTER TABLE IF EXISTS %I 
        ADD COLUMN IF NOT EXISTS lead_stage TEXT DEFAULT ''New Lead'';
    ', p_table_name);
    
    -- Add interest_stage if not exists
    EXECUTE format('
        ALTER TABLE IF EXISTS %I 
        ADD COLUMN IF NOT EXISTS interest_stage TEXT;
    ', p_table_name);
    
    -- Add conversion_stage if not exists
    EXECUTE format('
        ALTER TABLE IF EXISTS %I 
        ADD COLUMN IF NOT EXISTS conversion_stage TEXT;
    ', p_table_name);
    
    RAISE NOTICE 'Added stage columns to table: %', p_table_name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_stage_columns_to_customers_table(TEXT) TO service_role, authenticated;

-- Call the function for all existing customers tables
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE '%_customers' 
        AND schemaname = 'public'
    LOOP
        PERFORM add_stage_columns_to_customers_table(table_rec.tablename);
    END LOOP;
END $$;

-- Comment for documentation
COMMENT ON FUNCTION add_stage_columns_to_customers_table IS 'Dynamically adds lead_stage, interest_stage, and conversion_stage columns to a specified customers table if they do not exist.';