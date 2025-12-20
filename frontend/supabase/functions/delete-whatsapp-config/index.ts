// DEPRECATED: Replaced by Node backend
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

serve(async (req) => {
  // CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  if (req.method !== "DELETE") {
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed. Use DELETE to remove WhatsApp config."
    }), {
      status: 405
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body = await req.json();
    
    // Validate required parameter
    if (!body.user_id) {
      return new Response(JSON.stringify({
        success: false,
        message: "user_id is required in request body"
      }), {
        status: 400
      });
    }

    const userId = body.user_id;

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

    // Check if WhatsApp config exists for this user
    const { data: existingConfig, error: configCheckError } = await supabase
      .from("whatsapp_configuration")
      .select("id, is_active")
      .eq("user_id", userId)
      .single();

    if (configCheckError && configCheckError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('WhatsApp config check error:', configCheckError);
      return new Response(JSON.stringify({
        success: false,
        message: "Error checking WhatsApp configuration: " + configCheckError.message
      }), {
        status: 400
      });
    }

    if (!existingConfig) {
      return new Response(JSON.stringify({
        success: false,
        message: "No WhatsApp configuration found for this user"
      }), {
        status: 404
      });
    }

    if (!existingConfig.is_active) {
      return new Response(JSON.stringify({
        success: false,
        message: "WhatsApp configuration is already deactivated"
      }), {
        status: 400
      });
    }

    // Deactivate WhatsApp configuration using RPC (soft delete)
    const { data: resultData, error: deleteError } = await supabase.rpc('delete_whatsapp_config', {
      p_user_id: userId
    });

    if (deleteError) {
      console.error('WhatsApp config deletion error:', deleteError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to deactivate WhatsApp configuration: " + deleteError.message
      }), {
        status: 400
      });
    }

    const success = resultData && resultData.length > 0 && resultData[0].success;
    const message = resultData && resultData.length > 0 ? resultData[0].message : "WhatsApp configuration deactivated";

    if (!success) {
      return new Response(JSON.stringify({
        success: false,
        message: message
      }), {
        status: 400
      });
    }

    console.log('WhatsApp configuration deactivated for user:', userId);

    return new Response(JSON.stringify({
      success: true,
      message: message,
      user: userExists,
      user_id: userId,
      action: "deactivated",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    console.error("WhatsApp config deletion error:", err);
    return new Response(JSON.stringify({
      success: false,
      message: "Server error: " + err.message
    }), {
      status: 500
    });
  }
});