/**
 * AI Lead Stage Management & Team Conversion Service
 *
 * Provides authoritative lifecycle management for customer pipeline stages:
 * - lead_stage: ('New Lead', 'Contacted', 'Not Responding', 'Follow-up Needed')
 * - interest_stage: ('Interested', 'Quotation Sent', 'Asked for More Info')
 * - conversion_stage: ('Payment Pending', 'Paid', 'Order Confirmed')
 *
 * CRITICAL BUSINESS RULE:
 * The AI Agent can advance leads, record interest, and mark conversion as 'Payment Pending'.
 * The AI Agent is strictly prohibited from setting conversion_stage to 'Paid'.
 * Only human staff manually verifying bank accounts / slips and clicking 'Mark as Paid'
 * on an order or invoice officially establishes the customer's 'Paid' lead stage.
 */

import { validateAgentPrefix } from './ai-business-context.js';
import { CacheService } from '../utils/cache.js';
import { syncCustomerLeadStageGroup } from '../routes/customers/manage-customer-groups.js';

export type LeadStage = 'New Lead' | 'Contacted' | 'Not Responding' | 'Follow-up Needed';
export type InterestStage = 'Interested' | 'Quotation Sent' | 'Asked for More Info';
export type ConversionStage = 'Payment Pending' | 'Paid' | 'Order Confirmed';

export const VALID_LEAD_STAGES: readonly LeadStage[] = [
  'New Lead',
  'Contacted',
  'Not Responding',
  'Follow-up Needed',
] as const;

export const VALID_INTEREST_STAGES: readonly InterestStage[] = [
  'Interested',
  'Quotation Sent',
  'Asked for More Info',
] as const;

export const VALID_CONVERSION_STAGES: readonly ConversionStage[] = [
  'Payment Pending',
  'Paid',
  'Order Confirmed',
] as const;

export interface LeadStageUpdatePayload {
  lead_stage?: string | null;
  interest_stage?: string | null;
  conversion_stage?: string | null;
  lead_stage_note?: string | null;
  notes?: string | null;
  note?: string | null;
}

export interface SanitizedLeadStageUpdates {
  lead_stage?: LeadStage;
  interest_stage?: InterestStage | null;
  conversion_stage?: ConversionStage | null;
  lead_stage_note?: string | null;
}

/**
 * Validates and sanitizes stage updates.
 * When called by the AI agent (isTeamManual = false):
 * - Blocks setting conversion_stage to 'Paid' (redirects to 'Payment Pending').
 * - Preserves existing 'Paid' conversion stage so converted customers are never demoted.
 */
export function validateAndSanitizeLeadStageUpdate({
  payload,
  currentCustomer,
  isTeamManual = false,
}: {
  payload: LeadStageUpdatePayload;
  currentCustomer?: {
    lead_stage?: string | null;
    interest_stage?: string | null;
    conversion_stage?: string | null;
    lead_stage_note?: string | null;
  } | null;
  isTeamManual?: boolean;
}): SanitizedLeadStageUpdates {
  const result: SanitizedLeadStageUpdates = {};
  if (!payload || typeof payload !== 'object') return result;

  // 1. Validate lead_stage
  if (payload.lead_stage && typeof payload.lead_stage === 'string') {
    const matchedLead = VALID_LEAD_STAGES.find(
      (s) => s.toLowerCase() === payload.lead_stage!.trim().toLowerCase()
    );
    if (matchedLead) {
      result.lead_stage = matchedLead;
    }
  }

  // 2. Validate interest_stage
  if (payload.interest_stage !== undefined) {
    if (payload.interest_stage === null || payload.interest_stage === '') {
      result.interest_stage = null;
    } else if (typeof payload.interest_stage === 'string') {
      const matchedInterest = VALID_INTEREST_STAGES.find(
        (s) => s.toLowerCase() === payload.interest_stage!.trim().toLowerCase()
      );
      if (matchedInterest) {
        result.interest_stage = matchedInterest;
      }
    }
  }

  // 3. Validate conversion_stage
  if (payload.conversion_stage !== undefined) {
    if (payload.conversion_stage === null || payload.conversion_stage === '') {
      // If customer is already Paid, do not allow wiping out conversion_stage
      if (currentCustomer?.conversion_stage !== 'Paid') {
        result.conversion_stage = null;
      }
    } else if (typeof payload.conversion_stage === 'string') {
      const rawConv = payload.conversion_stage.trim().toLowerCase();
      const matchedConv = VALID_CONVERSION_STAGES.find(
        (s) => s.toLowerCase() === rawConv
      );

      if (matchedConv) {
        if (!isTeamManual && matchedConv === 'Paid') {
          // AI AGENT GUARD: AI is strictly prohibited from marking stage as 'Paid'
          console.warn(
            '[Lead Stage] AI agent attempted to set conversion_stage to "Paid". Enforcing "Payment Pending" pending team manual verification.'
          );
          if (currentCustomer?.conversion_stage !== 'Paid') {
            result.conversion_stage = 'Payment Pending';
            if (!payload.lead_stage_note && !payload.note && !payload.notes) {
              result.lead_stage_note = 'Payment reported by customer; pending team manual verification';
            }
          }
        } else {
          // If current customer is already 'Paid', non-manual update cannot downgrade to 'Payment Pending'
          if (!isTeamManual && currentCustomer?.conversion_stage === 'Paid') {
            result.conversion_stage = 'Paid';
          } else {
            result.conversion_stage = matchedConv;
          }
        }
      }
    }
  }

  // 4. Notes
  const rawNote = payload.lead_stage_note || payload.note || payload.notes;
  if (rawNote !== undefined && rawNote !== null) {
    const trimmed = String(rawNote).trim();
    if (trimmed.length > 0) {
      result.lead_stage_note = trimmed;
    }
  }

  return result;
}

