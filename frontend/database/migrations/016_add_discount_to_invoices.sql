-- Migration: Add discount_percentage column to all existing agent invoices tables
-- Run this after dynamic_table_creation.sql has been updated

DO $$
DECLARE
    agent_record RECORD;
    invoices_table TEXT;
BEGIN
    -- Loop through all agents and add discount_percentage column to their invoices tables
    FOR agent_record IN
        SELECT agent_prefix FROM agents
    LOOP
        invoices_table := agent_record.agent_prefix || '_orders_invoices';
        
        -- Add column if it doesn't exist
        EXECUTE format('
            ALTER TABLE IF EXISTS %I
            ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
        ', invoices_table);
        
        RAISE NOTICE 'Added discount_percentage column to table: %', invoices_table;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: discount_percentage column added to all existing invoices tables';
END $$;