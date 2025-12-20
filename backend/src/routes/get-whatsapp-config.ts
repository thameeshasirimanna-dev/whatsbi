import { FastifyInstance } from 'fastify';

export default async function getWhatsappConfigRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.get('/get-whatsapp-config', async (request, reply) => {
    try {
      const query = request.query as any;
      let userId = query.user_id;

      // Validate required parameter
      if (!userId) {
        return reply.code(400).send({
          success: false,
          message: "user_id is required"
        });
      }

      // Validate user exists
      const { data: userExists, error: userCheckError } = await supabaseClient
        .from("users")
        .select("id, email")
        .eq("id", userId)
        .single();

      if (userCheckError || !userExists) {
        return reply.code(404).send({
          success: false,
          message: "User not found: " + userCheckError?.message
        });
      }

      // Get WhatsApp configuration using RPC
      const { data: configData, error: configError } = await supabaseClient.rpc('get_whatsapp_config', {
        p_user_id: userId
      });

      if (configError) {
        console.error('WhatsApp config retrieval error:', configError);
        return reply.code(400).send({
          success: false,
          message: "Failed to retrieve WhatsApp configuration: " + configError.message
        });
      }

      return reply.code(200).send({
        success: true,
        message: configData && configData.length > 0 ? "WhatsApp configuration found" : "No WhatsApp configuration set up for this user",
        user: userExists,
        whatsapp_config: configData || null,
        user_id: userId
      });

    } catch (err) {
      console.error("WhatsApp config retrieval error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}