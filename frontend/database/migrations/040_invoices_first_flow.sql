-- Migration 040: Invoice-First Flow Support
-- Enables generating invoices before orders, and creating orders once invoices are paid.

DO $$
DECLARE
    r RECORD;
    invoices_table TEXT;
    orders_table TEXT;
    items_table TEXT;
    customers_table TEXT;
BEGIN
    FOR r IN SELECT id, agent_prefix FROM agents LOOP
        invoices_table := r.agent_prefix || '_orders_invoices';
        orders_table := r.agent_prefix || '_orders';
        items_table := r.agent_prefix || '_orders_items';
        customers_table := r.agent_prefix || '_customers';

        -- 1. Update Invoices Table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = invoices_table) THEN
            -- Add customer_id if not exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = invoices_table AND column_name = 'customer_id'
            ) THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN customer_id INTEGER REFERENCES %I(id) ON DELETE CASCADE', invoices_table, customers_table);
            END IF;

            -- Add total_amount if not exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = invoices_table AND column_name = 'total_amount'
            ) THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0.00', invoices_table);
            END IF;

            -- Add advance_amount if not exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = invoices_table AND column_name = 'advance_amount'
            ) THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN advance_amount DECIMAL(10,2) DEFAULT 0.00', invoices_table);
            END IF;

            -- Add notes if not exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = invoices_table AND column_name = 'notes'
            ) THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN notes TEXT', invoices_table);
            END IF;

            -- Drop NOT NULL constraint on order_id
            BEGIN
                EXECUTE format('ALTER TABLE %I ALTER COLUMN order_id DROP NOT NULL', invoices_table);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            -- Backfill customer_id, total_amount, advance_amount from orders if order_id is present
            EXECUTE format('
                UPDATE %I inv
                SET customer_id = o.customer_id,
                    total_amount = COALESCE(NULLIF(inv.total_amount, 0), o.total_amount, 0),
                    advance_amount = COALESCE(NULLIF(inv.advance_amount, 0), o.advance_amount, 0)
                FROM %I o
                WHERE inv.order_id = o.id AND (inv.customer_id IS NULL OR inv.total_amount = 0)
            ', invoices_table, orders_table);

            -- Create index on customer_id
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (customer_id)', 'idx_' || invoices_table || '_customer_id', invoices_table);
        END IF;

        -- 2. Update Order Items Table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = items_table) THEN
            -- Drop NOT NULL on order_id
            BEGIN
                EXECUTE format('ALTER TABLE %I ALTER COLUMN order_id DROP NOT NULL', items_table);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            -- Add invoice_id if not exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = items_table AND column_name = 'invoice_id'
            ) THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN invoice_id INTEGER REFERENCES %I(id) ON DELETE CASCADE', items_table, invoices_table);
            END IF;

            -- Backfill invoice_id from invoices where order_id matches
            EXECUTE format('
                UPDATE %I oi
                SET invoice_id = inv.id
                FROM %I inv
                WHERE oi.order_id = inv.order_id AND oi.invoice_id IS NULL
            ', items_table, invoices_table);

            -- Create index on invoice_id
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (invoice_id)', 'idx_' || items_table || '_invoice_id', items_table);
        END IF;

        -- 3. Update Orders Table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = orders_table) THEN
            -- Add invoice_id if not exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = orders_table AND column_name = 'invoice_id'
            ) THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN invoice_id INTEGER REFERENCES %I(id) ON DELETE SET NULL', orders_table, invoices_table);
            END IF;

            -- Backfill invoice_id from invoices where order_id matches
            EXECUTE format('
                UPDATE %I o
                SET invoice_id = inv.id
                FROM %I inv
                WHERE o.id = inv.order_id AND o.invoice_id IS NULL
            ', orders_table, invoices_table);

            -- Create index on invoice_id
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (invoice_id)', 'idx_' || orders_table || '_invoice_id', orders_table);
        END IF;

    END LOOP;
END $$;
