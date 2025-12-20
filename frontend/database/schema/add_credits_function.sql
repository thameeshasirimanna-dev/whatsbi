-- Function to add credits to an agent atomically
-- Usage: SELECT add_credits(agent_id, amount);

CREATE OR REPLACE FUNCTION public.add_credits(
  p_agent_id UUID,
  p_amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  new_credits NUMERIC;
BEGIN
  -- Validate agent exists
  IF NOT EXISTS (SELECT 1 FROM public.agents WHERE id = p_agent_id) THEN
    RAISE EXCEPTION 'Agent with id % not found', p_agent_id;
  END IF;

  -- Update credits
  UPDATE public.agents 
  SET credits = credits + p_amount 
  WHERE id = p_agent_id;

  -- Get updated credits
  SELECT credits INTO new_credits 
  FROM public.agents 
  WHERE id = p_agent_id;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;