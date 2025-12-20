-- Function to deduct credits from an agent atomically
-- Usage: SELECT deduct_credits(agent_id, amount);
-- Returns new credits if successful, NULL if insufficient credits

CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_agent_id BIGINT,
  p_amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  current_credits NUMERIC;
  new_credits NUMERIC;
BEGIN
  -- Validate agent exists
  IF NOT EXISTS (SELECT 1 FROM public.agents WHERE id = p_agent_id) THEN
    RAISE EXCEPTION 'Agent with id % not found', p_agent_id;
  END IF;

  -- Get current credits
  SELECT credits INTO current_credits 
  FROM public.agents 
  WHERE id = p_agent_id;

  -- Check if sufficient credits
  IF current_credits < p_amount THEN
    RETURN NULL; -- Insufficient credits
  END IF;

  -- Update credits
  UPDATE public.agents 
  SET credits = credits - p_amount 
  WHERE id = p_agent_id;

  -- Get updated credits
  SELECT credits INTO new_credits 
  FROM public.agents 
  WHERE id = p_agent_id;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
