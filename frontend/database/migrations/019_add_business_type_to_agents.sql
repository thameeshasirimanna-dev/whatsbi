BEGIN;

-- Create business_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type_enum') THEN
        CREATE TYPE business_type_enum AS ENUM ('product', 'service');
    END IF;
END $$;

-- Add business_type column to agents table with default 'product'
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS business_type business_type_enum DEFAULT 'product';

COMMIT;