import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function updateAgentRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.patch('/update-agent', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const body = request.body as any;

      // Validate required fields
      if (!body.agent_id) {
        return reply.code(400).send({
          success: false,
          message: "agent_id is required",
        });
      }

      // Validate business_type if provided
      if (body.business_type && !['product', 'service'].includes(body.business_type)) {
        return reply.code(400).send({
          success: false,
          message: "business_type must be 'product' or 'service'"
        });
      }

      // Fetch existing agent to get user_id (auth_id) for password and config updates
      const { data: existingAgent, error: fetchError } = await supabaseClient
        .from("agents")
        .select("id, user_id")
        .eq("id", body.agent_id)
        .single();

      if (fetchError || !existingAgent) {
        return reply.code(404).send({
          success: false,
          message: "Agent not found: " + fetchError?.message,
        });
      }

      // Ensure user_id is a string UUID
      const agentUserId = existingAgent.user_id.toString();

      let authUpdateResult: any = null;
      let whatsappUpdateResult: any = null;
      let agentUpdateResult: any = null;

      // Handle password update via Supabase Auth if provided
      if (body.temp_password) {
        const { data: authData, error: authError } =
          await supabaseClient.auth.admin.updateUserById(agentUserId, {
            password: body.temp_password,
          });

        if (authError) {
          console.error("Auth password update error:", authError);
          return reply.code(400).send({
            success: false,
            message: "Failed to update password: " + authError.message,
          });
        }
        authUpdateResult = authData;
      }

      // Prepare structured updates for users table only
      const userUpdates: any = {};

      if (body.agent_name) userUpdates.name = body.agent_name;
      if (body.email) userUpdates.email = body.email;
      if (body.role) userUpdates.role = body.role;

      // Get current user ID from Supabase auth context (automatically uses request Authorization header)
      let currentUserId: string | null = null;
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser();

      if (user && !authError) {
        currentUserId = user.id;
      }

      // Fallback to body.updated_by if JWT auth fails (maintains backward compatibility)
      if (!currentUserId && body.updated_by) {
        console.warn(
          "JWT authentication failed, falling back to body.updated_by"
        );
        currentUserId = body.updated_by;
      }

      if (!currentUserId) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required",
        });
      }

      // Prepare agent_updates as empty object (no agent table changes per requirements)
      const agentUpdates: any = {};
      if (body.business_type) {
        agentUpdates.business_type = body.business_type;
      }

      // Execute agent details update using RPC if any updates provided (user or agent)
      if (
        Object.keys(userUpdates).length > 0 ||
        Object.keys(agentUpdates).length > 0
      ) {
        const { data: transactionData, error: transactionError } =
          await supabaseClient.rpc("update_agent_details", {
            p_agent_id: parseInt(body.agent_id),
            p_user_updates: userUpdates,
            p_agent_updates: agentUpdates,
            p_current_user_id: currentUserId,
          });

        if (transactionError) {
          console.error("Agent details update error:", transactionError);
          console.error("Debug - agent_id:", body.agent_id);
          console.error("Debug - userUpdates:", userUpdates);
          console.error("Debug - agentUpdates:", agentUpdates);
          console.error(
            "Full error details:",
            JSON.stringify(transactionError, null, 2)
          );
          return reply.code(400).send({
            success: false,
            message:
              "Failed to update agent details: " + transactionError.message,
          });
        }

        // Handle new RPC response format: {agent: {user, agent}, success, message}
        if (transactionData && transactionData.success) {
          agentUpdateResult = {
            updated_user: transactionData.agent.user,
            updated_agent: transactionData.agent.agent,
            success: true,
            message: transactionData.message,
          };
        } else {
          agentUpdateResult = {
            success: false,
            message: transactionData?.message || "Update failed",
          };
        }
      } else {
        // If no updates, fetch current agent data with user info for consistent response
        const { data: currentAgent } = await supabaseClient
          .from("agents")
          .select("id, user_id, agent_prefix, business_type")
          .eq("id", body.agent_id)
          .single();

        if (currentAgent) {
          const { data: userData } = await supabaseClient
            .from("users")
            .select("id, name, email, role")
            .eq("id", currentAgent.user_id)
            .single();

          agentUpdateResult = {
            updated_user: userData,
            updated_agent: currentAgent,
            success: true,
          };
        } else {
          agentUpdateResult = null;
        }
      }

      // Handle WhatsApp configuration update separately if WhatsApp fields provided
      const hasWhatsAppFields =
        body.whatsapp_number ||
        body.webhook_url ||
        body.api_key ||
        body.business_account_id ||
        body.phone_number_id ||
        body.is_active !== undefined;

      if (hasWhatsAppFields) {
        const { data: configData, error: configError } =
          await supabaseClient.rpc("update_whatsapp_config", {
            p_user_id: agentUserId,
            p_whatsapp_number: body.whatsapp_number || null,
            p_webhook_url: body.webhook_url || null,
            p_api_key: body.api_key || null,
            p_business_account_id: body.business_account_id || null,
            p_phone_number_id: body.phone_number_id || null,
            p_is_active: body.is_active !== undefined ? body.is_active : null,
          });

        if (configError) {
          console.error(
            "WhatsApp config update warning (non-fatal):",
            configError
          );
          whatsappUpdateResult = {
            warning:
              "WhatsApp config update failed. Please try updating WhatsApp settings separately.",
          };
        } else {
          whatsappUpdateResult = configData;
        }
      } else {
        // If no WhatsApp fields provided, fetch current config for response completeness
        const { data: currentConfig } = await supabaseClient.rpc(
          "get_whatsapp_config",
          {
            p_user_id: agentUserId,
          }
        );
        whatsappUpdateResult = currentConfig || {
          info: "No WhatsApp configuration changes requested. Current config shown if exists.",
        };
      }

      // Return success response
      return reply.code(200).send({
        success: true,
        message: "Agent updated successfully",
        agent: agentUpdateResult,
        whatsapp_config: whatsappUpdateResult,
        auth_updated: !!authUpdateResult,
        changes_made: {
          agent_details: Object.keys(userUpdates).length > 0,
          whatsapp_config: hasWhatsAppFields,
          password: !!body.temp_password,
        },
      });
    } catch (err) {
      console.error("Update agent error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}