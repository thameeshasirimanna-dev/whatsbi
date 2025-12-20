-- Fix get_appointments function to properly handle dynamic parameters
-- This resolves the "there is no parameter $4" error when filtering by customer

-- Function to get appointments with customer info
CREATE OR REPLACE FUNCTION get_appointments(
    p_agent_prefix TEXT,
    p_customer_id INTEGER DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    appointment_date TIMESTAMPTZ,
    duration_minutes INTEGER,
    status VARCHAR,
    notes TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    appointments_table TEXT := p_agent_prefix || '_appointments';
    customers_table TEXT := p_agent_prefix || '_customers';
    agent_id_val BIGINT;
    execute_query TEXT;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN;
    END IF;

    -- Base query with JOIN to customers
    execute_query := format('
        SELECT ap.id, ap.title, ap.appointment_date, ap.duration_minutes, ap.status, ap.notes,
               c.name as customer_name, c.phone as customer_phone,
               ap.created_at, ap.updated_at
        FROM %I ap
        JOIN %I c ON c.id = ap.customer_id
        WHERE c.agent_id = $1
    ', appointments_table, customers_table);

    -- Add filters
    IF p_customer_id IS NOT NULL THEN
        execute_query := execute_query || ' AND ap.customer_id = $2';
    END IF;

    IF p_status IS NOT NULL AND LENGTH(TRIM(p_status)) > 0 THEN
        execute_query := execute_query || ' AND LOWER(ap.status) = LOWER($3)';
    END IF;

    IF p_start_date IS NOT NULL THEN
        execute_query := execute_query || ' AND ap.appointment_date >= $4';
    END IF;

    IF p_end_date IS NOT NULL THEN
        execute_query := execute_query || ' AND ap.appointment_date <= $5';
    END IF;

    -- Add ORDER BY, LIMIT, OFFSET
    execute_query := execute_query || ' ORDER BY ap.appointment_date ASC LIMIT $6 OFFSET $7';

    -- Execute with all possible parameters (NULL values will be ignored in conditions)
    RETURN QUERY EXECUTE execute_query USING agent_id_val, p_customer_id, p_status, p_start_date, p_end_date, p_limit, p_offset;
END;
$$;