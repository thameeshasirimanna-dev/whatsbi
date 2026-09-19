import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function updateWhatsappConfigRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.put('/update-whatsapp-config', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;

      const targetUserId = authenticatedUser.role === 'admin' ? (body.user_id || authenticatedUser.id) : authenticatedUser.id;

      // Get agent details (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, user_id FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
        [targetUserId]
      );

      if (agentRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Agent not found for user",
        });
      }

      const agentData = agentRows[0];

      // Only the agent owner or admin can manage WhatsApp settings
      if (authenticatedUser.role !== 'admin' && agentData.user_id !== authenticatedUser.id) {
        return reply.code(403).send({
          success: false,
          message: "Access denied. Only the agent owner or administrator can manage WhatsApp settings."
        });
      }

      const configUserId = agentData.user_id || targetUserId;

      // Ensure whatsapp_configuration columns and constraints are ready
      try {
        await pgClient.query(`
          ALTER TABLE whatsapp_configuration ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT;
          ALTER TABLE whatsapp_configuration ADD COLUMN IF NOT EXISTS whatsapp_app_secret TEXT;
          ALTER TABLE whatsapp_configuration ADD COLUMN IF NOT EXISTS sms_sender_id TEXT;
          ALTER TABLE whatsapp_configuration ADD COLUMN IF NOT EXISTS sms_api_token TEXT;
          ALTER TABLE whatsapp_configuration ALTER COLUMN webhook_url DROP NOT NULL;
        `);
      } catch (colErr: any) {
        console.warn("Notice: could not alter whatsapp_configuration columns:", colErr.message);
      }

      const trimmedDeepSeekKey = body.deepseek_api_key !== undefined && body.deepseek_api_key !== null
        ? String(body.deepseek_api_key).trim() || null
        : null;

      let updateSetClauses = [
        "whatsapp_number = COALESCE($1, whatsapp_number)",
        "webhook_url = COALESCE($2, webhook_url, '')",
        "api_key = COALESCE($3, api_key)",
        "business_account_id = COALESCE($4, business_account_id)",
        "phone_number_id = COALESCE($5, phone_number_id)",
        "is_active = COALESCE($6, is_active)",
      ];

      const params: any[] = [
        body.whatsapp_number || null,
        body.webhook_url !== undefined ? body.webhook_url : null,
        body.api_key || null,
        body.business_account_id || null,
        body.phone_number_id || null,
        body.is_active !== undefined ? body.is_active : null,
      ];

      if (body.deepseek_api_key !== undefined) {
        params.push(trimmedDeepSeekKey);
        updateSetClauses.push(`deepseek_api_key = $${params.length}`);
      }

      if (body.whatsapp_app_secret !== undefined) {
        params.push(body.whatsapp_app_secret || null);
        updateSetClauses.push(`whatsapp_app_secret = $${params.length}`);
      }

      if (body.sms_sender_id !== undefined) {
        const trimmedSenderId = body.sms_sender_id !== null ? String(body.sms_sender_id).trim() || null : null;
        params.push(trimmedSenderId);
        updateSetClauses.push(`sms_sender_id = $${params.length}`);
      }

      if (body.sms_api_token !== undefined) {
        const trimmedApiToken = body.sms_api_token !== null ? String(body.sms_api_token).trim() || null : null;
        params.push(trimmedApiToken);
        updateSetClauses.push(`sms_api_token = $${params.length}`);
      }

      params.push(configUserId);
      const updateQuery = `
        UPDATE whatsapp_configuration
        SET ${updateSetClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${params.length}
        RETURNING row_to_json(whatsapp_configuration.*)::jsonb AS config;
      `;

      let configData;
      try {
        const { rows: updateRows } = await pgClient.query(updateQuery, params);
        if (updateRows.length === 0) {
          return reply.code(404).send({
            success: false,
            message: "No WhatsApp configuration found to update",
          });
        }
        configData = updateRows[0].config;
      } catch (sqlErr: any) {
        console.error("Direct UPDATE failed:", sqlErr);
        return reply.code(500).send({
          success: false,
          message: "Database error: " + sqlErr.message,
        });
      }

      return reply.code(200).send({
        success: true,
        message: "WhatsApp configuration updated successfully",
        whatsapp_config: configData,
        user_id: agentData.user_id,
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