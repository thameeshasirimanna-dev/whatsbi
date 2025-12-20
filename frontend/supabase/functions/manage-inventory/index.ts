// DEPRECATED: Replaced by Node backend
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    console.log('Authenticated user id:', user.id)

    // Get agent information
    const { data: agentData, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, agent_prefix')
      .eq('user_id', user.id)
      .single()

    if (agentError || !agentData) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    const agentPrefix = agentData.agent_prefix
    console.log('Agent prefix:', agentPrefix)

    const method = req.method
    const url = new URL(req.url)

    let parsedBody = null;
    if (method === 'POST' || method === 'PUT') {
      try {
        parsedBody = await req.json();
      } catch (e) {
        console.error('JSON parse error:', e);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    }

    const type = url.searchParams.get('type') || (parsedBody ? parsedBody.type : null)

    switch (method) {
      case 'GET': {
        if (type === 'categories') {
          // Get categories
          const search = url.searchParams.get('search') || undefined
          const limit = parseInt(url.searchParams.get('limit') || '50')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          console.log('Categories fetch params:', { search, limit, offset, agentPrefix })

          // Call the get_categories function
          const { data: categories, error: getError } = await supabaseClient.rpc('get_categories', {
            p_agent_prefix: agentPrefix,
            p_search: search,
            p_limit: limit,
            p_offset: offset
          })

          if (getError) {
            console.error('get_categories RPC error:', JSON.stringify(getError))
            return new Response(
              JSON.stringify({ error: getError.message + ' - Details logged' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          return new Response(
            JSON.stringify({ categories }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )
        } else {
          // Original inventory items GET
          const category = url.searchParams.get('category') || undefined
          const search = url.searchParams.get('search') || undefined
          const limit = parseInt(url.searchParams.get('limit') || '50')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          console.log('Inventory fetch params:', { category, search, limit, offset, agentPrefix })
          console.log('Calling get_inventory_items RPC with params:', {
            p_agent_prefix: agentPrefix,
            p_category_filter: category,
            p_search: search,
            p_limit: limit,
            p_offset: offset
          })

          // Call the get_inventory_items function
          const { data: items, error: getError } = await supabaseClient.rpc('get_inventory_items', {
            p_agent_prefix: agentPrefix,
            p_category_filter: category,
            p_search: search,
            p_limit: limit,
            p_offset: offset
          })

          console.log('RPC result items length:', items ? items.length : 'null')
          if (getError) {
            console.error('get_inventory_items RPC error:', JSON.stringify(getError))
            return new Response(
              JSON.stringify({ error: getError.message + ' - Details logged' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          return new Response(
            JSON.stringify({ items }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )
        }
      }

      case 'POST': {
        const body = parsedBody
        const { name, quantity, price, category_id, description, sku, image_urls, color } = body || {}

        if (type === 'category') {
          // Create category
          if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
            return new Response(
              JSON.stringify({ error: 'Category name is required and must be 1-50 characters' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          if (name.trim().match(/[^a-zA-Z0-9 ]/) !== null) {
            return new Response(
              JSON.stringify({ error: 'Category name must be alphanumeric with spaces' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          if (color && !color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
            return new Response(
              JSON.stringify({ error: 'Invalid color format (use hex #RRGGBB or #RGB)' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          console.log('Calling create_category RPC with params:', {
            p_agent_prefix: agentPrefix,
            p_name: name.trim(),
            p_description: description || null,
            p_color: color || null
          })

          // Call the create_category function
          const { data: result, error: createError } = await supabaseClient.rpc('create_category', {
            p_agent_prefix: agentPrefix,
            p_name: name.trim(),
            p_description: description || null,
            p_color: color || null
          })

          if (createError) {
            console.error('create_category RPC error:', JSON.stringify(createError))
            return new Response(
              JSON.stringify({ error: createError.message }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          // RPC returns array, get first element
          const createResult = result && result.length > 0 ? result[0] : null;
          if (!createResult) {
            return new Response(
              JSON.stringify({ error: 'Unexpected RPC response: no data returned' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          return new Response(
            JSON.stringify({ success: createResult.success, category_id: createResult.category_id, message: createResult.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: createResult.success ? 201 : 400
            }
          )
        } else {
          // Original create inventory item
          // Validate required fields
          if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return new Response(
              JSON.stringify({ error: 'Item name is required' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
            return new Response(
              JSON.stringify({ error: 'Quantity must be a non-negative number' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          if (price !== undefined && (typeof price !== 'number' || price < 0)) {
            return new Response(
              JSON.stringify({ error: 'Price must be a non-negative number' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          if (category_id !== undefined && (typeof category_id !== 'number' || category_id < 1)) {
            return new Response(
              JSON.stringify({ error: 'Category ID must be a positive integer' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          console.log('Calling create_inventory_item RPC with params:', {
            p_agent_prefix: agentPrefix,
            p_name: name.trim(),
            p_quantity: quantity || 0,
            p_price: price || 0,
            p_category_id: category_id || null,
            p_description: description || null,
            p_sku: sku || null,
            p_image_urls: image_urls || null
          })

          // Call the create_inventory_item function
          const { data: result, error: createError } = await supabaseClient.rpc('create_inventory_item', {
            p_agent_prefix: agentPrefix,
            p_name: name.trim(),
            p_quantity: quantity || 0,
            p_price: price || 0,
            p_category_id: category_id || null,
            p_description: description || null,
            p_sku: sku || null,
            p_image_urls: image_urls || null
          })

          console.log('create_inventory_item RPC result:', { data: result, error: createError })
          if (createError) {
            console.error('create_inventory_item RPC detailed error:', JSON.stringify(createError))
          }

          if (createError) {
            console.error('Create inventory item failed:', {
              error: createError,
              message: createError.message,
              details: createError.details,
              hint: createError.hint,
              code: createError.code
            })
            return new Response(
              JSON.stringify({ error: createError.message }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          // RPC returns array, get first element
          const createResult = result && result.length > 0 ? result[0] : null;
          if (!createResult) {
            return new Response(
              JSON.stringify({ error: 'Unexpected RPC response: no data returned' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          return new Response(
            JSON.stringify({ success: createResult.success, item_id: createResult.item_id, message: createResult.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: createResult.success ? 201 : 400
            }
          )
        }
      }

      case 'PUT': {
        const body = parsedBody
        const type = body.type || url.searchParams.get('type')

        if (type === 'category') {
          // Update category
          const { id, name, description, color } = body || {}

          if (!id || typeof id !== 'number' || id < 1) {
            return new Response(
              JSON.stringify({ error: 'Category ID is required and must be a positive integer' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          // Validate name if provided
          if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
              return new Response(
                JSON.stringify({ error: 'Category name must be 1-50 characters' }),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 400
                }
              )
            }

            if (name.trim().match(/[^a-zA-Z0-9 ]/) !== null) {
              return new Response(
                JSON.stringify({ error: 'Category name must be alphanumeric with spaces' }),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 400
                }
              )
            }
          }

          // Validate color if provided
          if (color !== undefined && color && !color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
            return new Response(
              JSON.stringify({ error: 'Invalid color format (use hex #RRGGBB or #RGB)' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          console.log('Calling update_category RPC with params:', {
            p_agent_prefix: agentPrefix,
            p_category_id: id,
            p_name: name ? name.trim() : null,
            p_description: description || null,
            p_color: color || null
          })

          // Call the update_category function
          const { data: result, error: updateError } = await supabaseClient.rpc('update_category', {
            p_agent_prefix: agentPrefix,
            p_category_id: id,
            p_name: name ? name.trim() : null,
            p_description: description || null,
            p_color: color || null
          })

          if (updateError) {
            console.error('update_category RPC error:', JSON.stringify(updateError))
            return new Response(
              JSON.stringify({ error: updateError.message }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          // RPC returns array, get first element
          const updateResult = result && result.length > 0 ? result[0] : null;
          if (!updateResult) {
            return new Response(
              JSON.stringify({ error: 'Unexpected RPC response: no data returned' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          return new Response(
            JSON.stringify({ success: updateResult.success, message: updateResult.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: updateResult.success ? 200 : 400
            }
          )
        } else {
          // Update inventory item
          const { id, name, quantity, price, category, description, sku, image_urls, removed_image_urls } = body || {}

          if (!id || typeof id !== 'number') {
            return new Response(
              JSON.stringify({ error: 'Item ID is required' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          // Validate optional fields
          if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
            return new Response(
              JSON.stringify({ error: 'Quantity must be a non-negative number' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          if (price !== undefined && (typeof price !== 'number' || price < 0)) {
            return new Response(
              JSON.stringify({ error: 'Price must be a non-negative number' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          if (category !== undefined && (typeof category !== 'number' || category < 1)) {
            return new Response(
              JSON.stringify({ error: 'Category ID must be a positive integer' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }

          // Handle image deletions from storage if provided
          if (removed_image_urls && Array.isArray(removed_image_urls) && removed_image_urls.length > 0) {
            console.log('Starting image deletion for removed_image_urls:', removed_image_urls.length, 'images');
            for (const url of removed_image_urls) {
              console.log('Processing URL for deletion:', url);
              if (typeof url === 'string' && url.includes('supabase.co/storage')) {
                try {
                  const pathname = new URL(url).pathname;
                  console.log('URL pathname:', pathname);
                  const parts = pathname.split('/').slice(5); // After ['', 'storage', 'v1', 'object', 'public']
                  console.log('Parsed parts:', parts);
                  if (parts.length > 1 && parts[0] === 'inventory-images') {
                    const filePath = parts.slice(1).join('/');
                    console.log('Constructed filePath:', filePath);
                    if (filePath) {
                      const { error: deleteError } = await supabaseClient.storage
                        .from('inventory-images')
                        .remove([filePath]);
                      if (deleteError) {
                        console.error('Failed to delete image from storage:', deleteError, 'Path:', filePath);
                        // Continue with update even if delete fails, but log error
                      } else {
                        console.log('Successfully deleted image from storage:', filePath);
                      }
                    } else {
                      console.log('No filePath constructed for URL:', url);
                    }
                  } else {
                    console.error('Invalid URL format for deletion (wrong bucket or structure):', url, 'parts[0]:', parts[0]);
                  }
                } catch (err) {
                  console.error('Error processing URL for deletion:', err, 'URL:', url);
                }
              } else {
                console.log('Skipping non-storage URL or invalid type:', typeof url, url ? url.includes('supabase.co/storage') : 'no url');
              }
            }
            console.log('Finished processing removed_image_urls');
          } else {
            console.log('No removed_image_urls provided or invalid format');
          }

          // Call the update_inventory_item function
          const updateParams: any = {
              p_agent_prefix: agentPrefix,
              p_item_id: id,
              p_name: name || null,
              p_quantity: quantity !== undefined ? quantity : null,
              p_price: price !== undefined ? price : null,
              p_category_id: category || null,
              p_description: description || null,
              p_sku: sku || null,
              p_image_urls: image_urls || null
          }

          const { data: result, error: updateError } = await supabaseClient.rpc('update_inventory_item', updateParams)

          if (updateError) {
            return new Response(
              JSON.stringify({ error: updateError.message }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          // RPC returns array, get first element
          const updateResult = result && result.length > 0 ? result[0] : null;
          if (!updateResult) {
            return new Response(
              JSON.stringify({ error: 'Unexpected RPC response: no data returned' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          return new Response(
            JSON.stringify({ success: updateResult.success, message: updateResult.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: updateResult.success ? 200 : 400
            }
          )
        }
      }

      case 'DELETE': {
        const url = new URL(req.url)
        const type = url.searchParams.get('type')
        const id = url.searchParams.get('id')

        if (!id || typeof id !== 'string' || !id.match(/^\d+$/)) {
          return new Response(
            JSON.stringify({ error: 'Valid ID is required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        const entityId = parseInt(id)

        if (type === 'category') {
          // Delete category
          const { data: result, error: deleteError } = await supabaseClient.rpc('delete_category', {
            p_agent_prefix: agentPrefix,
            p_category_id: entityId
          })

          if (deleteError) {
            console.error('delete_category RPC error:', JSON.stringify(deleteError))
            return new Response(
              JSON.stringify({ error: deleteError.message }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          // RPC returns array, get first element
          const deleteResult = result && result.length > 0 ? result[0] : null;
          if (!deleteResult) {
            return new Response(
              JSON.stringify({ error: 'Unexpected RPC response: no data returned' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
          }

          return new Response(
            JSON.stringify({ success: deleteResult.success, message: deleteResult.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: deleteResult.success ? 200 : 400
            }
          )
        } else {
          // Original item delete
          const itemId = entityId

        // Get current item images for cleanup
        console.log('Starting item deletion - fetching current images for cleanup, itemId:', itemId, 'agent_id:', agentData.id);
        if (agentData.id) {
          const { data: currentItemData, error: queryError } = await supabaseClient
            .from(`${agentPrefix}_inventory_items`)
            .select('image_urls')
            .eq('id', itemId)
            .eq('agent_id', agentData.id)
            .single();

          if (queryError) {
            console.error('Failed to fetch current item data for deletion:', queryError);
          } else {
            console.log('Current item data fetched:', currentItemData ? 'success' : 'no data');
            console.log('Image URLs from DB:', currentItemData ? currentItemData.image_urls : 'null');
          }

          if (currentItemData && currentItemData.image_urls && Array.isArray(currentItemData.image_urls)) {
            const imageUrls = currentItemData.image_urls as string[];
            console.log('Found', imageUrls.length, 'image URLs to delete on item deletion');
            for (const url of imageUrls) {
              console.log('Processing URL for deletion on item delete:', url);
              if (typeof url === 'string' && url.includes('supabase.co/storage')) {
                try {
                  const pathname = new URL(url).pathname;
                  console.log('URL pathname for item delete:', pathname);
                  const parts = pathname.split('/').slice(5); // After ['', 'storage', 'v1', 'object', 'public']
                  console.log('Parsed parts for item delete:', parts);
                  if (parts.length > 1 && parts[0] === 'inventory-images') {
                    const filePath = parts.slice(1).join('/');
                    console.log('Constructed filePath for item delete:', filePath);
                    if (filePath) {
                      const { error: deleteError } = await supabaseClient.storage
                        .from('inventory-images')
                        .remove([filePath]);
                      if (deleteError) {
                        console.error('Failed to delete image on item delete:', deleteError, 'Path:', filePath);
                      } else {
                        console.log('Successfully deleted image on item delete:', filePath);
                      }
                    } else {
                      console.log('No filePath constructed for URL on item delete:', url);
                    }
                  } else {
                    console.error('Invalid URL format for deletion on item delete (wrong bucket or structure):', url, 'parts[0]:', parts ? parts[0] : 'no parts');
                  }
                } catch (err) {
                  console.error('Error processing URL for deletion on item delete:', err, 'URL:', url);
                }
              } else {
                console.log('Skipping non-storage URL or invalid type on item delete:', typeof url, url ? url.includes('supabase.co/storage') : 'no url');
              }
            }
            console.log('Finished processing image deletions on item delete');
          } else {
            console.log('No valid image_urls found for deletion on item delete');
          }
        } else {
          console.log('No agentData.id available for querying item images');
        }

        // Call the delete_inventory_item function
        const { data: result, error: deleteError } = await supabaseClient.rpc('delete_inventory_item', {
          p_agent_prefix: agentPrefix,
          p_item_id: itemId
        })

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        // RPC returns array, get first element
        const deleteResult = result && result.length > 0 ? result[0] : null;
        if (!deleteResult) {
          return new Response(
            JSON.stringify({ error: 'Unexpected RPC response: no data returned' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        return new Response(
          JSON.stringify({ success: deleteResult.success, message: deleteResult.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: deleteResult.success ? 200 : 404
          }
        )
      }
    }

    default: {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405
          }
        )
      }
    }
  } catch (error) {
    console.error('Inventory management error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})