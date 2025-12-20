-- Add ai_enabled column to all existing agent-specific customers tables
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN SELECT tablename FROM pg_tables WHERE tablename LIKE '%_customers'
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true', table_rec.tablename);
    END LOOP;
END $$;