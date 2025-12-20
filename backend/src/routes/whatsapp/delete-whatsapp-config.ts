import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';

export default async function deleteWhatsappConfigRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.delete('/delete-whatsapp-config/:user_id', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const { user_id } = request.params as any;

      // Validate required parameter
      if (!user_id) {
        return reply.code(400).send({
          success: false,
          message: "user_id is required",
        });
      }

      // Validate user exists
      const { data: userExists, error: userCheckError } = await supabaseClient
        .from("users")
        .select("id")
        .eq("id", user_id)
        .single();

      if (userCheckError || !userExists) {
        return reply.code(404).send({
          success: false,
          message: "User not found: " + userCheckError?.message,
        });
      }

      // Delete WhatsApp configuration using RPC
      const { data: configData, error: configError } = await supabaseClient.rpc(
        "delete_whatsapp_config",
        {
          p_user_id: user_id,
        }
      );

      if (configError) {
        return reply.code(400).send({
          success: false,
          message: "Failed to delete WhatsApp configuration: " + configError.message,
        });
      }

      return reply.code(200).send({
        success: true,
        message: "WhatsApp configuration deleted successfully",
        user_id: user_id,
      });
    } catch (err) {
      console.error("WhatsApp config delete error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}