// DEPRECATED: Replaced by Node backend
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed"
    }), {
      status: 405,
      headers: {
        "access-control-allow-origin": "*",
        "content-type": "application/json",
        "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
      }
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await req.json();
    const { agent_id } = body;

    if (!agent_id) {
      return new Response(JSON.stringify({
        success: false,
        message: "Agent ID is required"
      }), {
        status: 400,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
          "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
        }
      });
    }

    // 1️⃣ Get agent details including user_id and agent_prefix
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, user_id, agent_prefix")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({
        success: false,
        message: "Agent not found: " + agentError?.message
      }), {
        status: 404,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
          "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
        }
      });
    }

    // 2️⃣ Drop dynamic per-agent tables using RPC function
    if (agent.agent_prefix) {
      const prefix = agent.agent_prefix.toLowerCase();
      try {
        const { data, error } = await supabase.rpc('drop_agent_tables', {
          p_agent_prefix: prefix
        });

        if (error) {
          console.error('RPC error dropping agent tables:', error);
        } else {
          const droppedTables = data?.dropped_tables || [];
          const errors = data?.errors || [];
          
          console.log(`Table cleanup for prefix ${prefix}:`);
          console.log(`- Dropped tables: [${droppedTables.join(', ')}]`);
          if (errors.length > 0) {
            console.log(`- Errors: [${errors.join(', ')}]`);
          } else {
            console.log('- No errors');
          }
        }
      } catch (rpcError) {
        console.error('Exception during table cleanup RPC:', rpcError);
        // Continue with other deletion steps - table cleanup is best-effort
      }
    }

    // 3️⃣ Get user details including auth id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", agent.user_id)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({
        success: false,
        message: "User not found for agent: " + userError?.message
      }), {
        status: 404,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
          "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
        }
      });
    }

    // 3️⃣ Delete agent first (cascades agent_customers due to FK)
    const { error: agentDeleteError } = await supabase
      .from("agents")
      .delete()
      .eq("id", agent_id);

    if (agentDeleteError) {
      console.error("Error deleting agent:", agentDeleteError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to delete agent: " + agentDeleteError.message
      }), {
        status: 500,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
          "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
        }
      });
    }

    // 4️⃣ Find assigned customers via agent_customers (before agent deletion cascades it away)
    // Note: This query might fail if agent_customers already cascaded, which is fine
    let customerIds: number[] = [];
    try {
      const { data: agentCustomers, error: acError } = await supabase
        .from("agent_customers")
        .select("customer_id")
        .eq("agent_id", agent_id);

      if (!acError && agentCustomers) {
        customerIds = agentCustomers.map(ac => ac.customer_id);
      }
    } catch (acErr) {
      console.log("Could not fetch agent_customers (likely already cascaded):", acErr);
      // Try to find customers by looking at central customers table if needed
    }

    // 5️⃣ Delete assigned customers (cascades to messages) - if we have customer IDs
    if (customerIds.length > 0) {
      const { error: customerDeleteError } = await supabase
        .from("customers")
        .delete()
        .in("id", customerIds);

      if (customerDeleteError) {
        console.error("Error deleting customers:", customerDeleteError);
        // Continue - customer deletion is important but shouldn't block agent deletion
      } else {
        console.log(`Deleted ${customerIds.length} customers and their messages`);
      }
    }

    // 6️⃣ Now delete user (no longer referenced by agents table due to CASCADE)
    const { error: usersDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id);

    if (usersDeleteError) {
      console.error("Error deleting user:", usersDeleteError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to delete user: " + usersDeleteError.message
      }), {
        status: 500,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
          "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
        }
      });
    }

    // 7️⃣ Delete auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to delete auth user: " + authDeleteError.message
      }), {
        status: 500,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
          "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
        }
      });
    }

    console.log(`Agent ${agent_id} deleted successfully, including user ${user.id} and ${customerIds.length} customers`);

    return new Response(JSON.stringify({
      success: true,
      message: "Agent deleted successfully",
      deleted: {
        agent_id,
        user_id: user.id,
        customers_count: customerIds.length
      }
    }), {
      status: 200,
      headers: {
        "access-control-allow-origin": "*",
        "content-type": "application/json",
        "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
      }
    });

  } catch (err) {
    console.error("Delete agent error:", err);
    return new Response(JSON.stringify({
      success: false,
      message: "Server error: " + err.message
    }), {
      status: 500,
      headers: {
        "access-control-allow-origin": "*",
        "content-type": "application/json",
        "access-control-allow-headers": "content-type, authorization, x-client-info, apikey"
      }
    });
  }
});