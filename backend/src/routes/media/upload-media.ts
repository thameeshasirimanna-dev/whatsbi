import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { verifyJWT } from '../../utils/helpers';

export default async function uploadMediaRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post("/upload-media", async (request, reply) => {
    const startTime = Date.now();

    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);
      const userId = authenticatedUser.id;

      // Get agent info
      const { data: agent, error: agentError } = await supabaseClient
        .from("agents")
        .select("id, agent_prefix")
        .eq("user_id", userId)
        .single();

      if (agentError || !agent) {
        console.error(
          "❌ Agent not found for user",
          userId,
          ":",
          agentError?.message
        );
        return reply
          .code(403)
          .send({ error: "Agent not found for authenticated user" });
      }

      const agentPrefix = agent.agent_prefix;
      if (!agentPrefix) {
        console.error("❌ Agent prefix not configured for agent", agent.id);
        return reply.code(400).send({ error: "Agent prefix not configured" });
      }

      // Get WhatsApp config
      const { data: whatsappConfig, error: configError } = await supabaseClient
        .from("whatsapp_configuration")
        .select("api_key, phone_number_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (configError || !whatsappConfig) {
        console.error("❌ WhatsApp config not found:", configError?.message);
        return reply
          .code(404)
          .send({ error: "WhatsApp configuration not found" });
      }

      const accessToken = whatsappConfig.api_key;
      const phoneNumberId = whatsappConfig.phone_number_id;

      if (!accessToken || !phoneNumberId) {
        console.error("❌ Invalid WhatsApp configuration");
        return reply
          .code(400)
          .send({ error: "Invalid WhatsApp configuration" });
      }

      // Parse form data - simplified for now
      // Note: In a real implementation, you'd use multipart parsing
      // For now, assuming the body is parsed as JSON or form data
      const formData = request.body as any; // This needs proper multipart handling
      const files: any[] = []; // Placeholder
      const caption = formData?.caption || "";

      if (files.length === 0) {
        console.error("❌ No files provided in request");
        return reply.code(400).send({ error: "No files provided" });
      }

      // Validate files and upload logic would go here
      // This is a placeholder - the full implementation needs multipart parsing

      return reply.code(200).send({
        success: true,
        uploaded: 0, // placeholder
        total: files.length,
        media: [], // placeholder
        errors: [],
      });
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      console.error(
        `💥 Upload-media function failed after ${totalDuration}ms:`,
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return reply
        .code(500)
        .send({ error: "Internal server error", details: errorMessage });
    }
  });
}