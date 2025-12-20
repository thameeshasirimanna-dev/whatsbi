import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

serve(async (req) => {
  // CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let userId: string | null = null;
    
    // For POST requests (Supabase client), get from body
    if (req.method === "POST") {
      const body = await req.json();
      userId = body.user_id;
    } else {
      // For direct GET requests, get from query params
      const url = new URL(req.url);
      userId = url.searchParams.get('user_id');
    }

    // Validate required parameter
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        message: "user_id is required"
      }), {
        status: 400
      });
    }

    // Validate user exists
    const { data: userExists, error: userCheckError } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (userCheckError || !userExists) {
      return new Response(JSON.stringify({
        success: false,
        message: "User not found: " + userCheckError?.message
      }), {
        status: 404
      });
    }

    // Get WhatsApp configuration using RPC
    const { data: configData, error: configError } = await supabase.rpc('get_whatsapp_config', {
      p_user_id: userId
    });

    if (configError) {
      console.error('WhatsApp config retrieval error:', configError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to retrieve WhatsApp configuration: " + configError.message
      }), {
        status: 400
      });
    }

    let responseData;
    if (configData && configData.length > 0) {
      responseData = configData[0]; // RPC returns array
      console.log('WhatsApp configuration retrieved successfully for user:', userId);
    } else {
      responseData = null;
      console.log('No WhatsApp configuration found for user:', userId);
    }

    return new Response(JSON.stringify({
      success: true,
      message: responseData ? "WhatsApp configuration found" : "No WhatsApp configuration set up for this user",
      user: userExists,
      whatsapp_config: responseData,
      user_id: userId
    }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    console.error("WhatsApp config retrieval error:", err);
    return new Response(JSON.stringify({
      success: false,
      message: "Server error: " + err.message
    }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json"
      }
    });
  }
});