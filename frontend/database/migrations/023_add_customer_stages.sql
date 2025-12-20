-- Migration to add customer stage columns to all existing agent-specific customers tables
-- lead_stage, interest_stage, conversion_stage

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
        -- Add lead_stage
        EXECUTE format('
            ALTER TABLE %I 
            ADD COLUMN IF NOT EXISTS lead_stage TEXT DEFAULT ''New Lead''
        ', table_rec.tablename);
        RAISE NOTICE 'Added lead_stage column to table: %', table_rec.tablename;

        -- Add interest_stage
        EXECUTE format('
            ALTER TABLE %I 
            ADD COLUMN IF NOT EXISTS interest_stage TEXT
        ', table_rec.tablename);
        RAISE NOTICE 'Added interest_stage column to table: %', table_rec.tablename;

        -- Add conversion_stage
        EXECUTE format('
            ALTER TABLE %I 
            ADD COLUMN IF NOT EXISTS conversion_stage TEXT
        ', table_rec.tablename);
        RAISE NOTICE 'Added conversion_stage column to table: %', table_rec.tablename;
    END LOOP;
END $$;