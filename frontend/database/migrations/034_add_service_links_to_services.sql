-- Migration to add service_links to all existing dynamic services tables
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE '%_services' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS service_links JSONB DEFAULT NULL', table_rec.tablename);
        RAISE NOTICE 'Added service_links to table: %', table_rec.tablename;
    END LOOP;
END $$;
