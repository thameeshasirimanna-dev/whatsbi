// DEPRECATED: Replaced by Node backend
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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

serve(async (req: Request) => {
  console.log(`🚀 Get-media-preview function invoked - Method: ${req.method}`);
  
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

    // Create Supabase client with anon key and user JWT
    console.log("🛠️ Creating Supabase client with anon key + user JWT...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        accessToken: token,
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Get agent info for this user
    console.log("🏢 Fetching agent information for user:", userId);
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, agent_prefix')
      .eq('user_id', userId)
      .single();

    console.log("📊 Agent result:", {
      agentId: agent?.id,
      agentPrefix: agent?.agent_prefix,
      agentError: agentError ? agentError.message : null
    });

    if (agentError || !agent) {
      console.error("❌ Agent not found for user", userId, ":", agentError?.message);
      return new Response(
        JSON.stringify({ error: 'Agent not found for authenticated user' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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
          headers: { ...corsHeaders, "Content-Type": "application/json" }
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
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("✅ WhatsApp config loaded:", { phoneNumberId: phoneNumberId.substring(0, 10) + "...", hasToken: !!accessToken });

    // Parse request body for media_id
    const body = await req.json();
    const { media_id } = body;

    if (!media_id) {
      console.error("❌ No media_id provided");
      return new Response(
        JSON.stringify({ error: 'media_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log("📥 Media ID:", media_id);

    // Fetch media URL
    const mediaUrlResponse = await fetch(`https://graph.facebook.com/v23.0/${media_id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mediaUrlResponse.ok) {
      const errorText = await mediaUrlResponse.text();
      console.error("❌ Failed to fetch media URL:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch media URL", details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mediaUrlData = await mediaUrlResponse.json();
    const media_download_url = mediaUrlData.url;

    if (!media_download_url) {
      console.error("❌ No download URL in media response");
      return new Response(
        JSON.stringify({ error: "No download URL available" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("📥 Media download URL fetched:", media_download_url);

    // Download the media
    const mediaResponse = await fetch(media_download_url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      console.error("❌ Failed to download media:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to download media", details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mediaBuffer = await mediaResponse.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(mediaBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream';

    console.log(`✅ Media downloaded successfully: ${mediaBuffer.byteLength} bytes, type: ${contentType}`);

    return new Response(
      JSON.stringify({
        success: true,
        base64: base64,
        content_type: contentType,
        media_id: media_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error("💥 Get-media-preview function failed:", error);
    
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