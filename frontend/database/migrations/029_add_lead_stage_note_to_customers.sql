-- Migration: add lead_stage_note TEXT column to all existing agent customers tables

DROP FUNCTION IF EXISTS add_lead_stage_note_to_customers_table(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION add_lead_stage_note_to_customers_table(p_table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format('
        ALTER TABLE IF EXISTS %I
        ADD COLUMN IF NOT EXISTS lead_stage_note TEXT;
    ', p_table_name);

    RAISE NOTICE 'Added lead_stage_note column to table: %', p_table_name;
END;
$$;

GRANT EXECUTE ON FUNCTION add_lead_stage_note_to_customers_table(TEXT) TO service_role, authenticated;

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
        PERFORM add_lead_stage_note_to_customers_table(table_rec.tablename);
    END LOOP;
END $$;
