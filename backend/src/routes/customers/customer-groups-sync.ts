/**
 * Customer Groups Synchronization & Database Trigger Management
 * Guarantees automatic, real-time synchronization between CRM customer pipeline stages
 * (Lead stages, Interest stages, Conversion stages) and default system customer groups:
 *
 * 1. Lead Stages (Initial Funnel):
 *    - 'New Lead', 'Contacted', 'Follow-up Needed', 'Not Responding'
 * 2. Interest Stages (Mid Funnel):
 *    - 'Interested', 'Quotation Sent', 'Asked for More Info'
 * 3. Conversion Stages (Bottom Funnel):
 *    - 'Payment Pending', 'Paid', 'Order Confirmed'
 */

export const DEFAULT_PIPELINE_GROUPS = [
  // 1. Initial Lead Stages
  {
    name: 'New Lead',
    description: 'Default group for newly acquired leads',
    color: '#3B82F6',
    category: 'lead',
  },
  {
    name: 'Contacted',
    description: 'Default group for contacted leads',
    color: '#8B5CF6',
    category: 'lead',
  },
  {
    name: 'Follow-up Needed',
    description: 'Default group for leads requiring follow-up',
    color: '#F59E0B',
    category: 'lead',
  },
  {
    name: 'Not Responding',
    description: 'Default group for inactive or unresponsive leads',
    color: '#6B7280',
    category: 'lead',
  },
  // 2. Mid-Funnel Interest Stages
  {
    name: 'Interested',
    description: 'Default group for leads actively showing interest',
    color: '#10B981',
    category: 'interest',
  },
  {
    name: 'Quotation Sent',
    description: 'Default group for leads who received a price quotation',
    color: '#06B6D4',
    category: 'interest',
  },
  {
    name: 'Asked for More Info',
    description: 'Default group for leads requesting product or service details',
    color: '#EC4899',
    category: 'interest',
  },
  // 3. Bottom-Funnel Conversion Stages
  {
    name: 'Payment Pending',
    description: 'Default group for customers awaiting invoice or payment confirmation',
    color: '#EAB308',
    category: 'conversion',
  },
  {
    name: 'Paid',
    description: 'Default group for paying customers',
    color: '#22C55E',
    category: 'conversion',
  },
  {
    name: 'Order Confirmed',
    description: 'Default group for customers with confirmed orders',
    color: '#16A34A',
    category: 'conversion',
  },
] as const;

export const INTEREST_STAGE_NAMES = ['Interested', 'Quotation Sent', 'Asked for More Info'];
export const CONVERSION_STAGE_NAMES = ['Payment Pending', 'Paid', 'Order Confirmed'];
export const LEAD_STAGE_NAMES = ['New Lead', 'Contacted', 'Follow-up Needed', 'Not Responding'];

/**
 * Normalizes any lead stage string into canonical format
 */
export function normalizeLeadStageName(leadStage?: string | null): string {
  if (!leadStage || typeof leadStage !== 'string' || !leadStage.trim()) {
    return 'New Lead';
  }
  const clean = leadStage.trim().toLowerCase();
  if (clean === 'new lead' || clean === 'new_lead' || clean === 'new') {
    return 'New Lead';
  }
  if (clean === 'contacted') {
    return 'Contacted';
  }
  if (clean === 'follow-up needed' || clean === 'follow-up' || clean === 'follow_up_needed' || clean === 'follow_up') {
    return 'Follow-up Needed';
  }
  if (clean === 'not responding' || clean === 'not_responding') {
    return 'Not Responding';
  }
  return leadStage.trim();
}

/**
 * Reconciles all customers in the tenant database so each customer belongs
 * to the default stage groups matching their current lead_stage, interest_stage, and conversion_stage.
 */
