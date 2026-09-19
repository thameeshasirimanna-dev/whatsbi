import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function addCreditsRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  emitAgentStatusUpdate: (agentId: number, statusData: any) => void
) {
  // Ensure credits and sms_credits column defaults exist in agents table (300 WA credits = 10 msgs, 100 SMS credits = 100 SMS)
  try {
    await pgClient.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS sms_credits NUMERIC(10, 2) DEFAULT 100.00');
    await pgClient.query('ALTER TABLE agents ALTER COLUMN credits SET DEFAULT 300.00');
    await pgClient.query('ALTER TABLE agents ALTER COLUMN sms_credits SET DEFAULT 100.00');
  } catch (colErr) {
    console.warn('Could not auto-configure credit defaults on agents table:', colErr);
  }

  const handleAddCredits = async (request: any, reply: any, forcedType?: 'ai' | 'template' | 'whatsapp' | 'sms') => {
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

      if (resolvedType === 'sms') {
        // Update Normal SMS message credits (Rs. 1.00 / SMS)
        const updateQuery =
          'UPDATE agents SET sms_credits = COALESCE(sms_credits, 0) + $1 WHERE id = $2 RETURNING sms_credits, credits, ai_balance';
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

        const newSmsCredits = parseFloat(updateRows[0].sms_credits);

        emitAgentStatusUpdate(parsedAgentId, {
          type: 'sms_credits_updated',
          sms_credits: newSmsCredits,
        });

        return reply.code(200).send({
          success: true,
          message: `Added Rs. ${numAmount.toFixed(2)} SMS credits successfully`,
          sms_credits: newSmsCredits,
          balance_type: 'sms',
        });
      } else if (resolvedType === 'template' || resolvedType === 'whatsapp') {
        // Update WhatsApp Marketing template credits (Rs. 30.00 / msg)
        const updateQuery =
          'UPDATE agents SET credits = COALESCE(credits, 0) + $1 WHERE id = $2 RETURNING credits, sms_credits, ai_balance';
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
          whatsapp_credits: newCredits,
        });

        return reply.code(200).send({
          success: true,
          message: `Added Rs. ${numAmount.toFixed(2)} WhatsApp Marketing credits successfully`,
          credits: newCredits,
          whatsapp_credits: newCredits,
          balance_type: 'whatsapp',
        });
      } else {
        // Update DeepSeek AI balance (USD)
        const updateQuery =
          'UPDATE agents SET ai_balance = COALESCE(ai_balance, 0) + $1 WHERE id = $2 RETURNING ai_balance, credits, sms_credits';
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
          message: `Added $${numAmount.toFixed(2)} USD DeepSeek AI balance successfully`,
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
  fastify.post('/admin/topup-credits', (req, rep) => handleAddCredits(req, rep, 'whatsapp'));
  fastify.post('/admin/topup-whatsapp', (req, rep) => handleAddCredits(req, rep, 'whatsapp'));
  fastify.post('/admin/topup-sms', (req, rep) => handleAddCredits(req, rep, 'sms'));
}