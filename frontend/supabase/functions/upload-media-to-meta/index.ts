// DEPRECATED: Replaced by Node backend
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_ID = Deno.env.get('META_APP_ID') ?? ''

serve(async (req: Request) => {
  console.log(`🚀 Upload-media-to-meta function invoked - Method: ${req.method}`);
  
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
    const authHeader = req.headers.get('Authorization');
    console.log("📋 Auth header:", authHeader ? `${authHeader.substring(0, 20)}...` : 'MISSING');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("❌ Authorization header missing or invalid");
      return new Response(
        JSON.stringify({ error: 'Authorization header missing or invalid' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.slice(7);
    console.log("🔑 Token extracted, length:", token.length);

    // Extract user ID from JWT payload
    console.log("🔍 Extracting user ID from JWT payload...");
    let userId: string;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      let payload = parts[1];
      payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (payload.length % 4) {
        payload += '=';
      }
      
      const decodedPayload = atob(payload);
      const userData = JSON.parse(decodedPayload);
      
      console.log("📊 JWT payload extracted:", {
        userId: userData.sub,
        email: userData.email,
      });

      if (!userData.sub) {
        throw new Error('No user ID in JWT payload');
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (userData.exp && userData.exp < currentTime) {
        throw new Error('JWT token expired');
      }

      userId = userData.sub;
      console.log("✅ User ID extracted from JWT:", userId);

    } catch (jwtError) {
      console.error("❌ JWT parsing failed:", jwtError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token', details: (jwtError as Error).message }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with service key
    if (!SUPABASE_SERVICE_KEY) {
      console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable missing");
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!APP_ID) {
      console.error("❌ META_APP_ID environment variable missing");
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user's WhatsApp config
    console.log("🏢 Fetching WhatsApp configuration for user:", userId);
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_configuration')
      .select('api_key')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    console.log("📊 WhatsApp config result:", {
      hasApiKey: !!whatsappConfig?.api_key,
      configError: configError ? configError.message : null
    });

    if (configError || !whatsappConfig) {
      console.error("❌ WhatsApp config not found for user", userId, ":", configError?.message);
      return new Response(
        JSON.stringify({ error: 'WhatsApp configuration not found or inactive' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!whatsappConfig.api_key) {
      console.error("❌ API key not configured in WhatsApp config");
      return new Response(
        JSON.stringify({ error: 'WhatsApp API key not configured' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    
        const { api_key } = whatsappConfig;
    
        const version = 'v23.0';
    // Parse FormData
    console.log("📥 Parsing FormData...");
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('media_type') as string || 'image'; // IMAGE, VIDEO, DOCUMENT

    console.log("📁 File info:", file ? {
      name: file.name,
      size: file.size,
      type: file.type,
      mediaType: mediaType
    } : 'NO FILE');

    if (!file) {
      console.error("❌ No file provided in request");
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate file type for media_type
    const typeMap: Record<string, string[]> = {
      IMAGE: ['image/jpeg', 'image/jpg', 'image/png'],
      VIDEO: ['video/mp4'],
      DOCUMENT: ['application/pdf']
    };

    const allowedTypes = typeMap[mediaType.toUpperCase()] || [];
    if (!allowedTypes.includes(file.type)) {
      console.error("❌ Invalid file type for media_type:", file.type, mediaType);
      return new Response(
        JSON.stringify({ error: `File type not supported for ${mediaType}. Expected: ${allowedTypes.join(', ')}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Size limits
    const sizeLimits: Record<string, number> = {
      IMAGE: 5 * 1024 * 1024, // 5MB
      VIDEO: 16 * 1024 * 1024, // 16MB
      DOCUMENT: 100 * 1024 // 100KB
    };

    const limit = sizeLimits[mediaType.toUpperCase()];
    if (file.size > limit) {
      console.error("❌ File too large:", file.size, "bytes. Limit:", limit);
      return new Response(
        JSON.stringify({ error: `File too large for ${mediaType}. Limit: ${(limit / 1024 / 1024).toFixed(1)}MB` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log("✅ File validation passed");

    // Validate for Meta upload (overrides WhatsApp validation if needed)
    const metaAllowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'video/mp4'];
    if (!metaAllowedTypes.includes(file.type)) {
      console.error("❌ File type not supported for Meta upload:", file.type);
      return new Response(
        JSON.stringify({ error: `File type not supported for Meta. Allowed: ${metaAllowedTypes.join(', ')}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log("📤 Starting resumable upload to Meta...");

    // Step 1: Start upload session
    const startUrl = new URL(`https://graph.facebook.com/${version}/${APP_ID}/uploads`);
    startUrl.searchParams.set('file_name', file.name);
    startUrl.searchParams.set('file_length', file.size.toString());
    startUrl.searchParams.set('file_type', file.type);
    startUrl.searchParams.set('access_token', api_key);

    console.log("🔗 Starting upload session to:", startUrl.toString());

    const startResponse = await fetch(startUrl.toString(), {
      method: 'POST',
    });

    if (!startResponse.ok) {
      const errText = await startResponse.text();
      console.error('❌ Upload session start failed:', {
        status: startResponse.status,
        url: startUrl.toString(),
        error: errText
      });
      let errData;
      try {
        errData = JSON.parse(errText);
      } catch (e) {
        errData = { message: errText };
      }
      return new Response(
        JSON.stringify({
          error: 'Failed to start upload session',
          details: errData.error?.message || errData.message || startResponse.statusText,
          status: startResponse.status,
          url: startUrl.toString()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const startData = await startResponse.json();
    if (!startData.id) {
      console.error("❌ No upload session ID received");
      return new Response(
        JSON.stringify({ error: 'No upload session ID received' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const fullSessionId = startData.id;
    const sessionId = fullSessionId.startsWith('upload:') ? fullSessionId.slice(7) : fullSessionId;
    console.log(`✅ Upload session started: ${fullSessionId}`);

    // Step 2: Upload the file
    const uploadUrlStr = `https://graph.facebook.com/${version}/upload:${sessionId}`;

    const fileBytes = await file.arrayBuffer();

    console.log("📤 Uploading file bytes...");

    const uploadResponse = await fetch(uploadUrlStr, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${api_key}`,
        'file_offset': '0'
      },
      body: fileBytes
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      let errData;
      try {
        errData = JSON.parse(errText);
      } catch (e) {
        errData = { message: errText };
      }
      console.error('❌ File upload failed:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        url: uploadUrlStr,
        body: errData
      });
      return new Response(
        JSON.stringify({
          error: 'File upload failed',
          details: errData.error?.message || errData.message || uploadResponse.statusText,
          status: uploadResponse.status,
          url: uploadUrlStr
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const uploadData = await uploadResponse.json();
    if (!uploadData.h) {
      console.error("❌ No file handle received from Meta API");
      return new Response(
        JSON.stringify({ error: 'No file handle received from Meta' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎉 File uploaded to Meta successfully. Handle: ${uploadData.h}`);

    const totalDuration = Date.now() - startTime;
    console.log(`🏁 Function completed in ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        media_handle: uploadData.h,
        media_type: mediaType.toLowerCase(),
        filename: file.name,
        size: file.size,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`💥 Upload-media-to-meta function failed after ${totalDuration}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})