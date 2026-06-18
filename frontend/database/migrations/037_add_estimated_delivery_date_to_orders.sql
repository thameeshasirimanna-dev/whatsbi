-- Migration to add estimated_delivery_date to all existing dynamic orders tables
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE '%_orders' 
        AND schemaname = 'public'
    LOOP
        -- Add column if it does not exist
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ DEFAULT NULL', table_rec.tablename);
        
        RAISE NOTICE 'Added estimated_delivery_date column to table: %', table_rec.tablename;
    END LOOP;
END $$;
