const verifiedPrefixes = new Set<string>();

/**
 * Creates an appointment in {agent_prefix}_appointments
 */
export async function executeCreateAppointment({
  agent,
  customer,
  payload,
  pgClient,
}: {
  agent: any;
  customer: any;
  payload: any;
  pgClient: any;
}) {
  const appointmentsTable = `${agent.agent_prefix}_appointments`;

  let apptDate = payload.appointment_date ? new Date(payload.appointment_date) : null;
  // If invalid or in the past, adjust to tomorrow 10:00 AM
  if (!apptDate || isNaN(apptDate.getTime()) || apptDate.getTime() <= Date.now()) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(10, 0, 0, 0);
    apptDate = tomorrow;
  }

  const title = (payload.title || 'Service Consultation').trim();
  const duration = Number(payload.duration_minutes) || 60;
  const notes = payload.notes ? String(payload.notes).trim() : null;

  const insertQuery = `
    INSERT INTO ${appointmentsTable} (customer_id, title, appointment_date, duration_minutes, status, notes, updated_at)
    VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
    RETURNING *
  `;

  const { rows } = await pgClient.query(insertQuery, [
    customer.id,
    title,
    apptDate.toISOString(),
    duration,
    notes,
  ]);

  return rows[0];
}

/**
 * Ensures {agent_prefix}_orders_invoices and {agent_prefix}_orders_items have all required columns
 * and that order_id NOT NULL is dropped for the invoice-first flow.
 */
export async function ensureInvoiceTableSchema(pgClient: any, agentPrefix: string) {
  if (!agentPrefix || verifiedPrefixes.has(agentPrefix)) return;
  const invoicesTable = `${agentPrefix}_orders_invoices`;
  const itemsTable = `${agentPrefix}_orders_items`;
  const customersTable = `${agentPrefix}_customers`;

  try {
    await pgClient.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${invoicesTable}') THEN
          ALTER TABLE ${invoicesTable} ADD COLUMN IF NOT EXISTS customer_id INTEGER, ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(10,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS notes TEXT, ADD COLUMN IF NOT EXISTS pdf_url TEXT, ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'generated', ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT now(), ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
          BEGIN ALTER TABLE ${invoicesTable} ALTER COLUMN order_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
        ELSE
          CREATE TABLE IF NOT EXISTS ${invoicesTable} (
            id SERIAL PRIMARY KEY, customer_id INTEGER REFERENCES ${customersTable}(id) ON DELETE CASCADE, order_id INTEGER, name TEXT NOT NULL, pdf_url TEXT NOT NULL, total_amount DECIMAL(10,2) DEFAULT 0, advance_amount DECIMAL(10,2) DEFAULT 0, notes TEXT, generated_at TIMESTAMPTZ DEFAULT now(), status VARCHAR(20) DEFAULT 'generated', discount_percentage DECIMAL(5,2) DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT now()
          );
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${itemsTable}') THEN
          ALTER TABLE ${itemsTable} ADD COLUMN IF NOT EXISTS invoice_id INTEGER, ADD COLUMN IF NOT EXISTS name TEXT, ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1, ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
          BEGIN ALTER TABLE ${itemsTable} ALTER COLUMN order_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
        ELSE
          CREATE TABLE IF NOT EXISTS ${itemsTable} (
            id SERIAL PRIMARY KEY, order_id INTEGER, invoice_id INTEGER REFERENCES ${invoicesTable}(id) ON DELETE CASCADE, name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, price NUMERIC NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
          );
        END IF;
      END $$;
    `);
    verifiedPrefixes.add(agentPrefix);
  } catch (err: any) {
    console.warn(`[AI Agent Actions] Notice ensuring invoice schema for ${agentPrefix}:`, err.message);
  }
}
