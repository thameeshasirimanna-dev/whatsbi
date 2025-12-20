-- Function to reset monthly credits by adding 1 to each agent's credits
-- This replenishes the default monthly allowance while preserving any additional credits added by the agent
-- Usage: SELECT reset_monthly_credits();

CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS VOID AS $$
BEGIN
    UPDATE public.agents 
    SET credits = credits + 1.00;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reset_monthly_credits() TO service_role, authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.reset_monthly_credits IS 'Adds 1 credit to all agents monthly to reset default allowance while preserving added credits';