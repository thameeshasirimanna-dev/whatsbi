import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function addCreditsRoutes(
  fastify: FastifyInstance,
  supabaseClient: any,
  emitAgentStatusUpdate: (agentId: number, statusData: any) => void
) {
  fastify.post("/add-credits", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const { agent_id, amount } = request.body as any;

      // Validate input
      if (!agent_id || !amount || amount <= 0) {
        return reply.code(400).send({
          error: "Invalid input: agent_id and positive amount required",
        });
      }

      // Check if agent exists
      const { data: agent, error: agentError } = await supabaseClient
        .from("agents")
        .select("id")
        .eq("id", agent_id)
        .single();

      if (agentError || !agent) {
        return reply.code(400).send({
          error: "Agent not found",
        });
      }

      // Call the RPC function to add credits
      const { data, error } = await supabaseClient.rpc("add_credits", {
        p_agent_id: agent_id,
        p_amount: amount,
      });

      if (error) {
        return reply.code(400).send({
          error: error.message,
        });
      }

      // Emit agent status update
      emitAgentStatusUpdate(agent_id, {
        type: "credits_updated",
        credits: data,
      });

      return reply.code(200).send({
        message: "Credits added successfully",
        credits: data,
      });
    } catch (error) {
      console.error(error);
      return reply.code(400).send({
        error: (error as Error).message,
      });
    }
  });
}