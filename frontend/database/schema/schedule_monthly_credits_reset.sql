-- Schedule monthly credits reset using pg_cron
-- Runs on the 1st of every month at midnight UTC (adjust timezone if needed)
-- Prerequisites: Enable pg_cron extension in Supabase dashboard (Extensions > pg_cron > Enable)
-- Usage: Run this SQL in Supabase SQL editor after enabling pg_cron

-- Safely remove existing schedule if it exists (ignores error if job not found)
DO $$
BEGIN
    PERFORM cron.unschedule('reset-monthly-credits');
EXCEPTION WHEN OTHERS THEN
    -- Ignore if job not found or other errors
    NULL;
END $$;

-- Schedule the monthly reset: add 1 credit to all agents on the 1st at 00:00 UTC
SELECT cron.schedule('reset-monthly-credits', '0 0 1 * *', 'SELECT public.reset_monthly_credits();');

-- Verify the schedule (run this to check)
-- SELECT * FROM cron.job WHERE jobname = 'reset-monthly-credits';