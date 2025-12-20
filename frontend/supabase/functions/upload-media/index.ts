import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Global secrets
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req: Request) => {
  console.log(`🚀 Upload-media function invoked - Method: ${req.method}`);
  console.log("📋 Request headers:", Object.fromEntries(req.headers.entries()));
  
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log("✅ Handling CORS preflight request");
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log(`❌ Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log("🔐 Processing authentication...");
    // Get auth token from Authorization header
    const authHeader = req.headers.get("Authorization");
    console.log(
      "📋 Auth header:",
      authHeader ? `${authHeader.substring(0, 20)}...` : "MISSING"
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Authorization header missing or invalid");
      return new Response(
        JSON.stringify({ error: "Authorization header missing or invalid" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.slice(7);
    console.log("🔑 Token extracted, length:", token.length);

    // Extract and validate user ID from JWT payload using native atob()
    console.log("🔍 Extracting user ID from JWT payload...");
    let userId: string;

    try {
      // JWT format: header.payload.signature
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      // Decode payload (second part) - base64url to base64 then decode
      let payload = parts[1];
      // Convert base64url to base64 (replace - with +, _ with /, add padding)
      payload = payload.replace(/-/g, "+").replace(/_/g, "/");
      while (payload.length % 4) {
        payload += "=";
      }

      // Decode using native atob()
      const decodedPayload = atob(payload);
      const userData = JSON.parse(decodedPayload);

      console.log("📊 JWT payload extracted:", {
        userId: userData.sub,
        email: userData.email,
        exp: userData.exp
          ? new Date(userData.exp * 1000).toISOString()
          : undefined,
        iat: userData.iat
          ? new Date(userData.iat * 1000).toISOString()
          : undefined,
      });

      // Basic validation
      if (!userData.sub) {
        throw new Error("No user ID in JWT payload");
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (userData.exp && userData.exp < currentTime) {
        throw new Error("JWT token expired");
      }

      userId = userData.sub;
      console.log("✅ User ID extracted from JWT:", userId);
    } catch (jwtError: any) {
      console.error("❌ JWT parsing failed:", jwtError);
      return new Response(
        JSON.stringify({
          error: "Invalid authentication token",
          details: jwtError.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get anon key from environment for proper client creation
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    console.log("🔑 ANON_KEY available:", SUPABASE_ANON_KEY ? "YES" : "NO");

    if (!SUPABASE_ANON_KEY) {
      console.error("❌ SUPABASE_ANON_KEY environment variable missing");
      return new Response(
        JSON.stringify({
          error: "Server configuration error - missing anon key",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with anon key and user JWT in auth
    console.log("🛠️ Creating Supabase client with anon key + user JWT...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        accessToken: token,
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get agent info for this user
    console.log("🏢 Fetching agent information for user:", userId);
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, agent_prefix")
      .eq("user_id", userId)
      .single();

    console.log("📊 Agent result:", {
      agentId: agent?.id,
      agentPrefix: agent?.agent_prefix,
      agentError: agentError ? agentError.message : null,
    });

    if (agentError || !agent) {
      console.error(
        "❌ Agent not found for user",
        userId,
        ":",
        agentError?.message
      );
      return new Response(
        JSON.stringify({ error: "Agent not found for authenticated user" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const agentPrefix = agent.agent_prefix;
    if (!agentPrefix) {
      console.error("❌ Agent prefix not configured for agent", agent.id);
      return new Response(
        JSON.stringify({ error: "Agent prefix not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Agent found:", { agentId: agent.id, prefix: agentPrefix });

    // Get WhatsApp config
    console.log("🏢 Fetching WhatsApp configuration for user:", userId);
    const { data: whatsappConfig, error: configError } = await supabase
      .from("whatsapp_configuration")
      .select("api_key, phone_number_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (configError || !whatsappConfig) {
      console.error("❌ WhatsApp config not found:", configError?.message);
      return new Response(
        JSON.stringify({ error: "WhatsApp configuration not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = whatsappConfig.api_key;
    const phoneNumberId = whatsappConfig.phone_number_id;

    if (!accessToken || !phoneNumberId) {
      console.error("❌ Invalid WhatsApp configuration");
      return new Response(
        JSON.stringify({ error: "Invalid WhatsApp configuration" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ WhatsApp config loaded:", {
      phoneNumberId: phoneNumberId.substring(0, 10) + "...",
      hasToken: !!accessToken,
    });

    // Parse request body for files and metadata
    console.log("📥 Parsing FormData...");
    const formData = await req.formData();
    const entries = Array.from(formData.entries()).map(
      (entry: [string, FormDataEntryValue]) => {
        const [key, value] = entry;
        if (value instanceof File) {
          return [
            key,
            { name: value.name, size: value.size, type: value.type },
          ];
        }
        return [key, String(value)];
      }
    );
    console.log("📋 FormData entries:", entries);

    const files = formData.getAll("file") as File[];
    const caption = (formData.get("caption") as string) || "";

    console.log(
      "📁 Files info:",
      files.length > 0
        ? {
            count: files.length,
            types: files.map((f) => f.type),
            sizes: files.map((f) => f.size),
            caption: caption,
          }
        : "NO FILES"
    );

    if (files.length === 0) {
      console.error("❌ No files provided in request");
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate files according to WhatsApp media specifications
    const allowedMediaTypes: Record<string, number> = {
      // Images: 5 MB
      "image/jpeg": 5 * 1024 * 1024,
      "image/png": 5 * 1024 * 1024,
      // Stickers (WebP): 500 KB (max for animated)
      "image/webp": 500 * 1024,
      // Documents: 100 MB
      "text/plain": 100 * 1024 * 1024,
      "application/pdf": 100 * 1024 * 1024,
      "application/msword": 100 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        100 * 1024 * 1024,
      "application/vnd.ms-excel": 100 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        100 * 1024 * 1024,
      "application/vnd.ms-powerpoint": 100 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        100 * 1024 * 1024,
      // Audio: 16 MB
      "audio/aac": 16 * 1024 * 1024,
      "audio/amr": 16 * 1024 * 1024,
      "audio/mpeg": 16 * 1024 * 1024,
      "audio/mp4": 16 * 1024 * 1024,
      "audio/ogg": 16 * 1024 * 1024,
      // Video: 16 MB
      "video/3gpp": 16 * 1024 * 1024,
      "video/mp4": 16 * 1024 * 1024,
    };

    console.log("🔍 Validating files...");
    const invalidFiles = files.filter((file) => {
      const maxForType =
        allowedMediaTypes[file.type as keyof typeof allowedMediaTypes];
      if (maxForType === undefined) {
        console.warn(`Unsupported MIME type: ${file.type}`);
        return true;
      }
      if (file.size > maxForType) {
        console.warn(
          `File too large: ${file.name} (${file.size} bytes) exceeds ${maxForType} bytes for ${file.type}`
        );
        return true;
      }
      return false;
    });
    if (invalidFiles.length > 0) {
      console.error(
        "❌ Invalid files:",
        invalidFiles.map((f) => ({ name: f.name, size: f.size, type: f.type }))
      );
      return new Response(
        JSON.stringify({
          error:
            "Some files are too large or unsupported type. Limits: Images/Stickers (5MB/500KB), Documents (100MB), Audio/Video (16MB). Ensure MIME types match file extensions to avoid errors (131053). Supported types: JPEG, PNG, WebP, PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, AAC, AMR, MP3, M4A, OGG, 3GP, MP4.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ All files validation passed");

    // Upload each file to WhatsApp Cloud API
    console.log("📤 Uploading files to WhatsApp Cloud API...");
    const version = "v19.0";
    const uploadPromises = files.map(async (file, index) => {
      const uploadFormData = new FormData();
      uploadFormData.append("messaging_product", "whatsapp");
      uploadFormData.append("file", file);

      const uploadStartTime = Date.now();

      const uploadResponse = await fetch(
        `https://graph.facebook.com/${version}/${phoneNumberId}/media`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: uploadFormData,
        }
      );

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(
        `⏱️ Cloud API upload for file ${index + 1} took ${uploadDuration}ms`
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.text();
        console.error(
          `❌ Media upload failed for file ${index + 1}:`,
          errorData
        );
        return {
          error: `Failed to upload file ${index + 1}: ${errorData}`,
          index,
        };
      }

      const uploadResult = await uploadResponse.json();
      const media_id = uploadResult.id;

      if (!media_id) {
        console.error(`❌ No media ID for file ${index + 1}:`, uploadResult);
        return {
          error: `Invalid media upload response for file ${index + 1} - no ID`,
          index,
        };
      }

      console.log(`✅ File ${index + 1} uploaded successfully, ID:`, media_id);

      // Fetch media URL for preview and storage
      let media_download_url = null;
      const mediaUrlResponse = await fetch(
        `https://graph.facebook.com/${version}/${media_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (mediaUrlResponse.ok) {
        const mediaUrlData = await mediaUrlResponse.json();
        media_download_url = mediaUrlData.url;
        console.log(
          `Media URL for file ${index + 1} fetched:`,
          media_download_url
        );
      } else {
        console.error(
          `Failed to fetch media URL for file ${index + 1}:`,
          await mediaUrlResponse.text()
        );
      }

      // Download the media blob from WhatsApp URL for Supabase storage
      let supabasePublicUrl = null;
      if (media_download_url) {
        try {
          console.log(
            `🔄 Attempting to download preview blob for file ${
              index + 1
            } from:`,
            media_download_url.substring(0, 50) + "..."
          );
          const blobResponse = await fetch(media_download_url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          console.log(
            `📥 Blob response for file ${index + 1}: status ${
              blobResponse.status
            }, ok: ${blobResponse.ok}, content-type: ${blobResponse.headers.get(
              "content-type"
            )}, headers:`,
            Object.fromEntries(blobResponse.headers.entries())
          );

          if (blobResponse.ok) {
            const blob = await blobResponse.blob();
            console.log(
              `📦 Blob downloaded for file ${index + 1}: size ${
                blob.size
              } bytes, type ${blob.type}, original file type: ${file.type}`
            );
            const timestamp = Date.now();
            const fileExt = file.name.split(".").pop() || "bin";
            const fileName = `whatsapp_${agentPrefix}_preview_${timestamp}.${fileExt}`;
            const filePath = `${agentPrefix}/previews/${fileName}`;

            console.log(
              `☁️ Uploading preview to Supabase: path ${filePath}, content-type ${file.type}, blob size: ${blob.size}`
            );

            const { data: uploadData, error: uploadError } =
              await supabase.storage
                .from("whatsapp-media")
                .upload(filePath, blob, {
                  contentType: file.type,
                  cacheControl: "3600",
                  upsert: false,
                });

            if (!uploadError && uploadData) {
              const { data: publicUrlData } = supabase.storage
                .from("whatsapp-media")
                .getPublicUrl(filePath);
              supabasePublicUrl = publicUrlData.publicUrl;
              console.log(
                `✅ Preview uploaded to Supabase for file ${
                  index + 1
                }: ${supabasePublicUrl}, path: ${filePath}`
              );
            } else {
              console.error(
                `❌ Failed to upload preview to Supabase for file ${
                  index + 1
                }:`,
                uploadError ? uploadError.message : "Unknown error",
                "Full error:",
                uploadError,
                "Upload data:",
                uploadData
              );
              console.error(
                `❌ Supabase upload details: bucket=whatsapp-media, path=${filePath}, contentType=${file.type}, size=${blob.size}`
              );
            }
          } else {
            const errorText = await blobResponse.text();
            console.error(
              `❌ Failed to download blob for preview for file ${
                index + 1
              }: status ${blobResponse.status}, response:`,
              errorText
            );
            console.error(
              `❌ Blob fetch details: url=${media_download_url.substring(
                0,
                50
              )}..., auth header used: Bearer ${
                accessToken ? accessToken.substring(0, 20) + "..." : "MISSING"
              }`
            );
          }
        } catch (blobError) {
          console.error(
            `❌ Error downloading blob for preview for file ${index + 1}:`,
            blobError,
            "Stack:",
            (blobError as Error).stack
          );
        }
      } else {
        console.warn(
          `⚠️ No media_download_url available for preview upload, file ${
            index + 1
          }. WhatsApp media URL fetch likely failed earlier.`
        );
      }

      // Log fallback decision
      console.log(
        `📋 Final URL decision for file ${
          index + 1
        }: Supabase=${!!supabasePublicUrl}, WhatsApp=${!!media_download_url}, Using: ${
          supabasePublicUrl || media_download_url || "NONE"
        }`
      );

      // Determine media type based on filename extension (more reliable than file.type in Deno)
      let mediaType: "none" | "image" | "video" | "audio" | "document" = "none";
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
        mediaType = "image";
      } else if (["mp4", "3gp"].includes(extension)) {
        mediaType = "video";
      } else if (["mp3", "aac", "amr", "m4a", "ogg"].includes(extension)) {
        mediaType = "audio";
      } else if (
        ["pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(
          extension
        )
      ) {
        mediaType = "document";
      }

      console.log(
        `🏷️ Determined media type for file ${
          index + 1
        }: ${mediaType} (extension: ${extension})`
      );

      return {
        media_id: media_id,
        media_download_url: supabasePublicUrl || media_download_url,
        media_type: mediaType,
        filename: file.name,
        size: file.size,
        index,
      };
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((r) => !r.error);
    const failedUploads = results.filter((r) => r.error);

    if (failedUploads.length > 0) {
      console.error(
        "❌ Some uploads failed:",
        failedUploads.map((f) => f.error)
      );
    }

    if (successfulUploads.length === 0) {
      return new Response(
        JSON.stringify({
          error: "All file uploads failed",
          details: failedUploads.map((f) => f.error),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log successful uploads
    console.log(
      `🎉 ${successfulUploads.length}/${files.length} files uploaded successfully`,
      successfulUploads.map((u) => ({ id: u.media_id, type: u.media_type }))
    );

    const totalDuration = Date.now() - startTime;
    console.log(`🏁 Function completed in ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        uploaded: successfulUploads.length,
        total: files.length,
        media: successfulUploads,
        errors: failedUploads.map((f) => ({ index: f.index, error: f.error })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`💥 Upload-media function failed after ${totalDuration}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage, stack: errorStack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})