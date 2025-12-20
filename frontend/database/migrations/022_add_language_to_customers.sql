-- Migration to add language column to all existing customers tables
-- Run this after dynamic table creation is updated

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
        EXECUTE format('
            ALTER TABLE %I 
            ADD COLUMN IF NOT EXISTS language TEXT DEFAULT ''english''
        ', table_rec.tablename);
        RAISE NOTICE 'Added language column to table: %', table_rec.tablename;
    END LOOP;
END $$;