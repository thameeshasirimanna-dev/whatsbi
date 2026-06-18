-- Migration to add advance_amount and payment_status to all existing dynamic orders tables
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
        -- Add columns if they do not exist
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(10,2) DEFAULT 0', table_rec.tablename);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT ''unpaid''', table_rec.tablename);
        
        -- Backfill existing orders: if they have order status as 'completed' or 'delivered', set payment_status to 'paid'
        -- Otherwise set to 'unpaid'
        EXECUTE format('UPDATE %I SET payment_status = ''paid'' WHERE status IN (''completed'', ''delivered'') AND payment_status = ''unpaid''', table_rec.tablename);
        
        RAISE NOTICE 'Added columns and backfilled table: %', table_rec.tablename;
    END LOOP;
END $$;
