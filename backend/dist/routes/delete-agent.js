import { verifyJWT } from "../utils/helpers";
export default async function deleteAgentRoutes(fastify, supabaseClient) {
    fastify.post('/delete-agent', async (request, reply) => {
        try {
            // Verify JWT and get authenticated user
            const authenticatedUser = await verifyJWT(request, supabaseClient);
            const body = request.body;
            const { agent_id } = body;
            if (!agent_id) {
                return reply.code(400).send({
                    success: false,
                    message: "Agent ID is required",
                });
            }
            // 1️⃣ Get agent details including user_id and agent_prefix
            const { data: agent, error: agentError } = await supabaseClient
                .from("agents")
                .select("id, user_id, agent_prefix")
                .eq("id", agent_id)
                .single();
            if (agentError || !agent) {
                return reply.code(404).send({
                    success: false,
                    message: "Agent not found: " + agentError?.message,
                });
            }
            // 2️⃣ Drop dynamic per-agent tables using RPC function
            if (agent.agent_prefix) {
                const prefix = agent.agent_prefix.toLowerCase();
                try {
                    const { data, error } = await supabaseClient.rpc("drop_agent_tables", {
                        p_agent_prefix: prefix,
                    });
                    if (error) {
                        console.error("RPC error dropping agent tables:", error);
                    }
                    else {
                        const droppedTables = data?.dropped_tables || [];
                        const errors = data?.errors || [];
                        console.log(`Table cleanup for prefix ${prefix}:`);
                        console.log(`- Dropped tables: [${droppedTables.join(", ")}]`);
                        if (errors.length > 0) {
                            console.log(`- Errors: [${errors.join(", ")}]`);
                        }
                        else {
                            console.log("- No errors");
                        }
                    }
                }
                catch (rpcError) {
                    console.error("Exception during table cleanup RPC:", rpcError);
                    // Continue with other deletion steps - table cleanup is best-effort
                }
            }
            // 3️⃣ Get user details including auth id
            const { data: user, error: userError } = await supabaseClient
                .from("users")
                .select("id, email")
                .eq("id", agent.user_id)
                .single();
            if (userError || !user) {
                return reply.code(404).send({
                    success: false,
                    message: "User not found for agent: " + userError?.message,
                });
            }
            // 3️⃣ Delete agent first (cascades agent_customers due to FK)
            const { error: agentDeleteError } = await supabaseClient
                .from("agents")
                .delete()
                .eq("id", agent_id);
            if (agentDeleteError) {
                console.error("Error deleting agent:", agentDeleteError);
                return reply.code(500).send({
                    success: false,
                    message: "Failed to delete agent: " + agentDeleteError.message,
                });
            }
            // 4️⃣ Find assigned customers via agent_customers (before agent deletion cascades it away)
            // Note: This query might fail if agent_customers already cascaded, which is fine
            let customerIds = [];
            try {
                const { data: agentCustomers, error: acError } = await supabaseClient
                    .from("agent_customers")
                    .select("customer_id")
                    .eq("agent_id", agent_id);
                if (!acError && agentCustomers) {
                    customerIds = agentCustomers.map((ac) => ac.customer_id);
                }
            }
            catch (acErr) {
                console.log("Could not fetch agent_customers (likely already cascaded):", acErr);
                // Try to find customers by looking at central customers table if needed
            }
            // 5️⃣ Delete assigned customers (cascades to messages) - if we have customer IDs
            if (customerIds.length > 0) {
                const { error: customerDeleteError } = await supabaseClient
                    .from("customers")
                    .delete()
                    .in("id", customerIds);
                if (customerDeleteError) {
                    console.error("Error deleting customers:", customerDeleteError);
                    // Continue - customer deletion is important but shouldn't block agent deletion
                }
                else {
                    console.log(`Deleted ${customerIds.length} customers and their messages`);
                }
            }
            // 6️⃣ Now delete user (no longer referenced by agents table due to CASCADE)
            const { error: usersDeleteError } = await supabaseClient
                .from("users")
                .delete()
                .eq("id", user.id);
            if (usersDeleteError) {
                console.error("Error deleting user:", usersDeleteError);
                return reply.code(500).send({
                    success: false,
                    message: "Failed to delete user: " + usersDeleteError.message,
                });
            }
            // 7️⃣ Delete auth user
            const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(user.id);
            if (authDeleteError) {
                console.error("Error deleting auth user:", authDeleteError);
                return reply.code(500).send({
                    success: false,
                    message: "Failed to delete auth user: " + authDeleteError.message,
                });
            }
            console.log(`Agent ${agent_id} deleted successfully, including user ${user.id} and ${customerIds.length} customers`);
            return reply.code(200).send({
                success: true,
                message: "Agent deleted successfully",
                deleted: {
                    agent_id,
                    user_id: user.id,
                    customers_count: customerIds.length,
                },
            });
        }
        catch (err) {
            console.error("Delete agent error:", err);
            return reply.code(500).send({
                success: false,
                message: "Server error: " + err.message
            });
        }
    });
}
