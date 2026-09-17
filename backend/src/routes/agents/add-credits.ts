import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function addCreditsRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  emitAgentStatusUpdate: (agentId: number, statusData: any) => void
) {
  const handleAddCredits = async (request: any, reply: any, forcedType?: 'ai' | 'template') => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Check if user is admin
      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          error: 'Access denied. Admin role required.',
        });
      }

      const { agent_id, amount, balance_type = forcedType || 'ai' } = request.body as any;

      // Validate input
      if (!agent_id || amount === undefined || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid input: agent_id and positive amount required',
        });
      }

      const resolvedType = forcedType || balance_type;
      const numAmount = parseFloat(amount);
      const parsedAgentId = parseInt(agent_id, 10);

      if (isNaN(parsedAgentId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid agent_id: must be a valid integer ID',
        });
      }

      if (resolvedType === 'template') {
        // Update template message credits
        const updateQuery = 'UPDATE agents SET credits = credits + $1 WHERE id = $2 RETURNING credits';
        const { rows: updateRows } = await pgClient.query(updateQuery, [
          numAmount,
          parsedAgentId,
        ]);

        if (updateRows.length === 0) {
          return reply.code(404).send({
            success: false,
            error: 'Agent not found',
          });
        }

        const newCredits = parseFloat(updateRows[0].credits);

        emitAgentStatusUpdate(parsedAgentId, {
          type: 'credits_updated',
          credits: newCredits,
        });

        return reply.code(200).send({
          success: true,
          message: 'Credits added successfully',
          credits: newCredits,
          balance_type: 'template',
        });
      } else {
        // Update DeepSeek AI balance
        const updateQuery =
          'UPDATE agents SET ai_balance = ai_balance + $1 WHERE id = $2 RETURNING ai_balance, credits';
        const { rows: updateRows } = await pgClient.query(updateQuery, [
          numAmount,
          parsedAgentId,
        ]);

        if (updateRows.length === 0) {
          return reply.code(404).send({
            success: false,
            error: 'Agent not found',
          });
        }

        const newAiBalance = parseFloat(updateRows[0].ai_balance);

        emitAgentStatusUpdate(parsedAgentId, {
          type: 'ai_balance_updated',
          ai_balance: newAiBalance,
          balance: newAiBalance,
        });

        return reply.code(200).send({
          success: true,
          message: 'Credits added successfully',
          ai_balance: newAiBalance,
          balance_type: 'ai',
        });
      }
    } catch (error) {
      console.error(error);
      return reply.code(400).send({
        success: false,
        error: (error as Error).message,
      });
    }
  };

  fastify.post('/add-credits', (req, rep) => handleAddCredits(req, rep));
  fastify.post('/admin/topup-ai', (req, rep) => handleAddCredits(req, rep, 'ai'));
  fastify.post('/admin/topup-credits', (req, rep) => handleAddCredits(req, rep, 'template'));
}