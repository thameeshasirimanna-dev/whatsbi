import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';

export default async function updateWhatsappConfigRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.put('/update-whatsapp-config', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const body = request.body as any;

      // Validate required fields
      if (!body.user_id) {
        return reply.code(400).send({
          success: false,
          message: "user_id is required",
        });
      }

      // Validate user exists
      const { data: userExists, error: userCheckError } = await supabaseClient
        .from("users")
        .select("id")
        .eq("id", body.user_id)
        .single();

      if (userCheckError || !userExists) {
        return reply.code(404).send({
          success: false,
          message: "User not found: " + userCheckError?.message,
        });
      }

      // Update WhatsApp configuration using RPC
      const { data: configData, error: configError } = await supabaseClient.rpc(
        "update_whatsapp_config",
        {
          p_user_id: body.user_id,
          p_whatsapp_number: body.whatsapp_number || null,
          p_webhook_url: body.webhook_url || null,
          p_api_key: body.api_key || null,
          p_business_account_id: body.business_account_id || null,
          p_phone_number_id: body.phone_number_id || null,
        }
      );

      if (configError) {
        return reply.code(400).send({
          success: false,
          message: "Failed to update WhatsApp configuration: " + configError.message,
        });
      }

      return reply.code(200).send({
        success: true,
        message: "WhatsApp configuration updated successfully",
        whatsapp_config: configData,
        user_id: body.user_id,
      });
    } catch (err) {
      console.error("WhatsApp config update error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}