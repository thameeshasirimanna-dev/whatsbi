-- Migration to add ENUM types for customer stages and update existing *_customers tables
-- This ensures type safety and validation for stage values
-- Idempotent and safe: skips tables without columns using exception handling

-- Create ENUM types (idempotent)
DO $$
BEGIN
    -- Lead Stage ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_stage_enum') THEN
        CREATE TYPE lead_stage_enum AS ENUM ('New Lead', 'Contacted', 'Not Responding', 'Follow-up Needed');
    END IF;
END $$;

DO $$
BEGIN
    -- Interest Stage ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interest_stage_enum') THEN
        CREATE TYPE interest_stage_enum AS ENUM ('Interested', 'Quotation Sent', 'Asked for More Info');
    END IF;
END $$;

DO $$
BEGIN
    -- Conversion Stage ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_stage_enum') THEN
        CREATE TYPE conversion_stage_enum AS ENUM ('Payment Pending', 'Paid', 'Order Confirmed');
    END IF;
END $$;

-- Update all existing customers tables to use the ENUMs (only if columns exist, with exception handling)
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
        -- Handle lead_stage
        BEGIN
            EXECUTE format('
                UPDATE %I 
                SET lead_stage = ''New Lead'' 
                WHERE lead_stage IS NULL OR lead_stage NOT IN (''New Lead'', ''Contacted'', ''Not Responding'', ''Follow-up Needed'');
            ', table_rec.tablename);
            EXECUTE format('
                ALTER TABLE %I 
                ALTER COLUMN lead_stage TYPE lead_stage_enum USING (lead_stage::lead_stage_enum);
            ', table_rec.tablename);
            EXECUTE format('
                ALTER TABLE %I 
                ALTER COLUMN lead_stage SET DEFAULT ''New Lead'';
            ', table_rec.tablename);
            RAISE NOTICE 'Updated lead_stage ENUM for table: %', table_rec.tablename;
        EXCEPTION
            WHEN undefined_column OR undefined_table THEN
                RAISE NOTICE 'Skipping lead_stage for table % (column does not exist)', table_rec.tablename;
            WHEN OTHERS THEN
                RAISE NOTICE 'Error updating lead_stage for %: %', table_rec.tablename, SQLERRM;
        END;

        -- Handle interest_stage
        BEGIN
            EXECUTE format('
                UPDATE %I 
                SET interest_stage = NULL 
                WHERE interest_stage IS NOT NULL AND interest_stage NOT IN (''Interested'', ''Quotation Sent'', ''Asked for More Info'');
            ', table_rec.tablename);
            EXECUTE format('
                ALTER TABLE %I 
                ALTER COLUMN interest_stage TYPE interest_stage_enum USING (COALESCE(interest_stage, NULL)::interest_stage_enum);
            ', table_rec.tablename);
            RAISE NOTICE 'Updated interest_stage ENUM for table: %', table_rec.tablename;
        EXCEPTION
            WHEN undefined_column OR undefined_table THEN
                RAISE NOTICE 'Skipping interest_stage for table % (column does not exist)', table_rec.tablename;
            WHEN OTHERS THEN
                RAISE NOTICE 'Error updating interest_stage for %: %', table_rec.tablename, SQLERRM;
        END;

        -- Handle conversion_stage
        BEGIN
            EXECUTE format('
                UPDATE %I 
                SET conversion_stage = NULL 
                WHERE conversion_stage IS NOT NULL AND conversion_stage NOT IN (''Payment Pending'', ''Paid'', ''Order Confirmed'');
            ', table_rec.tablename);
            EXECUTE format('
                ALTER TABLE %I 
                ALTER COLUMN conversion_stage TYPE conversion_stage_enum USING (COALESCE(conversion_stage, NULL)::conversion_stage_enum);
            ', table_rec.tablename);
            RAISE NOTICE 'Updated conversion_stage ENUM for table: %', table_rec.tablename;
        EXCEPTION
            WHEN undefined_column OR undefined_table THEN
                RAISE NOTICE 'Skipping conversion_stage for table % (column does not exist)', table_rec.tablename;
            WHEN OTHERS THEN
                RAISE NOTICE 'Error updating conversion_stage for %: %', table_rec.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Grant usage on ENUM types to authenticated and service_role
GRANT USAGE ON TYPE lead_stage_enum TO authenticated, service_role;
GRANT USAGE ON TYPE interest_stage_enum TO authenticated, service_role;
GRANT USAGE ON TYPE conversion_stage_enum TO authenticated, service_role;