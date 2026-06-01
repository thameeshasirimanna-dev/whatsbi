import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { verifyJWT } from '../../utils/helpers.js';

export default async function updateAgentRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.patch('/update-agent', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;

      if (!body.agent_id) {
        return reply.code(400).send({ success: false, message: 'agent_id is required' });
      }

      if (body.business_type && !['product', 'service'].includes(body.business_type)) {
        return reply.code(400).send({ success: false, message: "business_type must be 'product' or 'service'" });
      }

      // Fetch existing agent
      const { rows: agentRows } = await pgClient.query(
        'SELECT id, user_id FROM agents WHERE id = $1',
        [body.agent_id]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({ success: false, message: 'Agent not found' });
      }

      const agentUserId = agentRows[0].user_id;

      // Password update
      if (body.temp_password) {
        const passwordHash = await bcrypt.hash(body.temp_password, 10);
        await pgClient.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [passwordHash, agentUserId]
        );
      }

      // User fields update
      const userFields: string[] = [];
      const userValues: any[] = [];
      let idx = 1;

      if (body.agent_name) { userFields.push(`name = $${idx++}`); userValues.push(body.agent_name); }
      if (body.email)      { userFields.push(`email = $${idx++}`); userValues.push(body.email); }

      if (userFields.length > 0) {
        userValues.push(agentUserId);
        await pgClient.query(
          `UPDATE users SET ${userFields.join(', ')} WHERE id = $${idx}`,
          userValues
        );
      }

      // Agent fields update
      if (body.business_type) {
        await pgClient.query(
          'UPDATE agents SET business_type = $1 WHERE id = $2',
          [body.business_type, body.agent_id]
        );
      }

      // WhatsApp config update
      const hasWhatsAppFields =
        body.whatsapp_number || body.webhook_url || body.api_key ||
        body.business_account_id || body.phone_number_id || body.is_active !== undefined;

      if (hasWhatsAppFields) {
        const { rows: configRows } = await pgClient.query(
          'SELECT id FROM whatsapp_configuration WHERE user_id = $1',
          [agentUserId]
        );

        if (configRows.length > 0) {
          const waFields: string[] = [];
          const waValues: any[] = [];
          let wi = 1;

          if (body.whatsapp_number)    { waFields.push(`whatsapp_number = $${wi++}`);    waValues.push(body.whatsapp_number); }
          if (body.webhook_url)        { waFields.push(`webhook_url = $${wi++}`);         waValues.push(body.webhook_url); }
          if (body.api_key)            { waFields.push(`api_key = $${wi++}`);             waValues.push(body.api_key); }
          if (body.business_account_id){ waFields.push(`business_account_id = $${wi++}`); waValues.push(body.business_account_id); }
          if (body.phone_number_id)    { waFields.push(`phone_number_id = $${wi++}`);     waValues.push(body.phone_number_id); }
          if (body.is_active !== undefined) { waFields.push(`is_active = $${wi++}`); waValues.push(body.is_active); }

          if (waFields.length > 0) {
            waValues.push(agentUserId);
            await pgClient.query(
              `UPDATE whatsapp_configuration SET ${waFields.join(', ')} WHERE user_id = $${wi}`,
              waValues
            );
          }
        } else {
          await pgClient.query(
            `INSERT INTO whatsapp_configuration
              (user_id, whatsapp_number, webhook_url, api_key, business_account_id, phone_number_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              agentUserId,
              body.whatsapp_number || null,
              body.webhook_url || null,
              body.api_key || null,
              body.business_account_id || null,
              body.phone_number_id || null,
              body.is_active !== undefined ? body.is_active : false,
            ]
          );
        }
      }

      return reply.code(200).send({
        success: true,
        message: 'Agent updated successfully',
        changes_made: {
          agent_details: userFields.length > 0 || !!body.business_type,
          whatsapp_config: hasWhatsAppFields,
          password: !!body.temp_password,
        },
      });
    } catch (err) {
      console.error('Update agent error:', err);
      return reply.code(500).send({ success: false, message: 'Server error: ' + (err as Error).message });
    }
  });
}
