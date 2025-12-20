-- Service Management Functions
-- These functions handle CRUD operations for dynamic services and service_packages tables

-- Function for creating service and packages in a transaction
CREATE OR REPLACE FUNCTION create_service_transaction(
  p_agent_id BIGINT,
  p_services_table TEXT,
  p_service_packages_table TEXT,
  p_service_name VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_image_urls JSONB DEFAULT NULL,
  p_packages JSONB DEFAULT NULL  -- Array of {package_name, price, currency, discount, description}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_id UUID;
  package_record JSONB;
  package_name VARCHAR;
  price DECIMAL(10,2);
  currency VARCHAR(10) := 'USD';
  discount DECIMAL(5,2);
  package_description TEXT;
  result JSONB := jsonb_build_object('service_id', NULL, 'packages', jsonb_build_array());
  services_table_exists BOOLEAN;
  service_insert_sql TEXT;
BEGIN
  -- Start transaction (implicit in function, but ensure atomicity)
  
  -- Check if services table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_services_table
  ) INTO services_table_exists;
  
  IF NOT services_table_exists THEN
    RAISE EXCEPTION 'Services table % does not exist', p_services_table;
  END IF;
  
  -- Log inputs for debugging
  RAISE NOTICE 'DEBUG: Creating service in table: %, agent_id: %, service_name: %', p_services_table, p_agent_id, p_service_name;
  
  -- Generate and log SQL for service insert
  service_insert_sql := format('
    INSERT INTO %I (agent_id, service_name, description, image_urls, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
  ', p_services_table);
  
  RAISE NOTICE 'DEBUG: Generated service INSERT SQL: %', service_insert_sql;
  
  -- Insert service
  EXECUTE service_insert_sql
  INTO service_id
  USING p_agent_id, p_service_name, p_description, p_image_urls;

  IF service_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create service';
  END IF;

  -- Check if service_packages table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_service_packages_table
  ) INTO services_table_exists;  -- Reuse variable name for simplicity
  
  IF NOT services_table_exists THEN
    RAISE EXCEPTION 'Service packages table % does not exist', p_service_packages_table;
  END IF;
  
  RAISE NOTICE 'DEBUG: Service packages table exists: true, service_id: %', service_id;
  
  -- Insert packages
  IF p_packages IS NOT NULL THEN
    FOR package_record IN SELECT jsonb_array_elements(p_packages)
    LOOP
      package_name := package_record->>'package_name';
      price := (package_record->>'price')::DECIMAL(10,2);
      currency := COALESCE(package_record->>'currency', 'USD');
      discount := NULLIF((package_record->>'discount')::DECIMAL(5,2), 'NaN');
      package_description := package_record->>'description';

      IF package_name IS NOT NULL AND price IS NOT NULL THEN
        -- Generate and log SQL for package insert
        service_insert_sql := format('
          INSERT INTO %I (service_id, package_name, price, currency, discount, description, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE)
          RETURNING id
        ', p_service_packages_table);
        
        RAISE NOTICE 'DEBUG: Generated package INSERT SQL: %', service_insert_sql;
        RAISE NOTICE 'DEBUG: Inserting package: % (price: %)', package_name, price;
        
        EXECUTE service_insert_sql
        USING service_id, package_name, price, currency, discount, package_description;

        -- Append to result
        result := jsonb_set(result, '{packages}', result->'packages' || jsonb_build_array(package_record));
      END IF;
    END LOOP;
  END IF;

  result := jsonb_set(result, '{service_id}', to_jsonb(service_id));
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic
    RAISE NOTICE 'Transaction failed: % (SQLSTATE: %, Context: %)', SQLERRM, SQLSTATE, pg_exception_context();
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_service_transaction(BIGINT, TEXT, TEXT, VARCHAR, TEXT, JSONB, JSONB) TO authenticated, service_role;

COMMENT ON FUNCTION create_service_transaction IS 'Creates a service and its packages in a transaction for dynamic agent tables';