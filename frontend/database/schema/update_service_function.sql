-- Function to update service or service package data
-- Handles dynamic table names and partial updates including image_urls array operations

CREATE OR REPLACE FUNCTION update_service_data(
  p_agent_id BIGINT,
  p_table_type VARCHAR,  -- 'service' or 'package'
  p_id UUID,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_prefix TEXT;
  target_table TEXT;
  service_table TEXT;
  packages_table TEXT;
  existing_data RECORD;
  updated_image_urls JSONB;
  set_clause TEXT;
  full_query TEXT;
  result RECORD;
  key_text TEXT;
  value_text TEXT;
  col_data_type VARCHAR;
BEGIN
  -- Validate table type
  IF p_table_type NOT IN ('service', 'package') THEN
    RAISE EXCEPTION 'Invalid table_type: must be "service" or "package"';
  END IF;

  -- Get agent prefix (qualified to avoid ambiguity)
  SELECT agents.agent_prefix INTO agent_prefix
  FROM agents
  WHERE agents.id = p_agent_id;

  IF agent_prefix IS NULL THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;

  service_table := agent_prefix || '_services';
  packages_table := agent_prefix || '_service_packages';

  -- Fetch existing data for validation and image handling
  IF p_table_type = 'service' THEN
    EXECUTE format('SELECT * FROM %I WHERE id = $1 AND agent_id = $2 AND is_active = true', service_table)
    INTO existing_data
    USING p_id, p_agent_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service not found or inactive';
    END IF;

    target_table := service_table;

  ELSE  -- package
    EXECUTE format('
      SELECT sp.*, s.agent_id 
      FROM %I sp 
      JOIN %I s ON sp.service_id = s.id 
      WHERE sp.id = $1 AND sp.is_active = true AND s.agent_id = $2
    ', packages_table, service_table)
    INTO existing_data
    USING p_id, p_agent_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service package not found or inactive';
    END IF;

    target_table := packages_table;
  END IF;

  -- Handle image_urls updates if present (for services only)
  IF p_table_type = 'service' AND p_updates ? 'image_urls' THEN
    updated_image_urls := COALESCE(existing_data.image_urls, '[]'::jsonb);

    IF jsonb_typeof(updated_image_urls) = 'array' THEN
      -- Add new images
      IF p_updates->'image_urls' ? 'add' THEN
        updated_image_urls := updated_image_urls || (p_updates->'image_urls'->'add');
        p_updates := p_updates - 'image_urls';
        p_updates := p_updates || jsonb_build_object('image_urls', updated_image_urls);
      END IF;

      -- Remove images
      IF p_updates->'image_urls' ? 'remove' THEN
        SELECT jsonb_agg(value) INTO updated_image_urls
        FROM jsonb_array_elements(existing_data.image_urls) AS elem(value)
        WHERE value::text NOT IN (
          SELECT value::text FROM jsonb_array_elements(p_updates->'image_urls'->'remove') AS rem(value)
        );
        p_updates := p_updates - 'image_urls';
        p_updates := p_updates || jsonb_build_object('image_urls', COALESCE(updated_image_urls, '[]'::jsonb));
      END IF;
    END IF;
  END IF;

  -- Log inputs for debugging
  RAISE NOTICE 'DEBUG: Updating % in table: %, id: %, agent_id: %, updates: %', p_table_type, target_table, p_id, p_agent_id, p_updates;

  -- Build SET clause with escaped literals, handling JSONB with cast
  set_clause := '';
  FOR key_text, value_text IN
    SELECT key, value
    FROM jsonb_each_text(p_updates)
    WHERE key NOT IN ('id', 'agent_id', 'is_active', 'created_at')
  LOOP
    -- Get column data type
    SELECT data_type INTO col_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = target_table AND column_name = key_text;

    IF col_data_type IS NULL THEN
      RAISE EXCEPTION 'Column "%" does not exist in table %', key_text, target_table;
    END IF;

    IF col_data_type IN ('json', 'jsonb') THEN
      -- For JSON/JSONB, quote and cast to jsonb
      set_clause := set_clause || key_text || ' = ' || quote_nullable(value_text) || '::jsonb, ';
    ELSE
      -- For other types
      set_clause := set_clause || key_text || ' = ' || quote_nullable(value_text) || ', ';
    END IF;
  END LOOP;

  IF set_clause = '' THEN
    RAISE EXCEPTION 'No valid columns to update';
  END IF;

  set_clause := rtrim(set_clause, ', ');

  -- Generate full SQL with literals
  IF p_table_type = 'service' THEN
    full_query := format('
      UPDATE %I 
      SET %s, updated_at = now()
      WHERE id = %L AND agent_id = %L
      RETURNING *
    ', target_table, set_clause, p_id, p_agent_id);
  ELSE
    full_query := format('
      UPDATE %I 
      SET %s, updated_at = now()
      WHERE id = %L
      RETURNING *
    ', target_table, set_clause, p_id);
  END IF;

  RAISE NOTICE 'DEBUG: Generated UPDATE SQL with literals: %', full_query;

  -- Execute the literal SQL
  EXECUTE full_query
  INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Update failed: record not found';
  END IF;

  RETURN row_to_json(result);

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Update failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Grant execute permission conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION update_service_data(BIGINT, VARCHAR, UUID, JSONB) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION update_service_data(BIGINT, VARCHAR, UUID, JSONB) TO service_role;
  END IF;
END
$$;

COMMENT ON FUNCTION update_service_data IS 'Updates service or service package data partially, handles image_urls array add/remove for services';

-- Function to update a service and its associated packages in a transaction
CREATE OR REPLACE FUNCTION update_service_transaction(
  p_agent_id BIGINT,
  p_services_table TEXT,
  p_service_packages_table TEXT,
  p_service_id UUID,
  p_service_updates JSONB,
  p_packages JSONB DEFAULT NULL,          -- Array of packages to create or update
  p_removed_package_ids JSONB DEFAULT NULL -- Array of UUIDs of packages to delete
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  package_record JSONB;
  package_id UUID;
  package_name VARCHAR;
  price DECIMAL(10,2);
  currency VARCHAR(10);
  discount DECIMAL(5,2);
  package_description TEXT;
  service_update_result JSONB;
  pkg_insert_sql TEXT;
  removed_id TEXT;
  result JSONB := jsonb_build_object('service_id', p_service_id, 'packages', jsonb_build_array());
BEGIN
  -- 1. Update the service data using existing update_service_data function if valid keys are present
  IF p_service_updates IS NOT NULL AND (
     p_service_updates ? 'service_name' OR 
     p_service_updates ? 'description' OR 
     p_service_updates ? 'image_urls' OR 
     p_service_updates ? 'service_links'
  ) THEN
    service_update_result := update_service_data(p_agent_id, 'service', p_service_id, p_service_updates);
  END IF;

  -- 2. Handle removed packages
  IF p_removed_package_ids IS NOT NULL AND jsonb_typeof(p_removed_package_ids) = 'array' THEN
    FOR removed_id IN SELECT jsonb_array_elements_text(p_removed_package_ids)
    LOOP
      IF removed_id IS NOT NULL AND removed_id <> '' THEN
        EXECUTE format('
          DELETE FROM %I 
          WHERE id = $1 AND service_id = $2
        ', p_service_packages_table)
        USING removed_id::UUID, p_service_id;
      END IF;
    END LOOP;
  END IF;

  -- 3. Handle packages (create or update)
  IF p_packages IS NOT NULL AND jsonb_typeof(p_packages) = 'array' THEN
    FOR package_record IN SELECT jsonb_array_elements(p_packages)
    LOOP
      -- Check if package has an ID and it's not empty/null
      IF package_record ? 'id' AND package_record->>'id' IS NOT NULL AND package_record->>'id' <> '' THEN
        package_id := (package_record->>'id')::UUID;
        
        -- Call update_service_data for package
        PERFORM update_service_data(
          p_agent_id, 
          'package', 
          package_id, 
          (package_record - 'id' - 'service_id' - 'created_at' - 'updated_at' - 'is_active')
        );
      ELSE
        -- No ID, this is a new package
        package_name := package_record->>'package_name';
        price := (package_record->>'price')::DECIMAL(10,2);
        currency := COALESCE(package_record->>'currency', 'USD');
        discount := NULLIF((package_record->>'discount')::DECIMAL(5,2), 'NaN');
        package_description := package_record->>'description';

        IF package_name IS NOT NULL AND price IS NOT NULL THEN
          pkg_insert_sql := format('
            INSERT INTO %I (service_id, package_name, price, currency, discount, description, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE)
            RETURNING id
          ', p_service_packages_table);
          
          EXECUTE pkg_insert_sql
          INTO package_id
          USING p_service_id, package_name, price, currency, discount, package_description;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'service_id', p_service_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Update service transaction failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Grant execute permission conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION update_service_transaction(BIGINT, TEXT, TEXT, UUID, JSONB, JSONB, JSONB) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION update_service_transaction(BIGINT, TEXT, TEXT, UUID, JSONB, JSONB, JSONB) TO service_role;
  END IF;
END
$$;

COMMENT ON FUNCTION update_service_transaction IS 'Updates service metadata and handles bulk upserts and deletes of associated service packages in a transaction';