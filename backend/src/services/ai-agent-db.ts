const verifiedInvoicePrefixes = new Set<string>();
const verifiedAppointmentPrefixes = new Set<string>();

/**
 * Ensures {agent_prefix}_appointments table exists and has all required columns.
 */
export async function ensureAppointmentTableSchema(pgClient: any, agentPrefix: string) {
  if (!agentPrefix || verifiedAppointmentPrefixes.has(agentPrefix)) return;
  const appointmentsTable = `${agentPrefix}_appointments`;
  const customersTable = `${agentPrefix}_customers`;

  try {
    await pgClient.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${appointmentsTable}') THEN
          ALTER TABLE ${appointmentsTable}
            ADD COLUMN IF NOT EXISTS customer_id INTEGER,
            ADD COLUMN IF NOT EXISTS title TEXT,
            ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60,
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
        ELSE
          CREATE TABLE IF NOT EXISTS ${appointmentsTable} (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES ${customersTable}(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            appointment_date TIMESTAMPTZ NOT NULL,
            duration_minutes INTEGER NOT NULL DEFAULT 60,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );
        END IF;
      END $$;
    `);
    verifiedAppointmentPrefixes.add(agentPrefix);
  } catch (err: any) {
    console.warn(`[AI Agent Actions] Notice ensuring appointment schema for ${agentPrefix}:`, err.message);
  }
}

/**
 * Robustly parses date and time into a valid Date object anchored to Asia/Colombo (UTC+5:30).
 * Handles ISO strings, relative days (today, tomorrow, weekday names in English, Sinhala, Singlish),
 * and standard 12h/24h time representations.
 */
export function parseAppointmentDateTime(inputStr?: string, contextText?: string): Date {
  const combined = `${inputStr || ''} ${contextText || ''}`.trim();
  const lower = combined.toLowerCase();

  // 1. Direct ISO with offset check (e.g. 2026-09-20T10:00:00+05:30)
  if (inputStr && typeof inputStr === 'string') {
    const trimmed = inputStr.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/i.test(trimmed)) {
      const withOffset = trimmed.includes('+') || trimmed.includes('Z') ? trimmed : `${trimmed}+05:30`;
      const parsed = new Date(withOffset);
      if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
        return parsed;
      }
    }
  }

  // 2. Base date calculation relative to Asia/Colombo (UTC+5:30)
  const nowUtc = Date.now();
  const colomboOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const colomboNow = new Date(nowUtc + colomboOffsetMs);

  let year = colomboNow.getUTCFullYear();
  let month = colomboNow.getUTCMonth(); // 0-indexed
  let date = colomboNow.getUTCDate();
  let targetHour = 10; // Default 10:00 AM
  let targetMinute = 0;

  // 3. Check for explicit Month Name + Day (e.g. "September 20", "20 September", "Sep 20")
  const monthNameMap: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  const monthDayMatch = combined.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})\b/);
  const dayMonthMatch = combined.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\b/i);

  if (monthDayMatch && monthNameMap[monthDayMatch[1].toLowerCase()] !== undefined) {
    month = monthNameMap[monthDayMatch[1].toLowerCase()];
    date = parseInt(monthDayMatch[2], 10);
  } else if (dayMonthMatch && monthNameMap[dayMonthMatch[2].toLowerCase()] !== undefined) {
    date = parseInt(dayMonthMatch[1], 10);
    month = monthNameMap[dayMonthMatch[2].toLowerCase()];
  } else {
    // Check for explicit YYYY-MM-DD or DD/MM/YYYY
    const ymdMatch = combined.match(/\b(20\d\d)[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10);
      month = parseInt(ymdMatch[2], 10) - 1;
      date = parseInt(ymdMatch[3], 10);
    } else {
      // Relative day checking
      if (/\b(?:tomorrow|heta)\b/i.test(lower) || /(?:හෙට)/.test(combined)) {
        date += 1;
      } else if (/\b(?:day\s*after\s*tomorrow|anidda)\b/i.test(lower) || /(?:අනිද්දා)/.test(combined)) {
        date += 2;
      } else if (/\b(?:today|ada)\b/i.test(lower) || /(?:අද)/.test(combined)) {
        // Keep today's date
      } else {
        // Weekday checking (e.g. Monday / සඳුදා)
        const weekdayMap: Record<string, number> = {
          sunday: 0, sun: 0, 'ඉරිදා': 0,
          monday: 1, mon: 1, 'සඳුදා': 1,
          tuesday: 2, tue: 2, 'අඟහරුවාදා': 2,
          wednesday: 3, wed: 3, 'බදාදා': 3,
          thursday: 4, thu: 4, 'බ්‍රහස්පතින්දා': 4,
          friday: 5, fri: 5, 'සිකුරාදා': 5,
          saturday: 6, sat: 6, 'සෙනසුරාදා': 6,
        };

        for (const [dayName, dayIndex] of Object.entries(weekdayMap)) {
          if (lower.includes(dayName) || combined.includes(dayName)) {
            const currentDay = colomboNow.getUTCDay();
            let diff = dayIndex - currentDay;
            if (diff <= 0) diff += 7;
            date += diff;
            break;
          }
        }
      }
    }
  }

  // 4. Time parsing: check Sinhala ප.ව. (PM) and පෙ.ව. (AM), 12h AM/PM, 24h, and time cues
  const sinhalaPawaMatch = combined.match(/(?:ප\.ව\.|පස්වරු|පශ්චාත්\s*භාග)\s*(\d{1,2})(?:[:.](\d{2}))?/i);
  const sinhalaPewaMatch = combined.match(/(?:පෙ\.ව\.|පෙරවරු|පූර්ව\s*භාග)\s*(\d{1,2})(?:[:.](\d{2}))?/i);
  const time12Match = combined.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const sinhalaMorningMatch = combined.match(/(?:ude|උදේ|උදෑසන)\s*(\d{1,2})(?:[:.](\d{2}))?/i);
  const sinhalaEveningMatch = combined.match(/(?:hawasa|dawal|re|ra|හවස|සවස|දවල්|රාත්‍රී|රෑ)\s*(\d{1,2})(?:[:.](\d{2}))?/i);
  const time24Match = combined.match(/\b(\d{1,2}):(\d{2})\b/);
  const hourOnlyMatch = combined.match(/\b(\d{1,2})\s*(?:ta|ට)\b/);

  if (sinhalaPawaMatch) {
    let h = parseInt(sinhalaPawaMatch[1], 10);
    if (h < 12) h += 12;
    targetHour = h;
    targetMinute = sinhalaPawaMatch[2] ? parseInt(sinhalaPawaMatch[2], 10) : 0;
  } else if (sinhalaPewaMatch) {
    let h = parseInt(sinhalaPewaMatch[1], 10);
    if (h === 12) h = 0;
    targetHour = h;
    targetMinute = sinhalaPewaMatch[2] ? parseInt(sinhalaPewaMatch[2], 10) : 0;
  } else if (time12Match) {
    let h = parseInt(time12Match[1], 10);
    const m = time12Match[2] ? parseInt(time12Match[2], 10) : 0;
    const isPm = time12Match[3].toLowerCase() === 'pm';
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    targetHour = h;
    targetMinute = m;
  } else if (sinhalaMorningMatch) {
    let h = parseInt(sinhalaMorningMatch[1], 10);
    if (h === 12) h = 0;
    targetHour = h;
    targetMinute = sinhalaMorningMatch[2] ? parseInt(sinhalaMorningMatch[2], 10) : 0;
  } else if (sinhalaEveningMatch) {
    let h = parseInt(sinhalaEveningMatch[1], 10);
    if (h < 12) h += 12;
    targetHour = h;
    targetMinute = sinhalaEveningMatch[2] ? parseInt(sinhalaEveningMatch[2], 10) : 0;
  } else if (time24Match) {
    targetHour = parseInt(time24Match[1], 10);
    targetMinute = parseInt(time24Match[2], 10);
  } else if (hourOnlyMatch) {
    const h = parseInt(hourOnlyMatch[1], 10);
    if (h >= 8 && h <= 18) {
      targetHour = h;
    }
  }

  // 5. Construct date anchored to UTC+5:30
  const targetUtcMs = Date.UTC(year, month, date, targetHour, targetMinute) - colomboOffsetMs;
  let resultDate = new Date(targetUtcMs);

  // If computed time is in the past, push to next day
  if (resultDate.getTime() <= Date.now()) {
    resultDate = new Date(resultDate.getTime() + 24 * 60 * 60 * 1000);
  }

  return resultDate;
}

/**
 * Updates an existing appointment in {agent_prefix}_appointments.
 * If no appointment_id is supplied, automatically updates the customer's active/pending appointment.
 */
export async function executeUpdateAppointment({
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
  await ensureAppointmentTableSchema(pgClient, agent.agent_prefix);
  const appointmentsTable = `${agent.agent_prefix}_appointments`;

  const appointmentId = payload.appointment_id || payload.id;
  let targetId = appointmentId ? Number(appointmentId) : null;

  if (!targetId) {
    const { rows: pendingRows } = await pgClient.query(
      `SELECT id FROM ${appointmentsTable} WHERE customer_id = $1 AND status IN ('pending', 'confirmed') ORDER BY id DESC LIMIT 1`,
      [customer.id]
    );
    if (pendingRows.length > 0) {
      targetId = pendingRows[0].id;
    }
  }

  // If no existing appointment found to update, create a new one
  if (!targetId) {
    return executeCreateAppointmentDirect({ agent, customer, payload, pgClient });
  }

  const apptDate = parseAppointmentDateTime(payload.appointment_date, payload.notes || payload.title);
  const title = payload.title ? String(payload.title).trim() : null;
  const duration = payload.duration_minutes ? Number(payload.duration_minutes) : null;
  const notes = payload.notes !== undefined ? (payload.notes ? String(payload.notes).trim() : null) : undefined;
  const status = payload.status ? String(payload.status).trim() : 'pending';

  const updateQuery = `
    UPDATE ${appointmentsTable}
    SET
      appointment_date = $1,
      title = COALESCE($2, title),
      duration_minutes = COALESCE($3, duration_minutes),
      notes = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE notes END,
      status = $5,
      updated_at = NOW()
    WHERE id = $6
    RETURNING *
  `;

  const { rows } = await pgClient.query(updateQuery, [
    apptDate.toISOString(),
    title,
    duration,
    notes,
    status,
    targetId,
  ]);

  const updated = rows[0];
  if (updated) {
    updated.customer_name = customer.name || customer.phone;
    updated.customer_phone = customer.phone;
  }
  return updated;
}

/**
 * Direct appointment insertion helper
 */
async function executeCreateAppointmentDirect({
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
  const apptDate = parseAppointmentDateTime(payload.appointment_date, payload.notes || payload.title);
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

  const created = rows[0];
  if (created) {
    created.customer_name = customer.name || customer.phone;
    created.customer_phone = customer.phone;
  }
  return created;
}

/**
 * Creates an appointment in {agent_prefix}_appointments.
 * If customer already has an active pending appointment, updates the existing record
 * instead of inserting duplicate appointment rows.
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
  await ensureAppointmentTableSchema(pgClient, agent.agent_prefix);
  const appointmentsTable = `${agent.agent_prefix}_appointments`;

  // Check if customer already has an active pending appointment
  const { rows: existingRows } = await pgClient.query(
    `SELECT id FROM ${appointmentsTable} WHERE customer_id = $1 AND status IN ('pending', 'confirmed') ORDER BY id DESC LIMIT 1`,
    [customer.id]
  );

  if (existingRows.length > 0) {
    const existingId = existingRows[0].id;
    return executeUpdateAppointment({
      agent,
      customer,
      payload: { ...payload, appointment_id: existingId },
      pgClient,
    });
  }

  return executeCreateAppointmentDirect({ agent, customer, payload, pgClient });
}

/**
 * Fallback appointment generator if the LLM confirmed an appointment in text
 * but omitted the [ACTION:CREATE_APPOINTMENT] tag.
 */
export async function detectAndGenerateFallbackAppointment({
  agent,
  customer,
  incomingText,
  replyText,
  pgClient,
}: {
  agent: any;
  customer: any;
  incomingText?: string;
  replyText?: string;
  pgClient: any;
}) {
  const fullText = `${incomingText || ''}\n${replyText || ''}`;
  const reply = replyText || '';

  // Check if AI reply promises or confirms an appointment
  const isApptConfirmedInReply =
    /(?:\*Date:\*|\*දිනය:\*|appointment\s*(?:has\s*been\s*|is\s*)?confirmed|appointment\s*scheduled|scheduled\s*(?:an?\s*)?appointment|(?:appointment|meeting|consultation|call)\s*(?:is|has\s*been)?\s*(?:booked|scheduled|confirmed|set|placed|fixed)|(?:booked|scheduled|confirmed|set)\s*(?:an?|your|the)?\s*(?:appointment|meeting|consultation|call)|(?:appointment|ඇපොයින්ට්මන්ට්|මීටින්|meeting)\s*(?:eka|ekak|එක|එකක්)?\s*(?:දාලා|දැම්මා|දාන්නම්|book|confirm|schedule|වෙන්|dala|damma|dannam)|(?:හමුවීම|මීටින්|ඇපොයින්ට්මන්ට්)\s*(?:eka|ekak|එක|එකක්)?\s*(?:වෙන්|තහවුරු|දාලා|දැම්මා|schedule|book)|(?:ප\.ව\.|පෙ\.ව\.|උදේ|හවස)\s*\d+.*(?:appointment|මීටින්|හමුවීම)|(?:appointment|හමුවීම|මීටින්).*(?:ප\.ව\.|පෙ\.ව\.|උදේ|හවස)\s*\d+)/i.test(
      reply
    );

  if (!isApptConfirmedInReply) {
    return null;
  }

  // Extract Title from *Service:* line or default
  const titleMatch = reply.match(/\*(?:Service|සේවාව):\*\s*([^\n]+)/i);
  const title = (titleMatch ? titleMatch[1].trim() : 'Service Consultation').replace(/^[•\-\s]+/, '');

  // Extract Notes if present
  const notesMatch = reply.match(/\*(?:Notes|සටහන්):\*\s*([^\n]+)/i);
  const notes = notesMatch ? notesMatch[1].trim() : null;

  // Extract Date/Time using parseAppointmentDateTime
  const apptDate = parseAppointmentDateTime(undefined, fullText);

  // Create appointment in database
  const appointment = await executeCreateAppointment({
    agent,
    customer,
    payload: {
      title,
      appointment_date: apptDate.toISOString(),
      duration_minutes: 60,
      notes,
    },
    pgClient,
  });

  return appointment;
}

/**
 * Ensures {agent_prefix}_orders_invoices and {agent_prefix}_orders_items have all required columns
 * and that order_id NOT NULL is dropped for the invoice-first flow.
 */
export async function ensureInvoiceTableSchema(pgClient: any, agentPrefix: string) {
  if (!agentPrefix || verifiedInvoicePrefixes.has(agentPrefix)) return;
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
    verifiedInvoicePrefixes.add(agentPrefix);
  } catch (err: any) {
    console.warn(`[AI Agent Actions] Notice ensuring invoice schema for ${agentPrefix}:`, err.message);
  }
}
