// DEPRECATED: Replaced by Node backend
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

serve(async (req) => {
  console.log('=== ADD-AGENT FUNCTION START ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  // CORS preflight handling
  if (req.method === "OPTIONS") {
    console.log('OPTIONS request - returning CORS preflight');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    console.log('Non-POST method, returning 405');
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed"
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  try {
    console.log('Initializing Supabase client...');
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({
        success: false,
        message: 'Server configuration error'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
    
    // Verify JWT and check admin permissions
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing authorization header'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    const token = authHeader.substring(7);
    console.log('JWT token extracted, length:', token.length);
    
    const { data: { user: jwtUser }, error: jwtError } = await supabase.auth.getUser(token);
    console.log('JWT verification result:', { user: !!jwtUser, error: !!jwtError });
    
    if (jwtError || !jwtUser) {
      console.error('JWT error:', jwtError);
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid or expired token'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    console.log('JWT user ID:', jwtUser.id);
    
    // Check if user has admin role
    console.log('Checking admin role for user:', jwtUser.id);
    const { data: adminUser, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', jwtUser.id)
      .single();
    
    console.log('Admin role check:', { adminUser: !!adminUser, roleError: !!roleError, role: adminUser?.role });
    
    if (roleError || !adminUser || adminUser.role !== 'admin') {
      console.log('Admin access denied');
      return new Response(JSON.stringify({
        success: false,
        message: 'Admin access required'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    console.log('Admin role verified, parsing request body...');
    let body;
    try {
      body = await req.json();
      console.log('Request body parsed:', body);
    } catch (parseError) {
      console.error('Failed to parse JSON body:', parseError);
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid JSON body'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Validate required agent fields only
    if (!body.agent_name || !body.email || !body.temp_password) {
      return new Response(JSON.stringify({
        success: false,
        message: "agent_name, email, and temp_password are required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Validate business_type
    if (!body.business_type || !['product', 'service'].includes(body.business_type)) {
      return new Response(JSON.stringify({
        success: false,
        message: "business_type must be 'product' or 'service'"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // 1️⃣ Create Auth user
    // Create user with email confirmation
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.temp_password,
      user_metadata: {
        agent_name: body.agent_name,
        role: 'agent'
      },
      email_confirm: true
    });

    if (authError || !authUser) {
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to create Auth user: " + authError?.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const authUserId = authUser.user.id;

    // Update auth user's display name to match agent name
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
      user_metadata: {
        ...authUser.user.user_metadata,
        name: body.agent_name
      }
    });

    if (updateError) {
      console.error('Failed to update auth user display name:', updateError);
      // Continue without failing the entire operation, as it's non-critical for core functionality
    }

    // 2️⃣ Insert into users table with auth_id
    const { data: user, error: userError } = await supabase.from("users").insert({
      id: authUserId,
      name: body.agent_name,
      email: body.email,
      role: "agent"
    }).select().single();

    if (userError || !user) {
      // Clean up auth user if users table insert fails
      await supabase.auth.admin.deleteUser(authUserId);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to create user record: " + userError?.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // 3️⃣ Insert into agents table
    const agentPrefix = "agt_" + authUserId.slice(0, 4);
    const { data: agentData, error: agentError } = await supabase.from("agents").insert({
      user_id: authUserId,
      agent_prefix: agentPrefix,
      business_type: body.business_type,
      created_by: body.createdBy  // UUID users table ID from admin
    }).select().single();

    if (agentError || !agentData) {
      console.error('Agent insertion error:', agentError);
      console.error('Body data:', body);
      console.error('User data:', user);
      // Clean up on failure
      await supabase.from("users").delete().eq("id", authUserId);
      await supabase.auth.admin.deleteUser(authUserId);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to create agent record: " + agentError?.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    let whatsappConfig: any = null;

    // 4️⃣ Optionally create WhatsApp configuration if provided
    if (body.whatsapp_number && body.webhook_url) {
      const { data: configData, error: configError } = await supabase.rpc('create_whatsapp_config', {
        p_user_id: authUserId,
        p_whatsapp_number: body.whatsapp_number,
        p_webhook_url: body.webhook_url,
        p_api_key: body.api_key || null,
        p_business_account_id: body.business_account_id || null,
        p_phone_number_id: body.phone_number_id || null
      });

      if (configError) {
        console.error('WhatsApp config creation warning (non-fatal):', configError);
        whatsappConfig = { warning: "WhatsApp config could not be created. Please set it up separately." };
      } else {
        whatsappConfig = configData;
      }
    } else {
      whatsappConfig = { info: "WhatsApp configuration not provided. Agent created successfully. Set up WhatsApp integration separately." };
    }
  
    console.log('Agent created successfully:', agentData);
  
    // 5️⃣ Create agent-specific tables using RPC
    const agentPrefixLower = agentPrefix.toLowerCase();
    const { error: createTablesError } = await supabase.rpc('create_agent_tables', {
      p_agent_prefix: agentPrefixLower,
      p_agent_id: agentData.id
    });
  
    if (createTablesError) {
      console.error('Table creation error (non-fatal):', createTablesError);
      // Continue with success but log the issue
    }
  
    // 6️⃣ Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "Agent created successfully",
      authUser,
      user,
      agent: agentData,
      whatsapp_config: whatsappConfig
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({
      success: false,
      message: "Server error: " + err.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});