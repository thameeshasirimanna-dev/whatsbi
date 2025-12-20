# Credits Reset Setup Instructions

## Overview
This document explains how to set up the monthly credits reset for agents in the Supabase project. The reset adds 1 credit to each agent's balance on the 1st of every month, preserving any additional credits added by the agent.

## Prerequisites
- The migration `024_update_agent_credits_default.sql` has been run to set default credits to 1.00.
- The function `reset_monthly_credits()` from `database/schema/reset_monthly_credits.sql` has been executed.

## Step 1: Enable pg_cron Extension
Supabase requires the pg_cron extension to be enabled for scheduled jobs.

1. Go to your Supabase Dashboard.
2. Navigate to **Database** > **Extensions**.
3. Search for `pg_cron`.
4. Click **Enable** next to `pg_cron`.
5. Wait for the extension to be enabled (it may take a few minutes).

**Note:** pg_cron runs in UTC timezone. If you need a different timezone (e.g., Asia/Colombo UTC+5:30), adjust the cron schedule accordingly. For the 1st at midnight local time, calculate the UTC offset.

## Step 2: Run the Schedule Script
After enabling pg_cron, execute the following SQL in the Supabase SQL Editor:

```sql
-- Remove existing schedule if it exists (safe to run even if not scheduled)
SELECT cron.unschedule('reset-monthly-credits');

-- Schedule the monthly reset: add 1 credit to all agents on the 1st at 00:00 UTC
SELECT cron.schedule('reset-monthly-credits', '0 0 1 * *', 'SELECT public.reset_monthly_credits();');
```

## Step 3: Verify the Schedule
Run this query to confirm the job is scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'reset-monthly-credits';
```

## Alternative: Manual Reset (If pg_cron Not Available)
If you cannot enable pg_cron, run this manually on the 1st of each month:

```sql
SELECT public.reset_monthly_credits();
```

You can set up an external cron job (e.g., via GitHub Actions, AWS Lambda, or a server) to call a Supabase Edge Function that invokes the reset.

## Monitoring
- Check agent credits in the `agents` table.
- pg_cron logs can be viewed in Supabase logs under **Database** > **Logs**.

## Troubleshooting
- **Error: schema "cron" does not exist** - Enable pg_cron first.
- If the job fails, check Supabase logs for errors.
- Test the function manually: `SELECT public.reset_monthly_credits();` (it will add 1 credit; run `UPDATE agents SET credits = credits - 1 WHERE credits > 1;` to revert if needed).