export async function reconcileLeadStageGroupMemberships(pgClient: any, agentPrefix: string, agentId: number) {
  try {
    // 1. Remove memberships in default groups where the group does NOT match any of the customer's active stages
    await pgClient.query(`
      DELETE FROM ${agentPrefix}_customer_group_members gm
      USING ${agentPrefix}_customer_groups g, ${agentPrefix}_customers c
      WHERE gm.group_id = g.id
        AND gm.customer_id = c.id
        AND g.is_default = true
        AND lower(g.name) != lower(
          CASE 
            WHEN c.lead_stage IS NULL OR trim(c.lead_stage) = '' THEN 'New Lead'
            WHEN lower(trim(c.lead_stage)) IN ('new lead', 'new_lead') THEN 'New Lead'
            WHEN lower(trim(c.lead_stage)) = 'contacted' THEN 'Contacted'
            WHEN lower(trim(c.lead_stage)) IN ('follow-up needed', 'follow-up', 'follow_up_needed', 'follow_up') THEN 'Follow-up Needed'
            WHEN lower(trim(c.lead_stage)) IN ('not responding', 'not_responding') THEN 'Not Responding'
            ELSE c.lead_stage
          END
        )
        AND (c.interest_stage IS NULL OR trim(c.interest_stage) = '' OR lower(g.name) != lower(trim(c.interest_stage)))
        AND (c.conversion_stage IS NULL OR trim(c.conversion_stage) = '' OR lower(g.name) != lower(trim(c.conversion_stage)));
    `);

    // 2. Insert missing lead stage memberships
    await pgClient.query(`
      INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id)
      SELECT g.id, c.id
      FROM ${agentPrefix}_customers c
      JOIN ${agentPrefix}_customer_groups g ON (
        g.is_default = true
        AND lower(g.name) = lower(
          CASE 
            WHEN c.lead_stage IS NULL OR trim(c.lead_stage) = '' THEN 'New Lead'
            WHEN lower(trim(c.lead_stage)) IN ('new lead', 'new_lead') THEN 'New Lead'
            WHEN lower(trim(c.lead_stage)) = 'contacted' THEN 'Contacted'
            WHEN lower(trim(c.lead_stage)) IN ('follow-up needed', 'follow-up', 'follow_up_needed', 'follow_up') THEN 'Follow-up Needed'
            WHEN lower(trim(c.lead_stage)) IN ('not responding', 'not_responding') THEN 'Not Responding'
            ELSE c.lead_stage
          END
        )
      )
      ON CONFLICT (group_id, customer_id) DO NOTHING;
    `);

    // 3. Insert missing interest stage memberships
    await pgClient.query(`
      INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id)
      SELECT g.id, c.id
      FROM ${agentPrefix}_customers c
      JOIN ${agentPrefix}_customer_groups g ON (
        g.is_default = true
        AND c.interest_stage IS NOT NULL
        AND trim(c.interest_stage) != ''
        AND lower(g.name) = lower(trim(c.interest_stage))
      )
      ON CONFLICT (group_id, customer_id) DO NOTHING;
    `);

    // 4. Insert missing conversion stage memberships
    await pgClient.query(`
      INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id)
      SELECT g.id, c.id
      FROM ${agentPrefix}_customers c
      JOIN ${agentPrefix}_customer_groups g ON (
        g.is_default = true
        AND c.conversion_stage IS NOT NULL
        AND trim(c.conversion_stage) != ''
        AND lower(g.name) = lower(trim(c.conversion_stage))
      )
      ON CONFLICT (group_id, customer_id) DO NOTHING;
    `);
  } catch (err: any) {
    console.warn(`[Customer Groups] Error reconciling group memberships for ${agentPrefix}:`, err.message);
  }
}

/**
 * Ensures tables exist, seeds all 10 default pipeline groups,
 * reconciles existing memberships, and sets up the automatic trigger.
 */
