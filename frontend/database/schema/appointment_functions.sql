-- Appointment Management Functions
-- Handles CRUD operations for appointments
-- Run after appointments table is created via dynamic_table_creation.sql

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS create_appointment(TEXT, INTEGER, TEXT, TIMESTAMPTZ, INTEGER, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_appointment(TEXT, INTEGER, TEXT, TIMESTAMPTZ, INTEGER, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS delete_appointment(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_appointments(TEXT, INTEGER, VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) CASCADE;

-- Function to create a new appointment
CREATE OR REPLACE FUNCTION create_appointment(
    p_agent_prefix TEXT,
    p_customer_id INTEGER,
    p_title TEXT,
    p_appointment_date TIMESTAMPTZ,
    p_duration_minutes INTEGER DEFAULT 30,
    p_status VARCHAR DEFAULT 'pending',
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    appointment_id INTEGER,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    appointments_table TEXT := p_agent_prefix || '_appointments';
    customers_table TEXT := p_agent_prefix || '_customers';
    agent_id_val BIGINT;
    customer_exists INTEGER;
    new_appointment_id INTEGER;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Unauthorized: Agent not found';
        RETURN;
    END IF;

    -- Validate customer_id
    EXECUTE format('SELECT 1 FROM %I WHERE id = $1 AND agent_id = $2', customers_table)
    INTO customer_exists
    USING p_customer_id, agent_id_val;

    IF customer_exists IS NULL THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Customer not found or access denied';
        RETURN;
    END IF;

    -- Validate inputs
    IF LENGTH(TRIM(p_title)) = 0 OR LENGTH(TRIM(p_title)) > 100 THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Title must be 1-100 characters';
        RETURN;
    END IF;

    IF p_appointment_date IS NULL OR p_appointment_date < now() THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Appointment date must be in the future';
        RETURN;
    END IF;

    IF p_duration_minutes <= 0 OR p_duration_minutes > 1440 THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Duration must be between 1 and 1440 minutes';
        RETURN;
    END IF;

    IF p_status NOT IN ('pending', 'confirmed', 'completed', 'cancelled') THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Invalid status';
        RETURN;
    END IF;

    -- Insert the appointment
    EXECUTE format('
        INSERT INTO %I (customer_id, title, appointment_date, duration_minutes, status, notes, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING id
    ', appointments_table)
    INTO new_appointment_id
    USING p_customer_id, p_title, p_appointment_date, p_duration_minutes, p_status, p_notes;

    RETURN QUERY SELECT new_appointment_id, true, 'Appointment created successfully';
END;
$$;

-- Function to update an existing appointment
CREATE OR REPLACE FUNCTION update_appointment(
    p_agent_prefix TEXT,
    p_appointment_id INTEGER,
    p_title TEXT DEFAULT NULL,
    p_appointment_date TIMESTAMPTZ DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    appointments_table TEXT := p_agent_prefix || '_appointments';
    customers_table TEXT := p_agent_prefix || '_customers';
    agent_id_val BIGINT;
    appointment_exists INTEGER;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN QUERY SELECT false, 'Unauthorized: Agent not found';
        RETURN;
    END IF;

    -- Check if appointment exists and belongs to agent's customer
    EXECUTE format('
        SELECT 1 FROM %I ap
        JOIN %I c ON c.id = ap.customer_id
        WHERE ap.id = $1 AND c.agent_id = $2
    ', appointments_table, customers_table)
    INTO appointment_exists
    USING p_appointment_id, agent_id_val;

    IF appointment_exists IS NULL THEN
        RETURN QUERY SELECT false, 'Appointment not found or access denied';
        RETURN;
    END IF;

    -- Validate inputs if provided
    IF p_title IS NOT NULL AND (LENGTH(TRIM(p_title)) = 0 OR LENGTH(TRIM(p_title)) > 100) THEN
        RETURN QUERY SELECT false, 'Title must be 1-100 characters';
        RETURN;
    END IF;

    IF p_appointment_date IS NOT NULL AND p_appointment_date < now() THEN
        RETURN QUERY SELECT false, 'Appointment date must be in the future';
        RETURN;
    END IF;

    IF p_duration_minutes IS NOT NULL AND (p_duration_minutes <= 0 OR p_duration_minutes > 1440) THEN
        RETURN QUERY SELECT false, 'Duration must be between 1 and 1440 minutes';
        RETURN;
    END IF;

    IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'confirmed', 'completed', 'cancelled') THEN
        RETURN QUERY SELECT false, 'Invalid status';
        RETURN;
    END IF;

    -- Build dynamic update query
    EXECUTE format('
        UPDATE %I SET
            title = COALESCE($1, title),
            appointment_date = COALESCE($2, appointment_date),
            duration_minutes = COALESCE($3, duration_minutes),
            status = COALESCE($4, status),
            notes = COALESCE($5, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
    ', appointments_table)
    USING p_title, p_appointment_date, p_duration_minutes, p_status, p_notes, p_appointment_id;

    RETURN QUERY SELECT true, 'Appointment updated successfully';
END;
$$;

-- Function to delete an appointment
CREATE OR REPLACE FUNCTION delete_appointment(
    p_agent_prefix TEXT,
    p_appointment_id INTEGER
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    appointments_table TEXT := p_agent_prefix || '_appointments';
    customers_table TEXT := p_agent_prefix || '_customers';
    agent_id_val BIGINT;
    appointment_exists INTEGER;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN QUERY SELECT false, 'Unauthorized: Agent not found';
        RETURN;
    END IF;

    -- Check if appointment exists and belongs to agent's customer
    EXECUTE format('
        SELECT 1 FROM %I ap
        JOIN %I c ON c.id = ap.customer_id
        WHERE ap.id = $1 AND c.agent_id = $2
    ', appointments_table, customers_table)
    INTO appointment_exists
    USING p_appointment_id, agent_id_val;

    IF appointment_exists IS NULL THEN
        RETURN QUERY SELECT false, 'Appointment not found or access denied';
        RETURN;
    END IF;

    -- Delete the appointment
    EXECUTE format('DELETE FROM %I WHERE id = $1', appointments_table)
    USING p_appointment_id;

    RETURN QUERY SELECT true, 'Appointment deleted successfully';
END;
$$;

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_appointment(TEXT, INTEGER, TEXT, TIMESTAMPTZ, INTEGER, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_appointment(TEXT, INTEGER, TEXT, TIMESTAMPTZ, INTEGER, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_appointment(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_appointments(TEXT, INTEGER, VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION create_appointment IS 'Creates a new appointment for the authenticated agent''s customer';
COMMENT ON FUNCTION update_appointment IS 'Updates an existing appointment for the authenticated agent''s customer';
COMMENT ON FUNCTION delete_appointment IS 'Deletes an appointment owned by the authenticated agent';
COMMENT ON FUNCTION get_appointments IS 'Retrieves appointments for the authenticated agent with optional filtering and customer info';