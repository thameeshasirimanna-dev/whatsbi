-- Inventory Management Functions
-- Handles CRUD operations for inventory items
-- Run after inventory table is created

-- Drop existing functions to avoid conflicts - specify all known signatures
DROP FUNCTION IF EXISTS create_inventory_item(TEXT, TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_inventory_item(TEXT, TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_inventory_item(TEXT, INTEGER, TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_inventory_item(TEXT, INTEGER, TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS delete_inventory_item(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_inventory_items(TEXT, TEXT, TEXT, INTEGER, INTEGER) CASCADE;

-- Drop category functions if exist
DROP FUNCTION IF EXISTS create_category(TEXT, TEXT, TEXT, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_category(TEXT, INTEGER, TEXT, TEXT, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS delete_category(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_categories(TEXT, TEXT, INTEGER, INTEGER) CASCADE;

-- Function to create a new inventory item
CREATE OR REPLACE FUNCTION create_inventory_item(
    p_agent_prefix TEXT,
    p_name TEXT,
    p_quantity INTEGER,
    p_price NUMERIC,
    p_category_id INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_sku TEXT DEFAULT NULL,
    p_image_urls JSONB DEFAULT NULL
)
RETURNS TABLE (
    item_id INTEGER,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inventory_table TEXT := p_agent_prefix || '_inventory_items';
    categories_table TEXT := p_agent_prefix || '_categories';
    agent_id_val BIGINT;
    new_item_id INTEGER;
    category_exists INTEGER;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Unauthorized: Agent not found';
        RETURN;
    END IF;

    -- Validate inputs
    IF LENGTH(TRIM(p_name)) = 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Item name cannot be empty';
        RETURN;
    END IF;

    IF p_quantity < 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Quantity cannot be negative';
        RETURN;
    END IF;

    IF p_price < 0 THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Price cannot be negative';
        RETURN;
    END IF;

    -- Validate category_id if provided
    IF p_category_id IS NOT NULL THEN
        EXECUTE format('SELECT 1 FROM %I WHERE id = $1', categories_table)
        INTO category_exists
        USING p_category_id;
        IF category_exists IS NULL THEN
            RETURN QUERY SELECT NULL::INTEGER, false, 'Invalid category ID';
            RETURN;
        END IF;
    END IF;

    -- Insert the item
    EXECUTE format('
        INSERT INTO %I (agent_id, name, quantity, price, category_id, description, sku, image_urls, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING id
    ', inventory_table)
    INTO new_item_id
    USING agent_id_val, p_name, p_quantity, p_price, p_category_id, p_description, p_sku, p_image_urls;

    RETURN QUERY SELECT new_item_id, true, 'Inventory item created successfully';
END;
$$;

-- Function to update an existing inventory item
CREATE OR REPLACE FUNCTION update_inventory_item(
    p_agent_prefix TEXT,
    p_item_id INTEGER,
    p_name TEXT DEFAULT NULL,
    p_quantity INTEGER DEFAULT NULL,
    p_price NUMERIC DEFAULT NULL,
    p_category_id INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_sku TEXT DEFAULT NULL,
    p_image_urls JSONB DEFAULT NULL
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
    inventory_table TEXT := p_agent_prefix || '_inventory_items';
    categories_table TEXT := p_agent_prefix || '_categories';
    agent_id_val BIGINT;
    item_exists INTEGER;
    category_exists INTEGER;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN QUERY SELECT false, 'Unauthorized: Agent not found';
        RETURN;
    END IF;

    -- Check if item exists and belongs to agent
    EXECUTE format('SELECT 1 FROM %I WHERE id = $1 AND agent_id = $2', inventory_table)
    INTO item_exists
    USING p_item_id, agent_id_val;

    IF item_exists IS NULL THEN
        RETURN QUERY SELECT false, 'Item not found or access denied';
        RETURN;
    END IF;

    -- Validate inputs
    IF p_quantity IS NOT NULL AND p_quantity < 0 THEN
        RETURN QUERY SELECT false, 'Quantity cannot be negative';
        RETURN;
    END IF;

    IF p_price IS NOT NULL AND p_price < 0 THEN
        RETURN QUERY SELECT false, 'Price cannot be negative';
        RETURN;
    END IF;

    -- Validate category_id if provided
    IF p_category_id IS NOT NULL THEN
        EXECUTE format('SELECT 1 FROM %I WHERE id = $1', categories_table)
        INTO category_exists
        USING p_category_id;
        IF category_exists IS NULL THEN
            RETURN QUERY SELECT false, 'Invalid category ID';
            RETURN;
        END IF;
    END IF;

    -- Build dynamic update query
    EXECUTE format('
        UPDATE %I SET
            name = COALESCE($1, name),
            quantity = COALESCE($2, quantity),
            price = COALESCE($3, price),
            category_id = COALESCE($4, category_id),
            description = COALESCE($5, description),
            sku = COALESCE($6, sku),
            image_urls = COALESCE($7, image_urls),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8 AND agent_id = $9
    ', inventory_table)
    USING p_name, p_quantity, p_price, p_category_id, p_description, p_sku, p_image_urls, p_item_id, agent_id_val;

    RETURN QUERY SELECT true, 'Inventory item updated successfully';
END;
$$;

-- Function to delete an inventory item
CREATE OR REPLACE FUNCTION delete_inventory_item(
    p_agent_prefix TEXT,
    p_item_id INTEGER
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
    inventory_table TEXT := p_agent_prefix || '_inventory_items';
    agent_id_val BIGINT;
    item_exists INTEGER;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN QUERY SELECT false, 'Unauthorized: Agent not found';
        RETURN;
    END IF;

    -- Check if item exists and belongs to agent
    EXECUTE format('SELECT 1 FROM %I WHERE id = $1 AND agent_id = $2', inventory_table)
    INTO item_exists
    USING p_item_id, agent_id_val;

    IF item_exists IS NULL THEN
        RETURN QUERY SELECT false, 'Item not found or access denied';
        RETURN;
    END IF;

    -- Delete the item
    EXECUTE format('DELETE FROM %I WHERE id = $1 AND agent_id = $2', inventory_table)
    USING p_item_id, agent_id_val;

    RETURN QUERY SELECT true, 'Inventory item deleted successfully';
END;
$$;

-- Fixed Function to get all inventory items for an agent with category join
CREATE OR REPLACE FUNCTION get_inventory_items(
    p_agent_prefix TEXT,
    p_category_filter TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    description TEXT,
    quantity INTEGER,
    price NUMERIC,
    category_name TEXT,
    sku VARCHAR(100),
    image_urls JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inventory_table TEXT := p_agent_prefix || '_inventory_items';
    categories_table TEXT := p_agent_prefix || '_categories';
    agent_id_val BIGINT;
    execute_query TEXT;
    param_count INTEGER := 1;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN;
    END IF;

    -- Base query with LEFT JOIN to categories
    execute_query := format('
        SELECT i.id, i.name, i.description, i.quantity, i.price,
               COALESCE(c.name, NULL) as category_name, i.sku, i.image_urls, i.created_at, i.updated_at
        FROM %I i
        LEFT JOIN %I c ON i.category_id = c.id
        WHERE i.agent_id = $1
    ', inventory_table, categories_table);

    -- Add filters and count parameters
    IF p_category_filter IS NOT NULL AND LENGTH(TRIM(p_category_filter)) > 0 THEN
        execute_query := execute_query || ' AND LOWER(c.name) = LOWER($' || (param_count + 1) || ')';
        param_count := param_count + 1;
    END IF;

    IF p_search IS NOT NULL AND LENGTH(TRIM(p_search)) > 0 THEN
        execute_query := execute_query || ' AND (LOWER(i.name) LIKE LOWER($' || (param_count + 1) || ') OR LOWER(i.description) LIKE LOWER($' || (param_count + 1) || ') OR LOWER(i.sku) LIKE LOWER($' || (param_count + 1) || '))';
        param_count := param_count + 1;
    END IF;

    -- Add ORDER BY, LIMIT, OFFSET with correct parameter positions
    execute_query := execute_query || ' ORDER BY i.updated_at DESC LIMIT $' || (param_count + 1) || ' OFFSET $' || (param_count + 2);

    -- Execute the query with proper parameter binding
    IF p_category_filter IS NOT NULL AND p_search IS NOT NULL THEN
        RETURN QUERY EXECUTE execute_query USING agent_id_val, p_category_filter, '%' || p_search || '%', p_limit, p_offset;
    ELSIF p_category_filter IS NOT NULL THEN
        RETURN QUERY EXECUTE execute_query USING agent_id_val, p_category_filter, p_limit, p_offset;
    ELSIF p_search IS NOT NULL THEN
        RETURN QUERY EXECUTE execute_query USING agent_id_val, '%' || p_search || '%', p_limit, p_offset;
    ELSE
        RETURN QUERY EXECUTE execute_query USING agent_id_val, p_limit, p_offset;
    END IF;
END;
$$;

-- Function to create a new category
CREATE OR REPLACE FUNCTION create_category(
    p_agent_prefix TEXT,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_color VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    category_id INTEGER,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    categories_table TEXT := p_agent_prefix || '_categories';
    agent_id_val BIGINT;
    agent_role TEXT;
    new_category_id INTEGER;
    name_exists INTEGER;
BEGIN
    -- Get agent ID and role from auth
    SELECT a.id, u.role INTO agent_id_val, agent_role
    FROM agents a
    JOIN users u ON a.user_id = u.id
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Unauthorized: Agent not found';
        RETURN;
    END IF;

    -- Removed admin role check to allow agent owners to create categories

    -- Validate inputs
    IF LENGTH(TRIM(p_name)) = 0 OR LENGTH(TRIM(p_name)) > 50 THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Category name must be 1-50 characters';
        RETURN;
    END IF;

    IF p_name !~ '^[a-zA-Z0-9 ]+$' THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Category name must be alphanumeric with spaces';
        RETURN;
    END IF;

    IF p_color IS NOT NULL AND p_color !~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Invalid color format';
        RETURN;
    END IF;

    -- Check for duplicate name
    EXECUTE format('SELECT 1 FROM %I WHERE LOWER(name) = LOWER($1)', categories_table)
    INTO name_exists
    USING p_name;

    IF name_exists IS NOT NULL THEN
        RETURN QUERY SELECT NULL::INTEGER, false, 'Category name already exists';
        RETURN;
    END IF;

    -- Insert the category
    EXECUTE format('
        INSERT INTO %I (name, description, color, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING id
    ', categories_table)
    INTO new_category_id
    USING TRIM(p_name), p_description, p_color;

    RETURN QUERY SELECT new_category_id, true, 'Category created successfully';
END;
$$;

-- Function to update an existing category
CREATE OR REPLACE FUNCTION update_category(
    p_agent_prefix TEXT,
    p_category_id INTEGER,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_color VARCHAR DEFAULT NULL
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
    categories_table TEXT := p_agent_prefix || '_categories';
    agent_id_val BIGINT;
    category_exists INTEGER;
    name_exists INTEGER;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN QUERY SELECT false, 'Unauthorized: Agent not found';
        RETURN;
    END IF;

    -- Check if category exists
    EXECUTE format('SELECT 1 FROM %I WHERE id = $1', categories_table)
    INTO category_exists
    USING p_category_id;

    IF category_exists IS NULL THEN
        RETURN QUERY SELECT false, 'Category not found or access denied';
        RETURN;
    END IF;

    -- Validate name if provided
    IF p_name IS NOT NULL THEN
        IF LENGTH(TRIM(p_name)) = 0 OR LENGTH(TRIM(p_name)) > 50 THEN
            RETURN QUERY SELECT false, 'Category name must be 1-50 characters';
            RETURN;
        END IF;

        IF p_name !~ '^[a-zA-Z0-9 ]+$' THEN
            RETURN QUERY SELECT false, 'Category name must be alphanumeric with spaces';
            RETURN;
        END IF;

        -- Check for duplicate name (excluding current)
        EXECUTE format('SELECT 1 FROM %I WHERE LOWER(name) = LOWER($1) AND id != $2', categories_table)
        INTO name_exists
        USING p_name, p_category_id;

        IF name_exists IS NOT NULL THEN
            RETURN QUERY SELECT false, 'Category name already exists';
            RETURN;
        END IF;
    END IF;

    IF p_color IS NOT NULL AND p_color !~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' THEN
        RETURN QUERY SELECT false, 'Invalid color format';
        RETURN;
    END IF;

    -- Build dynamic update query
    EXECUTE format('
        UPDATE %I SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            color = COALESCE($3, color),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
    ', categories_table)
    USING p_name, p_description, p_color, p_category_id;

    RETURN QUERY SELECT true, 'Category updated successfully';
END;
$$;

-- Function to delete a category (prevent if items assigned)
CREATE OR REPLACE FUNCTION delete_category(
    p_agent_prefix TEXT,
    p_category_id INTEGER
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
    categories_table TEXT := p_agent_prefix || '_categories';
    inventory_table TEXT := p_agent_prefix || '_inventory_items';
    agent_id_val BIGINT;
    agent_role TEXT;
    category_exists INTEGER;
    item_count INTEGER;
BEGIN
    -- Get agent ID and role from auth
    SELECT a.id, u.role INTO agent_id_val, agent_role
    FROM agents a
    JOIN users u ON a.user_id = u.id
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN QUERY SELECT false, 'Unauthorized: Agent not found';
        RETURN;
    END IF;

    -- Removed admin role check to allow agent owners to delete categories

    -- Check if category exists
    EXECUTE format('SELECT 1 FROM %I WHERE id = $1', categories_table)
    INTO category_exists
    USING p_category_id;

    IF category_exists IS NULL THEN
        RETURN QUERY SELECT false, 'Category not found or access denied';
        RETURN;
    END IF;

    -- Check if any items are assigned to this category
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE category_id = $1 AND agent_id = $2', inventory_table)
    INTO item_count
    USING p_category_id, agent_id_val;

    IF item_count > 0 THEN
        RETURN QUERY SELECT false, 'Cannot delete category with assigned items. Reassign items first.';
        RETURN;
    END IF;

    -- Delete the category
    EXECUTE format('DELETE FROM %I WHERE id = $1', categories_table)
    USING p_category_id;

    RETURN QUERY SELECT true, 'Category deleted successfully';
END;
$$;

-- Function to get all categories for an agent with item count
CREATE OR REPLACE FUNCTION get_categories(
    p_agent_prefix TEXT,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    description TEXT,
    color VARCHAR,
    item_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    categories_table TEXT := p_agent_prefix || '_categories';
    inventory_table TEXT := p_agent_prefix || '_inventory_items';
    agent_id_val BIGINT;
    execute_query TEXT;
    param_count INTEGER := 1;
BEGIN
    -- Get agent ID from auth
    SELECT a.id INTO agent_id_val
    FROM agents a
    WHERE a.user_id = auth.uid();

    IF agent_id_val IS NULL THEN
        RETURN;
    END IF;

    -- Base query with LEFT JOIN to count items
    execute_query := format('
        SELECT c.id, c.name, c.description, c.color,
               COALESCE(ii_count.count::INTEGER, 0) as item_count,
               c.created_at, c.updated_at
        FROM %I c
        LEFT JOIN (SELECT category_id, COUNT(*)::INTEGER as count FROM %I WHERE agent_id = $1 GROUP BY category_id) ii_count ON c.id = ii_count.category_id
    ', categories_table, inventory_table);

    -- Add search filter
    IF p_search IS NOT NULL AND LENGTH(TRIM(p_search)) > 0 THEN
        execute_query := execute_query || ' AND LOWER(c.name) LIKE LOWER($' || (param_count + 1) || ')';
        param_count := param_count + 1;
    END IF;

    -- Add ORDER BY, LIMIT, OFFSET
    execute_query := execute_query || ' ORDER BY c.name ASC LIMIT $' || (param_count + 1) || ' OFFSET $' || (param_count + 2);

    -- Execute the query
    IF p_search IS NOT NULL THEN
        RETURN QUERY EXECUTE execute_query USING agent_id_val, '%' || p_search || '%', p_limit, p_offset;
    ELSE
        RETURN QUERY EXECUTE execute_query USING agent_id_val, p_limit, p_offset;
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_inventory_item(TEXT, TEXT, INTEGER, NUMERIC, INTEGER, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_inventory_item(TEXT, INTEGER, TEXT, INTEGER, NUMERIC, INTEGER, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_inventory_item(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_items(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_category(TEXT, TEXT, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_category(TEXT, INTEGER, TEXT, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_category(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_categories(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION create_inventory_item IS 'Creates a new inventory item for the authenticated agent';
COMMENT ON FUNCTION update_inventory_item IS 'Updates an existing inventory item for the authenticated agent';
COMMENT ON FUNCTION delete_inventory_item IS 'Deletes an inventory item owned by the authenticated agent';
COMMENT ON FUNCTION get_inventory_items IS 'Retrieves inventory items for the authenticated agent with optional filtering';
COMMENT ON FUNCTION create_category IS 'Creates a new category for the authenticated agent';
COMMENT ON FUNCTION update_category IS 'Updates an existing category for the authenticated agent';
COMMENT ON FUNCTION delete_category IS 'Deletes a category if no items are assigned';
COMMENT ON FUNCTION get_categories IS 'Retrieves categories for the authenticated agent with item counts';