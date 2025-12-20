// DEPRECATED: Replaced by Node backend
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with anon key for auth validation (service role for DB ops if needed later)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get authenticated user
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
    
    // Manual JWT payload decode for debugging (no signature verification, just inspect claims)
    let tokenPayload = null;
    let hasSupabaseClaims = false;
    let claimsContent = null;
    try {
      if (token) {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        tokenPayload = JSON.parse(decodedPayload);
        
        // Check for Supabase claims
        const claimKey = `https://${Deno.env.get('SUPABASE_URL')?.split('//')[1]}/auth/v1/claims`;
        claimsContent = tokenPayload[claimKey];
        hasSupabaseClaims = !!claimsContent;
      }
    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
    }

    // Try with service role key if anon key fails
    let { user, error: authError, data } = await supabase.auth.getUser(token);
    
    // FALLBACK: If Supabase claims are missing, validate directly using service role
    if (!user && tokenPayload && tokenPayload.sub && !hasSupabaseClaims) {
      
      // Validate token expiration manually since we can't rely on getUser()
      const tokenExpired = tokenPayload.exp && (tokenPayload.exp * 1000 < Date.now());
      if (tokenExpired) {
        return new Response(
          JSON.stringify({ status: 'error', message: 'Token expired' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      
      // Use service role client to validate user exists in auth system
      const serviceRoleSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      
      // Verify user exists in Supabase auth system using admin API
      const { data: authUser, error: authUserError } = await serviceRoleSupabase.auth.admin.getUserById(tokenPayload.sub);
        
      if (authUserError || !authUser?.user) {
        return new Response(
          JSON.stringify({ status: 'error', message: 'Invalid user token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      
      // Create a user-like object for consistency with existing code
      user = authUser.user;
      authError = null;
      
    } else if (!user && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      const serviceRoleSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      const serviceRoleResult = await serviceRoleSupabase.auth.getUser(token);
      
      if (serviceRoleResult.user) {
        user = serviceRoleResult.user;
        authError = serviceRoleResult.error;
      }
    }

    if (!user) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Get agent for the user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, agent_prefix')
      .eq('user_id', user.id)
      .single()

    if (agentError || !agent) {
      console.error('Agent fetch error:', agentError ? { message: agentError.message, code: agentError.code } : 'No agent found');
      return new Response(
        JSON.stringify({ status: 'error', message: 'Agent not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const agentId = agent.id
    const agentPrefix = agent.agent_prefix
    const servicesTable = `${agentPrefix}_services`
    const servicePackagesTable = `${agentPrefix}_service_packages`

        // Parse request body for all operations
        let body
        try {
          body = await req.json()
        } catch {
          return new Response(
            JSON.stringify({ status: 'error', message: 'Invalid JSON body' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        const { operation, ...opData } = body

        if (!operation || !['create', 'get', 'update', 'delete'].includes(operation)) {
          return new Response(
            JSON.stringify({ status: 'error', message: 'operation must be "create", "get", "update", or "delete"' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        switch (operation) {
          case 'create': {
            const { service_name, description, packages, images } = opData

            // Validation
            if (!service_name || typeof service_name !== 'string' || service_name.trim().length === 0) {
              return new Response(
                JSON.stringify({ status: 'error', message: 'service_name is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
              )
            }

            if (!Array.isArray(packages) || packages.length === 0) {
              return new Response(
                JSON.stringify({ status: 'error', message: 'packages array is required and must not be empty' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
              )
            }

            // Check for duplicate service_name
            const { data: existingService, error: checkError } = await supabase
              .from(servicesTable)
              .select('id')
              .eq('service_name', service_name.trim())
              .eq('agent_id', agentId)
              .single()

            if (checkError && checkError.code !== 'PGRST116') {
              console.error('Duplicate check error:', checkError)
              return new Response(
                JSON.stringify({ status: 'error', message: 'Error checking duplicate service' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
              )
            }

            if (existingService) {
              return new Response(
                JSON.stringify({ status: 'error', message: 'Service name already exists' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
              )
            }

            // Added logs: Validate inputs before RPC
            console.log('[DEBUG] RPC Inputs - Agent ID:', agentId);
            console.log('[DEBUG] RPC Inputs - Services Table:', servicesTable);
            console.log('[DEBUG] RPC Inputs - Packages Table:', servicePackagesTable);
            console.log('[DEBUG] RPC Inputs - Service Name:', service_name.trim());
            console.log('[DEBUG] RPC Inputs - Packages Array Length:', Array.isArray(packages) ? packages.length : 'Not array');
            if (packages && packages.length > 0) {
              console.log('[DEBUG] RPC Inputs - Sample Package:', packages[0]);
            }

            // Call transaction function without images first
            const { data: transactionData, error: txError } = await supabase.rpc('create_service_transaction', {
              p_agent_id: agentId,
              p_services_table: servicesTable,
              p_service_packages_table: servicePackagesTable,
              p_service_name: service_name.trim(),
              p_description: description || null,
              p_image_urls: null,
              p_packages: packages
            });

            // Enhanced error logging for RPC
            if (txError) {
              console.error('[DEBUG] RPC create_service_transaction Error:', {
                message: txError.message,
                code: txError.code,
                details: txError.details,
                hint: txError.hint,
                full: JSON.stringify(txError)
              });
              return new Response(
                JSON.stringify({ status: 'error', message: txError.message || 'Failed to create service', debug: txError.code }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
              );
            }

            // Log successful RPC result
            console.log('[DEBUG] RPC Success - Transaction Data:', transactionData);

            let finalData = transactionData;

            // Handle image upload after service creation if images provided
            if (images && Array.isArray(images) && images.length > 0) {
              const serviceRoleSupabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
              )

              const uploadedUrls: string[] = [];
              let uploadFailed = false;

              async function resizeImageToJpeg(bytes: Uint8Array, maxSizeBytes: number = 5 * 1024 * 1024): Promise<Uint8Array> {
                try {
                  if (bytes.length <= maxSizeBytes) {
                    console.log(`Image already under size limit: ${bytes.length} bytes`);
                    return bytes;
                  }

                  const maxProcessSize = 3 * 1024 * 1024;
                  if (bytes.length > maxProcessSize) {
                    console.warn(`Image too large for processing: ${bytes.length} bytes`);
                    return bytes;
                  }

                  let image = await Image.decode(new Uint8Array(bytes));
                  if (typeof globalThis.gc === 'function') globalThis.gc();

                  const originalWidth = image.width;
                  const originalHeight = image.height;

                  const maxDimension = 1920;
                  let newWidth = originalWidth;
                  let newHeight = originalHeight;
                  if (originalWidth > originalHeight) {
                    if (originalWidth > maxDimension) {
                      newWidth = maxDimension;
                      newHeight = Math.round((originalHeight / originalWidth) * maxDimension);
                    }
                  } else {
                    if (originalHeight > maxDimension) {
                      newHeight = maxDimension;
                      newWidth = Math.round((originalWidth / originalHeight) * maxDimension);
                    }
                  }

                  if (newWidth !== originalWidth || newHeight !== originalHeight) {
                    image = image.resize(newWidth, newHeight);
                    if (typeof globalThis.gc === 'function') globalThis.gc();
                  }

                  let jpegBytes: Uint8Array | null = null;
                  let quality = 90;

                  while (quality >= 10 && !jpegBytes) {
                    const buffer = await image.encodeJPEG(quality);
                    if (buffer.length <= maxSizeBytes) {
                      jpegBytes = buffer;
                      break;
                    } else {
                      quality -= 10;
                    }
                    if (typeof globalThis.gc === 'function') globalThis.gc();
                  }

                  if (!jpegBytes) {
                    const fallback = await image.encodeJPEG(10);
                    jpegBytes = fallback;
                  }
                  if (typeof globalThis.gc === 'function') globalThis.gc();
                  image = null;

                  return new Uint8Array(jpegBytes!);
                } catch (error) {
                  console.error("Image processing failed:", error);
                  return bytes;
                }
              }

              // Validate images
              if (images.length > 10) {
                return new Response(
                  JSON.stringify({ status: 'error', message: 'Maximum 10 images allowed' }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
                )
              }

              for (const image of images) {
                if (!image.fileName || !image.fileBase64 || !image.fileType) {
                  return new Response(
                    JSON.stringify({ status: 'error', message: 'Each image must have fileName, fileBase64, and fileType' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
                  )
                }

                if (!image.fileType.startsWith('image/')) {
                  return new Response(
                    JSON.stringify({ status: 'error', message: 'Only image files are allowed' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
                  )
                }
              }

              // Upload each image
              for (const image of images) {
                try {
                  // Assume fileBase64 is pure base64 (no data URL prefix)
                  const binaryString = atob(image.fileBase64);
                  let bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }

                  bytes = await resizeImageToJpeg(bytes);
                  const processedFileType = 'image/jpeg';

                  const uniqueId = crypto.randomUUID();
                  const filePath = `${transactionData.service_id}/${uniqueId}.jpg`

                  const { error: uploadError } = await serviceRoleSupabase.storage
                    .from('service-images')
                    .upload(filePath, bytes, {
                      contentType: processedFileType,
                      upsert: false,
                    })

                  if (uploadError) {
                    uploadFailed = true;
                    // Rollback previous uploads
                    for (const uploadedUrl of uploadedUrls) {
                      const urlObj = new URL(uploadedUrl);
                      const pathname = urlObj.pathname;
                      const parts = pathname.split('/').slice(5);
                      if (parts.length > 1 && parts[0] === 'service-images') {
                        const pathToDelete = parts.slice(1).join('/');
                        await serviceRoleSupabase.storage.from('service-images').remove([pathToDelete]);
                      }
                    }
                    break;
                  }

                  const { data: { publicUrl } } = serviceRoleSupabase.storage
                    .from('service-images')
                    .getPublicUrl(filePath)

                  uploadedUrls.push(publicUrl)
                } catch (error: any) {
                  uploadFailed = true;
                  // Rollback
                  for (const uploadedUrl of uploadedUrls) {
                    const urlObj = new URL(uploadedUrl);
                    const pathname = urlObj.pathname;
                    const parts = pathname.split('/').slice(5);
                    if (parts.length > 1 && parts[0] === 'service-images') {
                      const pathToDelete = parts.slice(1).join('/');
                      await serviceRoleSupabase.storage.from('service-images').remove([pathToDelete]);
                    }
                  }
                  break;
                }
              }

              if (uploadFailed) {
                return new Response(
                  JSON.stringify({ status: 'error', message: 'Image upload failed after service creation' }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
                )
              }

              if (uploadedUrls.length > 0) {
                // Update service with image_urls
                const { data: updateData, error: updateError } = await supabase.rpc('update_service_data', {
                  p_agent_id: agentId,
                  p_table_type: 'service',
                  p_id: transactionData.service_id,
                  p_updates: { image_urls: { add: uploadedUrls } }
                })

                if (updateError) {
                  // Rollback uploads
                  for (const url of uploadedUrls) {
                    const urlObj = new URL(url);
                    const pathname = urlObj.pathname;
                    const parts = pathname.split('/').slice(5);
                    if (parts.length > 1 && parts[0] === 'service-images') {
                      const pathToDelete = parts.slice(1).join('/');
                      await serviceRoleSupabase.storage.from('service-images').remove([pathToDelete]);
                    }
                  }
                  return new Response(
                    JSON.stringify({ status: 'error', message: 'Failed to update service with images: ' + updateError.message }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
                  )
                }

                // Add images to response data
                finalData = { ...finalData, image_urls: uploadedUrls };
              }
            }

            return new Response(
              JSON.stringify({ status: 'success', message: 'Service created successfully', data: finalData }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
            );
          }

          case 'get': {
            const { service_name: serviceNameFilter = '', package_name: packageNameFilter = '', sort_by: sortBy = 'created_at', sort_order: sortOrder = 'desc' } = opData

            // Validate sort options
            const validSorts = ['price', 'created_at']
            if (!validSorts.includes(sortBy)) {
              return new Response(
                JSON.stringify({ status: 'error', message: 'Invalid sort_by parameter. Use price or created_at' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
              )
            }

            // Call database function
            const { data: servicesData, error } = await supabase.rpc('get_agent_services', {
              p_agent_id: agentId,
              p_service_name_filter: serviceNameFilter,
              p_package_name_filter: packageNameFilter,
              p_sort_by: sortBy,
              p_sort_order: sortOrder
            })

            if (error) {
              console.error('RPC error:', error)
              return new Response(
                JSON.stringify({ status: 'error', message: 'Failed to fetch services' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
              )
            }

            const services = servicesData || []

            return new Response(
              JSON.stringify({ status: 'success', message: 'Services fetched successfully', data: services }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
          }

          case 'update': {
            const { type, id, updates, images, removed_image_urls } = opData

            // Validation
            if (!type || !['service', 'package'].includes(type)) {
              return new Response(
                JSON.stringify({ status: 'error', message: 'type must be "service" or "package"' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
              )
            }

            if (!id || typeof id !== 'string') {
              return new Response(
                JSON.stringify({ status: 'error', message: 'id is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
              )
            }

            if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
              return new Response(
                JSON.stringify({ status: 'error', message: 'updates object is required and must not be empty' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
              )
            }

            const serviceRoleSupabase = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            )

            // Handle removed images for service updates
            if (type === 'service' && removed_image_urls && Array.isArray(removed_image_urls) && removed_image_urls.length > 0) {
              for (const url of removed_image_urls) {
                if (typeof url === 'string' && url.includes('supabase.co/storage')) {
                  try {
                    const pathname = new URL(url).pathname;
                    const parts = pathname.split('/').slice(5);
                    if (parts.length > 1 && parts[0] === 'service-images') {
                      const filePath = parts.slice(1).join('/');
                      const { error: deleteError } = await serviceRoleSupabase.storage
                        .from('service-images')
                        .remove([filePath]);
                      if (deleteError) {
                        console.error('Failed to delete image:', deleteError);
                      } else {
                        console.log('Deleted image from storage:', filePath);
                      }
                    }
                  } catch (err) {
                    console.error('Error deleting image:', err);
                  }
                }
              }

              // Prepare for DB removal
              if (!updates.image_urls) updates.image_urls = {};
              if (!updates.image_urls.remove) updates.image_urls.remove = [];
              updates.image_urls.remove.push(...removed_image_urls);
            }

            let newImageUrls: string[] = []

            // Handle new image uploads for service updates
            if (type === 'service' && images && Array.isArray(images) && images.length > 0) {
              if (images.length > 10) {
                return new Response(
                  JSON.stringify({ status: 'error', message: 'Maximum 10 new images allowed' }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
                )
              }

              // Validate each image
              for (const image of images) {
                if (!image.fileName || !image.fileBase64 || !image.fileType) {
                  return new Response(
                    JSON.stringify({ status: 'error', message: 'Each image must have fileName, fileBase64, and fileType' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
                  )
                }

                if (!image.fileType.startsWith('image/')) {
                  return new Response(
                    JSON.stringify({ status: 'error', message: 'Only image files are allowed' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
                  )
                }
              }

              async function resizeImageToJpeg(bytes: Uint8Array, maxSizeBytes: number = 5 * 1024 * 1024): Promise<Uint8Array> {
                try {
                  if (bytes.length <= maxSizeBytes) return bytes;

                  const maxProcessSize = 3 * 1024 * 1024;
                  if (bytes.length > maxProcessSize) return bytes;

                  let image = await Image.decode(new Uint8Array(bytes));
                  if (typeof globalThis.gc === 'function') globalThis.gc();

                  const originalWidth = image.width;
                  const originalHeight = image.height;

                  const maxDimension = 1920;
                  let newWidth = originalWidth;
                  let newHeight = originalHeight;
                  if (originalWidth > originalHeight) {
                    if (originalWidth > maxDimension) {
                      newWidth = maxDimension;
                      newHeight = Math.round((originalHeight / originalWidth) * maxDimension);
                    }
                  } else {
                    if (originalHeight > maxDimension) {
                      newHeight = maxDimension;
                      newWidth = Math.round((originalWidth / originalHeight) * maxDimension);
                    }
                  }

                  if (newWidth !== originalWidth || newHeight !== originalHeight) {
                    image = image.resize(newWidth, newHeight);
                    if (typeof globalThis.gc === 'function') globalThis.gc();
                  }

                  let jpegBytes: Uint8Array | null = null;
                  let quality = 90;

                  while (quality >= 10 && !jpegBytes) {
                    const buffer = await image.encodeJPEG(quality);
                    if (buffer.length <= maxSizeBytes) {
                      jpegBytes = buffer;
                      break;
                    } else {
                      quality -= 10;
                    }
                    if (typeof globalThis.gc === 'function') globalThis.gc();
                  }

                  if (!jpegBytes) {
                    const fallback = await image.encodeJPEG(10);
                    jpegBytes = fallback;
                  }
                  if (typeof globalThis.gc === 'function') globalThis.gc();
                  image = null;

                  return new Uint8Array(jpegBytes!);
                } catch (error) {
                  console.error("Image processing failed:", error);
                  return bytes;
                }
              }

              for (const image of images) {
                try {
                  // Assume fileBase64 is pure base64
                  const binaryString = atob(image.fileBase64);
                  let bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }

                  bytes = await resizeImageToJpeg(bytes);
                  const processedFileType = 'image/jpeg';

                  const uniqueId = crypto.randomUUID();
                  const filePath = `${id}/${uniqueId}.jpg`

                  const { error: uploadError } = await serviceRoleSupabase.storage
                    .from('service-images')
                    .upload(filePath, bytes, {
                      contentType: processedFileType,
                      upsert: false,
                    })

                  if (uploadError) {
                    // Rollback new uploads
                    for (const uploadedUrl of newImageUrls) {
                      const urlObj = new URL(uploadedUrl);
                      const pathname = urlObj.pathname;
                      const parts = pathname.split('/').slice(5);
                      if (parts.length > 1 && parts[0] === 'service-images') {
                        const pathToDelete = parts.slice(1).join('/');
                        await serviceRoleSupabase.storage.from('service-images').remove([pathToDelete]);
                      }
                    }
                    return new Response(
                      JSON.stringify({ status: 'error', message: 'Upload failed: ' + uploadError.message }),
                      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
                    )
                  }

                  const { data: { publicUrl } } = serviceRoleSupabase.storage
                    .from('service-images')
                    .getPublicUrl(filePath)

                  newImageUrls.push(publicUrl)
                } catch (error: any) {
                  // Rollback
                  for (const uploadedUrl of newImageUrls) {
                    const urlObj = new URL(uploadedUrl);
                    const pathname = urlObj.pathname;
                    const parts = pathname.split('/').slice(5);
                    if (parts.length > 1 && parts[0] === 'service-images') {
                      const pathToDelete = parts.slice(1).join('/');
                      await serviceRoleSupabase.storage.from('service-images').remove([pathToDelete]);
                    }
                  }
                  return new Response(
                    JSON.stringify({ status: 'error', message: 'Upload failed: ' + (error.message || 'Unknown error') }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
                  )
                }
              }

              // Add new image URLs to updates for DB
              if (newImageUrls.length > 0) {
                if (!updates.image_urls) updates.image_urls = {};
                if (!updates.image_urls.add) updates.image_urls.add = [];
                updates.image_urls.add.push(...newImageUrls);
              }
            }

            // For image updates in services, ensure proper format
            if (type === 'service' && updates.image_urls) {
              if (typeof updates.image_urls !== 'object') {
                return new Response(
                  JSON.stringify({ status: 'error', message: 'image_urls must be an object with add/remove arrays' }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
              }
            }

            // Call database function
            const { data, error: rpcError } = await supabase.rpc('update_service_data', {
              p_agent_id: agentId,
              p_table_type: type,
              p_id: id,
              p_updates: updates
            })

            if (rpcError) {
              console.error('Update error:', rpcError)
              return new Response(
                JSON.stringify({ status: 'error', message: rpcError.message || 'Failed to update service' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
              )
            }

            return new Response(
              JSON.stringify({ status: 'success', message: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`, data }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
          }

          case 'delete': {
            const { id } = opData

            // Validation
            if (!id || typeof id !== 'string') {
              return new Response(
                JSON.stringify({ status: 'error', message: 'id is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
              )
            }

            // Get service image_urls before deletion
            const { data: serviceData, error: fetchError } = await supabase
              .from(servicesTable)
              .select('image_urls')
              .eq('id', id)
              .eq('agent_id', agentId)
              .single()

            if (fetchError && fetchError.code !== 'PGRST116') {
              console.error('Fetch service error:', fetchError)
              return new Response(
                JSON.stringify({ status: 'error', message: 'Failed to fetch service data' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
              )
            }

            // Delete images from storage if they exist
            if (serviceData?.image_urls && Array.isArray(serviceData.image_urls) && serviceData.image_urls.length > 0) {
              const serviceRoleSupabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
              )

              for (const url of serviceData.image_urls) {
                if (typeof url === 'string' && url.includes('supabase.co/storage')) {
                  try {
                    const pathname = new URL(url).pathname;
                    const parts = pathname.split('/').slice(5);
                    if (parts.length > 1 && parts[0] === 'service-images') {
                      const filePath = parts.slice(1).join('/');
                      const { error: deleteError } = await serviceRoleSupabase.storage
                        .from('service-images')
                        .remove([filePath]);
                      if (deleteError) {
                        console.error('Failed to delete image:', deleteError);
                      } else {
                        console.log('Deleted image from storage:', filePath);
                      }
                    }
                  } catch (err) {
                    console.error('Error deleting image:', err);
                  }
                }
              }
            }

            // Always perform permanent delete: Check dependencies first
            const { data: dependencyCheck, error: depError } = await supabase.rpc('check_service_dependencies', {
              p_agent_id: agentId,
              p_service_id: id
            })

            if (depError || (dependencyCheck && dependencyCheck.has_dependencies)) {
              return new Response(
                JSON.stringify({ status: 'error', message: 'Cannot delete: service has dependencies' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
              )
            }

            // Permanent hard delete
            const { data: hardData, error: hardError } = await supabase.rpc('hard_delete_service', {
              p_agent_id: agentId,
              p_service_id: id
            })

            if (hardError) {
              console.error('Hard delete error:', hardError)
              return new Response(
                JSON.stringify({ status: 'error', message: hardError.message || 'Failed to permanently delete service' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
              )
            }

            return new Response(
              JSON.stringify({ status: 'success', message: 'Service permanently deleted successfully', data: hardData }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
          }

          default:
            return new Response(
              JSON.stringify({ status: 'error', message: 'Invalid operation' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ status: 'error', message: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})