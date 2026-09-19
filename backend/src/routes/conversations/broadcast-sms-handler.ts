import { FastifyReply, FastifyRequest } from 'fastify';
import {
  sendTextLkSms,
  normalizeSmsRecipient,
  interpolateSmsTemplate,
  getAgentSmsConfig,
} from '../../services/textlk-sms.service.js';
import { CacheService } from '../../utils/cache.js';

export interface SmsBroadcastContext {
  request: FastifyRequest;
  reply: FastifyReply;
  pgClient: any;
  cacheService: CacheService;
  emitNewMessage?: (agentId: number, messageData: any) => void;
  emitAgentStatusUpdate?: (agentId: number, statusData: any) => void;
  emitBroadcastUpdated?: (agentId: number, data: any) => void;
  agent: {
    id: number;
    agent_prefix: string;
    user_id: string;
    credits: number;
    sms_credits?: number;
  };
}

/**
 * Handles creation and asynchronous dispatch of an SMS broadcast campaign.
 */
export async function handleSmsBroadcastCreate(
  ctx: SmsBroadcastContext,
  body: any
) {
  const {
    reply,
    pgClient,
    agent,
    emitNewMessage,
    emitAgentStatusUpdate,
    emitBroadcastUpdated,
    cacheService,
  } = ctx;
  const agentPrefix = agent.agent_prefix;
  const { name, message, recipient_ids } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return reply.code(400).send({
      success: false,
      message: 'Campaign name is required',
    });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return reply.code(400).send({
      success: false,
      message: 'SMS message content is required',
    });
  }

  if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
    return reply.code(400).send({
      success: false,
      message: 'Recipient IDs list cannot be empty',
    });
  }

  // Resolve SMS Gateway credentials
  const { senderId, apiToken } = await getAgentSmsConfig(pgClient, agent.user_id);

  if (!senderId) {
    return reply.code(400).send({
      success: false,
      message:
        'SMS Sender ID is not configured for this agent. Please configure the Sender ID in the Super Admin Dashboard under WhatsApp/SMS settings.',
    });
  }

  if (!apiToken) {
    return reply.code(400).send({
      success: false,
      message:
        'SMS Gateway API Token is not configured. Please provide an API token in settings or set TEXTLK_API_TOKEN on the server.',
    });
  }

  // Calculate SMS parts and charge Rs. 1.00 per part per recipient
  const isUnicode = /[^\u0020-\u007E\u00A0-\u00FF\n\r\t]/.test(message || '');
  const msgLen = (message || '').length;
  const partsPerRecipient = isUnicode ? (msgLen <= 70 ? 1 : Math.ceil(msgLen / 67)) : (msgLen <= 160 ? 1 : Math.ceil(msgLen / 153));
  const costPerRecipient = partsPerRecipient * 1.0;
  const requiredCredits = recipient_ids.length * costPerRecipient;
  const availableSmsCredits = Number(agent.sms_credits ?? 0);

  if (availableSmsCredits < requiredCredits) {
    return reply.code(400).send({
      success: false,
      message: `Insufficient SMS credits. Required: Rs. ${Math.round(requiredCredits)} (${recipient_ids.length} recipients × ${partsPerRecipient} parts @ Rs. 1/SMS), Available: Rs. ${Math.round(availableSmsCredits)}`,
    });
  }

  // Resolve recipient customers
  const customersQuery = `
    SELECT id, name, phone
    FROM ${agentPrefix}_customers
    WHERE id = ANY($1)
  `;
  const { rows: targetCustomers } = await pgClient.query(customersQuery, [
    recipient_ids,
  ]);

  if (targetCustomers.length === 0) {
    return reply.code(400).send({
      success: false,
      message: 'No valid customers resolved for the provided recipient IDs',
    });
  }

  // Ensure table supports channel column and 'sms' message_type
  try {
    await pgClient.query(`
      ALTER TABLE ${agentPrefix}_broadcasts ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'whatsapp';
      ALTER TABLE ${agentPrefix}_broadcasts DROP CONSTRAINT IF EXISTS ${agentPrefix}_broadcasts_message_type_check;
    `);
  } catch {}

  // 1. Create SMS Broadcast Campaign Record
  let broadcastId: number;
  try {
    const insertBroadcastQuery = `
      INSERT INTO ${agentPrefix}_broadcasts (
        agent_id, name, channel, message_type, message, status, total_recipients
      )
      VALUES ($1, $2, 'sms', 'sms', $3, 'processing', $4)
      RETURNING id
    `;
    const { rows: broadcastRows } = await pgClient.query(insertBroadcastQuery, [
      agent.id,
      name.trim(),
      message.trim(),
      targetCustomers.length,
    ]);
    broadcastId = broadcastRows[0].id;
  } catch (insertErr: any) {
    if (insertErr.code === "42703" || String(insertErr.message).includes("channel")) {
      const fallbackInsertQuery = `
        INSERT INTO ${agentPrefix}_broadcasts (
          agent_id, name, message_type, message, status, total_recipients
        )
        VALUES ($1, $2, 'sms', $3, 'processing', $4)
        RETURNING id
      `;
      const { rows: fallbackRows } = await pgClient.query(fallbackInsertQuery, [
        agent.id,
        name.trim(),
        message.trim(),
        targetCustomers.length,
      ]);
      broadcastId = fallbackRows[0].id;
    } else {
      throw insertErr;
    }
  }

  // 2. Create Recipients Records (Pending)
  const insertRecipientsQuery = `
    INSERT INTO ${agentPrefix}_broadcast_recipients (broadcast_id, customer_id, phone, status)
    VALUES ${targetCustomers
      .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3}, 'pending')`)
      .join(', ')}
  `;
  const insertRecipientsParams: any[] = [broadcastId];
  targetCustomers.forEach((c: any) => {
    insertRecipientsParams.push(c.id);
    insertRecipientsParams.push(c.phone);
  });
  await pgClient.query(insertRecipientsQuery, insertRecipientsParams);

  // Return 202 Accepted immediately
  reply.code(202).send({
    success: true,
    message: 'SMS broadcast campaign started',
    broadcast_id: broadcastId,
  });

  if (emitBroadcastUpdated) {
    emitBroadcastUpdated(agent.id, {
      broadcast_id: broadcastId,
      sent_count: 0,
      failed_count: 0,
      total_recipients: targetCustomers.length,
      status: 'processing',
    });
  }

  // 3. Background Asynchronous Sending Loop
  (async () => {
    let sentCount = 0;
    let failedCount = 0;

    for (const customer of targetCustomers) {
      try {
        // Verify remaining SMS credits before sending
        const creditsRes = await pgClient.query(
          'SELECT sms_credits FROM agents WHERE id = $1',
          [agent.id]
        );
        const currentCredits = Number(creditsRes.rows[0]?.sms_credits ?? 0);
        if (currentCredits < costPerRecipient) {
          throw new Error(`Insufficient SMS credits left to send message (Required: Rs. ${costPerRecipient.toFixed(2)})`);
        }

        // Interpolate variables ({first_name}, {name}, {phone}, etc.) with customer data
        const personalizedMessage = interpolateSmsTemplate(message.trim(), customer);

        const smsResult = await sendTextLkSms({
          recipient: customer.phone,
          message: personalizedMessage,
          senderId,
          apiToken,
        });

        if (!smsResult.success) {
          throw new Error(smsResult.error || 'Failed to dispatch SMS via Text.lk');
        }

        // Insert message record into agent messages table
        const { rows: insertedMessageRows } = await pgClient.query(
          `INSERT INTO ${agentPrefix}_messages (customer_id, message, direction, timestamp, is_read)
           VALUES ($1, $2, 'outbound', now(), true)
           RETURNING *`,
          [customer.id, personalizedMessage]
        );

        // Deduct Rs. 1.00 per part from sms_credits and emit live credit update
        const { rows: creditRows } = await pgClient.query(
          'UPDATE agents SET sms_credits = GREATEST(0, sms_credits - $1) WHERE id = $2 RETURNING sms_credits',
          [costPerRecipient, agent.id]
        );
        if (emitAgentStatusUpdate && creditRows.length > 0) {
          emitAgentStatusUpdate(agent.id, {
            type: 'sms_credits_updated',
            sms_credits: parseFloat(creditRows[0].sms_credits),
          });
        }

        // Emit Socket event if configured
        if (emitNewMessage && insertedMessageRows.length > 0) {
          const insertedMessage = insertedMessageRows[0];
          emitNewMessage(agent.id, {
            id: insertedMessage.id,
            customer_id: insertedMessage.customer_id,
            customer_name: customer.name || customer.phone,
            customer_phone: customer.phone,
            message: insertedMessage.message,
            sender_type: 'agent',
            timestamp: insertedMessage.timestamp,
            media_type: 'none',
          });
        }

        // Invalidate cache
        await cacheService.invalidateRecentMessages(agent.id, customer.id);
        await cacheService.invalidateChatList(agent.id);

        // Update recipient status to 'sent'
        await pgClient.query(
          `UPDATE ${agentPrefix}_broadcast_recipients
           SET status = 'sent', sent_at = now()
           WHERE broadcast_id = $1 AND customer_id = $2`,
          [broadcastId, customer.id]
        );

        sentCount++;
      } catch (err: any) {
        console.error(`SMS Broadcast failed for customer ${customer.id}:`, err.message);

        // Update recipient status to 'failed'
        await pgClient.query(
          `UPDATE ${agentPrefix}_broadcast_recipients
           SET status = 'failed', error_message = $3
           WHERE broadcast_id = $1 AND customer_id = $2`,
          [broadcastId, customer.id, err.message || 'Unknown error']
        );

        failedCount++;
      }

      // Update broadcast counter progress and emit live broadcast update
      await pgClient.query(
        `UPDATE ${agentPrefix}_broadcasts
         SET sent_count = $1, failed_count = $2
         WHERE id = $3`,
        [sentCount, failedCount, broadcastId]
      );

      if (emitBroadcastUpdated) {
        emitBroadcastUpdated(agent.id, {
          broadcast_id: broadcastId,
          sent_count: sentCount,
          failed_count: failedCount,
          total_recipients: targetCustomers.length,
          status: 'processing',
        });
      }
    }

    const finalStatus = failedCount === targetCustomers.length ? 'failed' : 'completed';
    await pgClient.query(
      `UPDATE ${agentPrefix}_broadcasts
       SET status = $1, updated_at = now()
       WHERE id = $2`,
      [finalStatus, broadcastId]
    );

    if (emitBroadcastUpdated) {
      emitBroadcastUpdated(agent.id, {
        broadcast_id: broadcastId,
        sent_count: sentCount,
        failed_count: failedCount,
        total_recipients: targetCustomers.length,
        status: finalStatus,
      });
    }
  })();
}

/**
 * Handles retrying failed recipients of an SMS broadcast campaign.
 */
export async function handleSmsBroadcastResend(
  ctx: SmsBroadcastContext,
  broadcast: any
) {
  const {
    reply,
    pgClient,
    agent,
    emitNewMessage,
    emitAgentStatusUpdate,
    emitBroadcastUpdated,
    cacheService,
  } = ctx;
  const agentPrefix = agent.agent_prefix;
  const broadcastId = broadcast.id;

  // Find failed recipients
  const failedRecipientsQuery = `
    SELECT customer_id, phone
    FROM ${agentPrefix}_broadcast_recipients
    WHERE broadcast_id = $1 AND status = 'failed'
  `;
  const { rows: failedRecipients } = await pgClient.query(failedRecipientsQuery, [
    broadcastId,
  ]);

  if (failedRecipients.length === 0) {
    return reply.code(400).send({
      success: false,
      message: 'No failed recipients found to resend for this SMS campaign',
    });
  }

  // Check SMS credits for resend (Rs. 1.00 per part)
  const isUnicode = /[^\u0020-\u007E\u00A0-\u00FF\n\r\t]/.test(broadcast.message || '');
  const msgLen = (broadcast.message || '').length;
  const partsPerRecipient = isUnicode ? (msgLen <= 70 ? 1 : Math.ceil(msgLen / 67)) : (msgLen <= 160 ? 1 : Math.ceil(msgLen / 153));
  const costPerRecipient = partsPerRecipient * 1.0;
  const requiredCredits = failedRecipients.length * costPerRecipient;
  const availableSmsCredits = Number(agent.sms_credits ?? 0);

  if (availableSmsCredits < requiredCredits) {
    return reply.code(400).send({
      success: false,
      message: `Insufficient SMS credits. Required: Rs. ${Math.round(requiredCredits)}, Available: Rs. ${Math.round(availableSmsCredits)}`,
    });
  }

  // Resolve target customers
  const failedCustomerIds = failedRecipients.map((r: any) => r.customer_id);
  const customersQuery = `
    SELECT id, name, phone
    FROM ${agentPrefix}_customers
    WHERE id = ANY($1)
  `;
  const { rows: targetCustomers } = await pgClient.query(customersQuery, [
    failedCustomerIds,
  ]);

  const { senderId, apiToken } = await getAgentSmsConfig(pgClient, agent.user_id);

  if (!senderId || !apiToken) {
    return reply.code(400).send({
      success: false,
      message:
        'SMS Sender ID or API Token is missing. Please configure SMS credentials in Super Admin.',
    });
  }

  // Reset recipients status to 'pending'
  await pgClient.query(
    `UPDATE ${agentPrefix}_broadcast_recipients
     SET status = 'pending', error_message = NULL
     WHERE broadcast_id = $1 AND customer_id = ANY($2)`,
    [broadcastId, failedCustomerIds]
  );

  // Set campaign status back to processing
  await pgClient.query(
    `UPDATE ${agentPrefix}_broadcasts
     SET status = 'processing', failed_count = failed_count - $1
     WHERE id = $2`,
    [failedRecipients.length, broadcastId]
  );

  reply.code(202).send({
    success: true,
    message: 'Resending failed SMS broadcast messages started',
    broadcast_id: broadcastId,
  });

  if (emitBroadcastUpdated) {
    emitBroadcastUpdated(agent.id, {
      broadcast_id: broadcastId,
      sent_count: broadcast.sent_count,
      failed_count: broadcast.failed_count - failedRecipients.length,
      total_recipients: broadcast.total_recipients,
      status: 'processing',
    });
  }

  // Background sending loop
  (async () => {
    let sentCount = broadcast.sent_count;
    let failedCount = broadcast.failed_count - failedRecipients.length;

    for (const customer of targetCustomers) {
      try {
        const creditsRes = await pgClient.query(
          'SELECT sms_credits FROM agents WHERE id = $1',
          [agent.id]
        );
        const currentCredits = Number(creditsRes.rows[0]?.sms_credits ?? 0);
        if (currentCredits < costPerRecipient) {
          throw new Error(`Insufficient SMS credits left to send message (Required: Rs. ${costPerRecipient.toFixed(2)})`);
        }

        // Interpolate variables ({first_name}, {name}, {phone}, etc.) with customer data
        const personalizedMessage = interpolateSmsTemplate(broadcast.message, customer);

        const smsResult = await sendTextLkSms({
          recipient: customer.phone,
          message: personalizedMessage,
          senderId,
          apiToken,
        });

        if (!smsResult.success) {
          throw new Error(smsResult.error || 'Failed to dispatch SMS via Text.lk');
        }

        const { rows: insertedMessageRows } = await pgClient.query(
          `INSERT INTO ${agentPrefix}_messages (customer_id, message, direction, timestamp, is_read)
           VALUES ($1, $2, 'outbound', now(), true)
           RETURNING *`,
          [customer.id, personalizedMessage]
        );

        const { rows: creditRows } = await pgClient.query(
          'UPDATE agents SET sms_credits = GREATEST(0, sms_credits - $1) WHERE id = $2 RETURNING sms_credits',
          [costPerRecipient, agent.id]
        );
        if (emitAgentStatusUpdate && creditRows.length > 0) {
          emitAgentStatusUpdate(agent.id, {
            type: 'sms_credits_updated',
            sms_credits: parseFloat(creditRows[0].sms_credits),
          });
        }

        if (emitNewMessage && insertedMessageRows.length > 0) {
          const insertedMessage = insertedMessageRows[0];
          emitNewMessage(agent.id, {
            id: insertedMessage.id,
            customer_id: insertedMessage.customer_id,
            customer_name: customer.name || customer.phone,
            customer_phone: customer.phone,
            message: insertedMessage.message,
            sender_type: 'agent',
            timestamp: insertedMessage.timestamp,
            media_type: 'none',
          });
        }

        await cacheService.invalidateRecentMessages(agent.id, customer.id);
        await cacheService.invalidateChatList(agent.id);

        await pgClient.query(
          `UPDATE ${agentPrefix}_broadcast_recipients
           SET status = 'sent', sent_at = now()
           WHERE broadcast_id = $1 AND customer_id = $2`,
          [broadcastId, customer.id]
        );

        sentCount++;
      } catch (err: any) {
        console.error(`SMS retry failed for customer ${customer.id}:`, err.message);
        await pgClient.query(
          `UPDATE ${agentPrefix}_broadcast_recipients
           SET status = 'failed', error_message = $3
           WHERE broadcast_id = $1 AND customer_id = $2`,
          [broadcastId, customer.id, err.message || 'Unknown error']
        );
        failedCount++;
      }

      await pgClient.query(
        `UPDATE ${agentPrefix}_broadcasts
         SET sent_count = $1, failed_count = $2
         WHERE id = $3`,
        [sentCount, failedCount, broadcastId]
      );

      if (emitBroadcastUpdated) {
        emitBroadcastUpdated(agent.id, {
          broadcast_id: broadcastId,
          sent_count: sentCount,
          failed_count: failedCount,
          total_recipients: broadcast.total_recipients,
          status: 'processing',
        });
      }
    }

    const finalStatus = sentCount === 0 ? 'failed' : 'completed';
    await pgClient.query(
      `UPDATE ${agentPrefix}_broadcasts
       SET status = $1, updated_at = now()
       WHERE id = $2`,
      [finalStatus, broadcastId]
    );

    if (emitBroadcastUpdated) {
      emitBroadcastUpdated(agent.id, {
        broadcast_id: broadcastId,
        sent_count: sentCount,
        failed_count: failedCount,
        total_recipients: broadcast.total_recipients,
        status: finalStatus,
      });
    }
  })();
}