/**
 * Executes a customer stage update in the database, invalidates cache,
 * and notifies connected web clients over Socket.IO.
 */
export async function executeLeadStageUpdate({
  agent,
  customerId,
  updates,
  isTeamManual = false,
  pgClient,
  cacheService,
  emitAgentStatusUpdate,
}: {
  agent: { id: number; agent_prefix: string; [key: string]: any };
  customerId: number;
  updates: LeadStageUpdatePayload;
  isTeamManual?: boolean;
  pgClient: any;
  cacheService?: CacheService;
  emitAgentStatusUpdate?: (agentId: number, statusData: any) => void;
}) {
  const agentPrefix = validateAgentPrefix(agent.agent_prefix);
  const customersTable = `${agentPrefix}_customers`;

  // 1. Fetch current customer stages for validation
  const { rows: currentRows } = await pgClient.query(
    `SELECT id, name, phone, lead_stage, interest_stage, conversion_stage, lead_stage_note 
     FROM ${customersTable} 
     WHERE id = $1`,
    [customerId]
  );

  if (currentRows.length === 0) {
    throw new Error(`Customer #${customerId} not found`);
  }

  const currentCustomer = currentRows[0];
  const sanitized = validateAndSanitizeLeadStageUpdate({
    payload: updates,
    currentCustomer,
    isTeamManual,
  });

  const setParts: string[] = [];
  const params: any[] = [customerId];
  let pIdx = 2;

  if (sanitized.lead_stage !== undefined) {
    setParts.push(`lead_stage = $${pIdx++}`);
    params.push(sanitized.lead_stage);
  }
  if (sanitized.interest_stage !== undefined) {
    setParts.push(`interest_stage = $${pIdx++}`);
    params.push(sanitized.interest_stage);
  }
  if (sanitized.conversion_stage !== undefined) {
    setParts.push(`conversion_stage = $${pIdx++}`);
    params.push(sanitized.conversion_stage);
  }
  if (sanitized.lead_stage_note !== undefined) {
    setParts.push(`lead_stage_note = $${pIdx++}`);
    params.push(sanitized.lead_stage_note);
  }

  if (setParts.length === 0) {
    return currentCustomer;
  }

  const query = `
    UPDATE ${customersTable}
    SET ${setParts.join(', ')}
    WHERE id = $1
    RETURNING id, name, phone, lead_stage, interest_stage, conversion_stage, lead_stage_note
  `;

  const { rows: updatedRows } = await pgClient.query(query, params);
  const updatedCustomer = updatedRows[0];

  console.log(
    `[Lead Stage] Updated Customer #${customerId}: lead_stage="${updatedCustomer.lead_stage}", interest_stage="${updatedCustomer.interest_stage}", conversion_stage="${updatedCustomer.conversion_stage}" (isTeamManual=${isTeamManual})`
  );

  // Invalidate chat list cache
  if (cacheService) {
    await cacheService.invalidateChatList(agent.id).catch((err: any) => {
      console.warn('[Lead Stage] Cache invalidation warning:', err.message);
    });
  }

  // Real-time notification over Socket.IO
  if (emitAgentStatusUpdate) {
    emitAgentStatusUpdate(agent.id, {
      type: 'lead_stage_updated',
      customerId: updatedCustomer.id,
      leadStage: updatedCustomer.lead_stage,
      interestStage: updatedCustomer.interest_stage,
      conversionStage: updatedCustomer.conversion_stage,
      leadStageNote: updatedCustomer.lead_stage_note,
    });
  }

  if (sanitized.lead_stage !== undefined && updatedCustomer?.lead_stage) {
    syncCustomerLeadStageGroup(pgClient, agentPrefix, agent.id, updatedCustomer.id, updatedCustomer.lead_stage).catch(() => {});
  }

  return updatedCustomer;
}

