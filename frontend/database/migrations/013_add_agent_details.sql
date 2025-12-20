-- Add agent details columns to agents table
ALTER TABLE agents ADD COLUMN address TEXT;
ALTER TABLE agents ADD COLUMN business_email VARCHAR(255);
ALTER TABLE agents ADD COLUMN contact_number VARCHAR(20);
ALTER TABLE agents ADD COLUMN website TEXT;