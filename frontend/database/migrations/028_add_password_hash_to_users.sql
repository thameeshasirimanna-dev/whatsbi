-- Add password_hash column to users table for custom authentication
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);