export async function ensureCustomerGroupTables(pgClient: any, agentPrefix: string, agentId: number) {
  try {
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS ${agentPrefix}_customer_groups (
        id SERIAL PRIMARY KEY,
        agent_id BIGINT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(20) DEFAULT '#22C55E',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE ${agentPrefix}_customer_groups ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_${agentPrefix}_cust_groups_name ON ${agentPrefix}_customer_groups(agent_id, name);

      CREATE TABLE IF NOT EXISTS ${agentPrefix}_customer_group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES ${agentPrefix}_customer_groups(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES ${agentPrefix}_customers(id) ON DELETE CASCADE,
        added_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(group_id, customer_id)
      );

      INSERT INTO ${agentPrefix}_customer_groups (agent_id, name, description, color, is_default)
      VALUES
        (${agentId}, 'New Lead', 'Default group for newly acquired leads', '#3B82F6', true),
        (${agentId}, 'Contacted', 'Default group for contacted leads', '#8B5CF6', true),
        (${agentId}, 'Follow-up Needed', 'Default group for leads requiring follow-up', '#F59E0B', true),
        (${agentId}, 'Not Responding', 'Default group for inactive or unresponsive leads', '#6B7280', true),
        (${agentId}, 'Interested', 'Default group for leads actively showing interest', '#10B981', true),
        (${agentId}, 'Quotation Sent', 'Default group for leads who received a price quotation', '#06B6D4', true),
        (${agentId}, 'Asked for More Info', 'Default group for leads requesting product or service details', '#EC4899', true),
        (${agentId}, 'Payment Pending', 'Default group for customers awaiting invoice or payment confirmation', '#EAB308', true),
        (${agentId}, 'Paid', 'Default group for paying customers', '#22C55E', true),
        (${agentId}, 'Order Confirmed', 'Default group for customers with confirmed orders', '#16A34A', true)
      ON CONFLICT (agent_id, name) DO UPDATE
        SET is_default = true;
    `);

    // Run reconciliation for any out-of-sync memberships
    await reconcileLeadStageGroupMemberships(pgClient, agentPrefix, agentId);

    // Setup PostgreSQL trigger to ensure real-time automatic synchronization on customer changes
    await pgClient.query(`
      CREATE OR REPLACE FUNCTION sync_customer_stage_groups_${agentPrefix}()
      RETURNS TRIGGER AS $$
      DECLARE
        v_lead_group_id int;
        v_interest_group_id int;
        v_conversion_group_id int;
        v_lead_stage text;
      BEGIN
        -- 1. Determine canonical lead stage
        IF NEW.lead_stage IS NULL OR trim(NEW.lead_stage) = '' THEN
          v_lead_stage := 'New Lead';
        ELSIF lower(trim(NEW.lead_stage)) IN ('new lead', 'new_lead') THEN
          v_lead_stage := 'New Lead';
        ELSIF lower(trim(NEW.lead_stage)) = 'contacted' THEN
          v_lead_stage := 'Contacted';
        ELSIF lower(trim(NEW.lead_stage)) IN ('follow-up needed', 'follow-up', 'follow_up_needed', 'follow_up') THEN
          v_lead_stage := 'Follow-up Needed';
        ELSIF lower(trim(NEW.lead_stage)) IN ('not responding', 'not_responding') THEN
          v_lead_stage := 'Not Responding';
        ELSE
          v_lead_stage := NEW.lead_stage;
        END IF;

        SELECT id INTO v_lead_group_id
        FROM ${agentPrefix}_customer_groups
        WHERE is_default = true AND lower(name) = lower(v_lead_stage)
        LIMIT 1;

        -- 2. Determine interest stage group
        IF NEW.interest_stage IS NOT NULL AND trim(NEW.interest_stage) != '' THEN
          SELECT id INTO v_interest_group_id
          FROM ${agentPrefix}_customer_groups
          WHERE is_default = true AND lower(name) = lower(trim(NEW.interest_stage))
          LIMIT 1;
        ELSE
          v_interest_group_id := NULL;
        END IF;

        -- 3. Determine conversion stage group
        IF NEW.conversion_stage IS NOT NULL AND trim(NEW.conversion_stage) != '' THEN
          SELECT id INTO v_conversion_group_id
          FROM ${agentPrefix}_customer_groups
          WHERE is_default = true AND lower(name) = lower(trim(NEW.conversion_stage))
          LIMIT 1;
        ELSE
          v_conversion_group_id := NULL;
        END IF;

        -- 4. Clean up stale default memberships for this customer
        DELETE FROM ${agentPrefix}_customer_group_members
        WHERE customer_id = NEW.id
          AND group_id IN (
            SELECT id FROM ${agentPrefix}_customer_groups
            WHERE is_default = true
              AND id NOT IN (
                COALESCE(v_lead_group_id, 0),
                COALESCE(v_interest_group_id, 0),
                COALESCE(v_conversion_group_id, 0)
              )
          );

        -- 5. Insert active stage group memberships
        IF v_lead_group_id IS NOT NULL THEN
          INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id)
          VALUES (v_lead_group_id, NEW.id)
          ON CONFLICT (group_id, customer_id) DO NOTHING;
        END IF;

        IF v_interest_group_id IS NOT NULL THEN
          INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id)
          VALUES (v_interest_group_id, NEW.id)
          ON CONFLICT (group_id, customer_id) DO NOTHING;
        END IF;

        IF v_conversion_group_id IS NOT NULL THEN
          INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id)
          VALUES (v_conversion_group_id, NEW.id)
          ON CONFLICT (group_id, customer_id) DO NOTHING;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_sync_lead_stage_${agentPrefix} ON ${agentPrefix}_customers;
      DROP TRIGGER IF EXISTS trg_sync_customer_stages_${agentPrefix} ON ${agentPrefix}_customers;
      CREATE TRIGGER trg_sync_customer_stages_${agentPrefix}
      AFTER INSERT OR UPDATE OF lead_stage, interest_stage, conversion_stage ON ${agentPrefix}_customers
      FOR EACH ROW
      EXECUTE FUNCTION sync_customer_stage_groups_${agentPrefix}();
    `);
  } catch (err: any) {
    console.warn(`[Customer Groups] Error ensuring schema for ${agentPrefix}:`, err.message);
  }
}

/**
 * Assigns a customer to a default pipeline stage group by updating their matching CRM field
 */
export async function assignCustomerToDefaultGroup(
  pgClient: any,
  agentPrefix: string,
  groupName: string,
  customerId: number
) {
  if (INTEREST_STAGE_NAMES.includes(groupName)) {
    await pgClient.query(
      `UPDATE ${agentPrefix}_customers SET interest_stage = $1, updated_at = now() WHERE id = $2`,
      [groupName, customerId]
    );
  } else if (CONVERSION_STAGE_NAMES.includes(groupName)) {
    await pgClient.query(
      `UPDATE ${agentPrefix}_customers SET conversion_stage = $1, updated_at = now() WHERE id = $2`,
      [groupName, customerId]
    );
  } else {
    await pgClient.query(
      `UPDATE ${agentPrefix}_customers SET lead_stage = $1, updated_at = now() WHERE id = $2`,
      [groupName, customerId]
    );
  }
}

/**
 * Removes customers from a default pipeline stage group
 */
export async function removeCustomerFromDefaultGroup(
  pgClient: any,
  agentPrefix: string,
  groupName: string,
  customerIds: number[]
) {
  if (customerIds.length === 0) return;
  if (INTEREST_STAGE_NAMES.includes(groupName)) {
    await pgClient.query(
      `UPDATE ${agentPrefix}_customers SET interest_stage = NULL, updated_at = now() WHERE id = ANY($1::int[]) AND lower(interest_stage) = lower($2)`,
      [customerIds, groupName]
    );
  } else if (CONVERSION_STAGE_NAMES.includes(groupName)) {
    await pgClient.query(
      `UPDATE ${agentPrefix}_customers SET conversion_stage = NULL, updated_at = now() WHERE id = ANY($1::int[]) AND lower(conversion_stage) = lower($2)`,
      [customerIds, groupName]
    );
  } else {
    await pgClient.query(
      `UPDATE ${agentPrefix}_customers SET lead_stage = 'New Lead', updated_at = now() WHERE id = ANY($1::int[]) AND lower(lead_stage) = lower($2)`,
      [customerIds, groupName]
    );
  }
}

/**
 * Synchronizes a single customer into their matching default stage groups
 */
export async function syncCustomerLeadStageGroup(
  pgClient: any,
  agentPrefix: string,
  agentId: number,
  customerId: number,
  newLeadStage?: string | null,
  newInterestStage?: string | null,
  newConversionStage?: string | null
) {
  try {
    let ls = newLeadStage;
    let is = newInterestStage;
    let cs = newConversionStage;

    if (ls === undefined || is === undefined || cs === undefined) {
      const custRes = await pgClient.query(
        `SELECT lead_stage, interest_stage, conversion_stage FROM ${agentPrefix}_customers WHERE id = $1`,
        [customerId]
      );
      if (custRes.rows.length > 0) {
        if (ls === undefined) ls = custRes.rows[0].lead_stage;
        if (is === undefined) is = custRes.rows[0].interest_stage;
        if (cs === undefined) cs = custRes.rows[0].conversion_stage;
      }
    }

    const canonicalLead = normalizeLeadStageName(ls);
    const targetNames: string[] = [canonicalLead];
    if (is && typeof is === 'string' && is.trim()) targetNames.push(is.trim());
    if (cs && typeof cs === 'string' && cs.trim()) targetNames.push(cs.trim());

    // Remove obsolete default memberships
    await pgClient.query(`
      DELETE FROM ${agentPrefix}_customer_group_members
      WHERE customer_id = $1
        AND group_id IN (
          SELECT id FROM ${agentPrefix}_customer_groups
          WHERE is_default = true AND lower(name) != ALL($2::text[])
        )
    `, [customerId, targetNames.map(n => n.toLowerCase())]);

    // Insert active memberships
    await pgClient.query(`
      INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id)
      SELECT id, $1
      FROM ${agentPrefix}_customer_groups
      WHERE is_default = true AND lower(name) = ANY($2::text[])
      ON CONFLICT (group_id, customer_id) DO NOTHING
    `, [customerId, targetNames.map(n => n.toLowerCase())]);
  } catch (err: any) {
    console.warn(`[Customer Groups] Error syncing stage groups for customer ${customerId}:`, err.message);
  }
}

