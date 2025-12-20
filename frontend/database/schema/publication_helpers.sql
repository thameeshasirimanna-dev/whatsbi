-- Helper function to add a table to supabase_realtime publication if it doesn't exist
CREATE OR REPLACE FUNCTION add_to_publication_if_not_exists(p_table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = p_table_name
    ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', p_table_name);
        RAISE NOTICE 'Added table % to publication', p_table_name;
    ELSE
        RAISE NOTICE 'Table % already in publication', p_table_name;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION add_to_publication_if_not_exists(TEXT) TO service_role, authenticated;

COMMENT ON FUNCTION add_to_publication_if_not_exists IS 'Adds a table to supabase_realtime publication if it does not already exist';