/**
 * Automatically synchronizes customer pipeline stage during conversation turns
 * to guarantee progress even if DeepSeek omits the explicit action tag.
 */
export async function syncAutonomousLeadStage({
  agent,
  customer,
  stage,
  incomingText,
  actionsExecuted = [],
  pgClient,
  cacheService,
  emitAgentStatusUpdate,
}: {
  agent: { id: number; agent_prefix: string; [key: string]: any };
  customer: any;
  stage: 'inquiry' | 'confirmation' | 'paid' | 'appointment';
  incomingText?: string;
  actionsExecuted?: Array<{ type: string; success: boolean; data?: any }>;
  pgClient: any;
  cacheService?: CacheService;
  emitAgentStatusUpdate?: (agentId: number, statusData: any) => void;
}) {
  if (!customer?.id) return;

  const currentLead = customer.lead_stage || 'New Lead';
  const currentInterest = customer.interest_stage || null;
  const currentConv = customer.conversion_stage || null;

  const updates: LeadStageUpdatePayload = {};
  let shouldUpdate = false;

  // 1. Initial engagement: Advance 'New Lead' to 'Contacted'
  if (currentLead === 'New Lead') {
    updates.lead_stage = 'Contacted';
    shouldUpdate = true;
  }

  // 2. Invoice generated / Confirmation stage: Quotation Sent + Payment Pending
  const hasSuccessfulInvoiceAction = actionsExecuted.some(
    (a) => (a.type === 'CREATE_INVOICE' || a.type === 'UPDATE_INVOICE') && a.success
  );

  if (hasSuccessfulInvoiceAction || stage === 'confirmation') {
    if (currentInterest !== 'Quotation Sent') {
      updates.interest_stage = 'Quotation Sent';
      shouldUpdate = true;
    }
    // Only set Payment Pending if not already Paid
    if (currentConv !== 'Paid' && currentConv !== 'Payment Pending') {
      updates.conversion_stage = 'Payment Pending';
      shouldUpdate = true;
    }
  }

  // 3. Payment Slip submitted or reported paid (Stage C):
  if (stage === 'paid') {
    // If not already paid, ensure status is Payment Pending with clear note
    if (currentConv !== 'Paid') {
      updates.conversion_stage = 'Payment Pending';
      updates.lead_stage_note = 'Payment slip submitted by customer; pending team manual verification';
      shouldUpdate = true;
    }
  }

  // 4. Appointment Stage (Stage D): Set Interested if interest stage is null
  if (stage === 'appointment' && !currentInterest) {
    updates.interest_stage = 'Interested';
    shouldUpdate = true;
  }

  // 5. Inquiry Stage with active exploration:
  if (stage === 'inquiry' && !currentInterest) {
    updates.interest_stage = 'Interested';
    shouldUpdate = true;
  }

  if (shouldUpdate) {
    try {
      const updated = await executeLeadStageUpdate({
        agent,
        customerId: customer.id,
        updates,
        isTeamManual: false,
        pgClient,
        cacheService,
        emitAgentStatusUpdate,
      });
      // Synchronize in-memory customer object
      if (updated) {
        customer.lead_stage = updated.lead_stage;
        customer.interest_stage = updated.interest_stage;
        customer.conversion_stage = updated.conversion_stage;
        customer.lead_stage_note = updated.lead_stage_note;
      }
    } catch (err: any) {
      console.error('[Lead Stage] Error during autonomous stage sync:', err.message || err);
    }
  }
}

/**
 * Authoritative conversion function invoked when a team member manually marks
 * an order or invoice as paid in the CRM.
 *
 * This represents the definitive, verified 'Paid' conversion stage in the lead funnel.
 */
export async function markCustomerAsPaidByTeam({
  agent,
  customerId,
  orderId,
  invoiceId,
  note,
  pgClient,
  cacheService,
  emitAgentStatusUpdate,
}: {
  agent: { id: number; agent_prefix: string; [key: string]: any };
  customerId: number;
  orderId?: number | null;
  invoiceId?: number | null;
  note?: string;
  pgClient: any;
  cacheService?: CacheService;
  emitAgentStatusUpdate?: (agentId: number, statusData: any) => void;
}) {
  const contextNote = note
    || (orderId ? `Order #${orderId} marked as fully paid by team` : null)
    || (invoiceId ? `Invoice #${invoiceId} verified and marked as paid by team` : null)
    || 'Payment verified and marked as paid by team';

  return executeLeadStageUpdate({
    agent,
    customerId,
    updates: {
      lead_stage: 'Contacted',
      conversion_stage: 'Paid',
      lead_stage_note: contextNote,
    },
    isTeamManual: true, // Crucial: Explicitly authorizes 'Paid' stage
    pgClient,
    cacheService,
    emitAgentStatusUpdate,
  });
}
