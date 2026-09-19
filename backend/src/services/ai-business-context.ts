import { parseJsonUrls } from './ai-formatters.js';
import { downloadMediaFromR2, getS3KeyFromUrl } from '../utils/s3.js';

export interface FullBusinessContextResult {
  companyOverview: string;
  aiInstructions: string;
  catalogContext: string;
  appointmentsContext: string;
  invoicesContext: string;
  ordersContext: string;
}

/**
 * Validates agent table prefix to ensure strict tenant isolation
 * and prevent SQL injection or path traversal.
 */
export function validateAgentPrefix(prefix: string): string {
  if (!prefix || typeof prefix !== 'string' || !/^[a-zA-Z0-9_]+$/.test(prefix)) {
    throw new Error(`[Multi-Tenant Security] Invalid or unsafe agent_prefix: "${prefix}"`);
  }
  return prefix;
}

/**
 * Fetches company overview text either from direct column or R2 document storage
 */
export async function fetchCompanyOverview({ agent }: { agent: any }): Promise<string> {
  let overview = (agent.company_overview || '').trim().slice(0, 3000);
  if (!overview && agent.company_overview_path) {
    try {
      const s3Key = getS3KeyFromUrl(agent.company_overview_path);
      const buffer = await downloadMediaFromR2(s3Key);
      if (buffer) {
        overview = buffer.toString('utf-8').slice(0, 3000);
      }
    } catch (overviewErr) {
      console.error('[AI Business Context] Error reading company overview document:', overviewErr);
    }
  }
  return overview;
}

/**
 * Fetches AI agent custom instructions and business rules set by the owner
 */
export function fetchAiInstructions({ agent }: { agent: any }): string {
  return (agent.ai_instructions || '').trim().slice(0, 3000);
}

/**
 * Fetches and builds catalog context (services or products) scoped strictly to the agent
 */
export async function fetchCatalogContext({
  agent,
  pgClient,
}: {
  agent: any;
  pgClient: any;
}): Promise<string> {
  const prefix = validateAgentPrefix(agent.agent_prefix);
  let catalogContext = '';

  if (agent.business_type === 'service') {
    try {
      const { rows: services } = await pgClient.query(
        "SELECT * FROM get_agent_services($1, null, null, 'created_at', 'desc')",
        [agent.id]
      );

      if (services && services.length > 0) {
        catalogContext = 'Services & Packages Offered:\n' + services.map((s: any) => {
          let text = `- Service: ${s.service_name}\n  Description: ${s.description || 'Professional service'}`;
          const links = parseJsonUrls(s.service_links);
          if (links.length > 0) {
            text += `\n  Sample Work & Portfolio: Available (${links.length} portfolio item(s))`;
          }
          const images = parseJsonUrls(s.image_urls);
          if (images.length > 0) {
            text += `\n  Sample Work Photos: Available (${images.length} sample photo(s))`;
          }
          if (Array.isArray(s.packages) && s.packages.length > 0) {
            const pkgs = s.packages.map((p: any) => {
              const pkgDesc = p.description ? ` | Details: ${p.description.replace(/\n+/g, '; ')}` : '';
              return `    * Package: ${p.package_name} | Price: ${p.currency || 'Rs.'} ${p.price || 'N/A'}${pkgDesc}`;
            }).join('\n');
            text += '\n' + pkgs;
          }
          return text;
        }).join('\n\n');
      }
    } catch (catalogErr) {
      console.warn('[AI Business Context] get_agent_services failed, falling back to direct table query:', catalogErr);
      const servicesTable = `${prefix}_services`;
      const packagesTable = `${prefix}_service_packages`;
      try {
        const { rows: services } = await pgClient.query(`
          SELECT s.id, s.service_name, s.description, s.image_urls, s.service_links,
                 p.package_name, p.price, p.currency, p.description as package_desc
          FROM ${servicesTable} s
          LEFT JOIN ${packagesTable} p ON s.id = p.service_id
          WHERE s.is_active = true OR s.is_active IS NULL
          ORDER BY s.id ASC
          LIMIT 50
        `);

        if (services.length > 0) {
          catalogContext = 'Services Offered:\n' + services.map((s: any) => {
            const pkg = s.package_name ? ` (Tier: ${s.package_name}, Price: ${s.currency || 'Rs.'} ${s.price || 'N/A'})` : '';
            let text = `- ${s.service_name}${pkg}: ${s.description || s.package_desc || 'Professional service'}`;
            const links = parseJsonUrls(s.service_links);
            if (links.length > 0) {
              text += ` | Portfolio: Available (${links.length})`;
            }
            const images = parseJsonUrls(s.image_urls);
            if (images.length > 0) {
              text += ` | Sample Photos: Available (${images.length})`;
            }
            return text;
          }).join('\n');
        }
      } catch (fallbackErr) {
        console.error('[AI Business Context] Direct services query failed:', fallbackErr);
      }
    }
  } else {
    // Default to product business
    const itemsTable = `${prefix}_inventory_items`;
    const categoriesTable = `${prefix}_categories`;
    try {
      let products: any[] = [];
      try {
        const res = await pgClient.query(`
          SELECT i.id, i.name, i.sku, i.price, i.quantity, i.stock_status, i.image_urls, c.name as category_name, i.description
          FROM ${itemsTable} i
          LEFT JOIN ${categoriesTable} c ON i.category_id = c.id
          WHERE i.is_active = true OR i.is_active IS NULL
          ORDER BY i.id ASC
          LIMIT 50
        `);
        products = res.rows || [];
      } catch {
        const res = await pgClient.query(`
          SELECT i.id, i.name, i.sku, i.price, i.stock_status, c.name as category_name, i.description
          FROM ${itemsTable} i
          LEFT JOIN ${categoriesTable} c ON i.category_id = c.id
          WHERE i.is_active = true OR i.is_active IS NULL
          ORDER BY i.id ASC
          LIMIT 50
        `);
        products = res.rows || [];
      }

      if (products.length > 0) {
        catalogContext = 'Product Catalog & Inventory:\n' + products.map((p: any) => {
          const sku = p.sku ? ` [SKU: ${p.sku}]` : '';
          const cat = p.category_name ? ` (Category: ${p.category_name})` : '';
          const stock = p.stock_status ? ` - Status: ${p.stock_status}` : (p.quantity !== undefined ? ` - Stock: ${p.quantity} units available` : '');
          const desc = p.description ? ` | Details: ${p.description}` : '';
          const images = parseJsonUrls(p.image_urls);
          const imgText = images.length > 0 ? ` | Photos: Available (${images.length} photo(s))` : '';
          return `- Product: ${p.name}${sku}${cat}\n  Price: Rs. ${Number(p.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}${stock}${desc}${imgText}`;
        }).join('\n\n');
      }
    } catch (catalogErr) {
      console.error('[AI Business Context] Error fetching product catalog:', catalogErr);
    }
  }

  return catalogContext;
}

/**
 * Fetches recent appointments for this customer, strictly isolated to agent prefix
 */
export async function fetchCustomerAppointmentsContext({
  agent,
  customerId,
  pgClient,
}: {
  agent: any;
  customerId: number;
  pgClient: any;
}): Promise<string> {
  if (!customerId) return 'No scheduled appointments.';
  const prefix = validateAgentPrefix(agent.agent_prefix);
  const appointmentsTable = `${prefix}_appointments`;

  try {
    const { rows: appointments } = await pgClient.query(
      `SELECT id, title, appointment_date, duration_minutes, status, notes
       FROM ${appointmentsTable}
       WHERE customer_id = $1
       ORDER BY appointment_date DESC
       LIMIT 5`,
      [customerId]
    );

    if (!appointments || appointments.length === 0) {
      return 'No scheduled appointments.';
    }

    return appointments.map((apt: any) => {
      const dateStr = apt.appointment_date
        ? new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Colombo',
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(apt.appointment_date))
        : 'Date not set';
      const notesStr = apt.notes ? ` | Notes: ${apt.notes}` : '';
      return `• Appointment #APT-${String(apt.id).padStart(4, '0')}: "${apt.title || 'Consultation'}" | Date: ${dateStr} | Status: ${apt.status || 'pending'} | Duration: ${apt.duration_minutes || 60} mins${notesStr}`;
    }).join('\n');
  } catch (err: any) {
    console.warn(`[AI Business Context] Notice querying appointments for customer ${customerId}:`, err.message);
    return 'No scheduled appointments.';
  }
}

/**
 * Fetches recent invoices and line items for this customer, strictly isolated to agent prefix
 */
export async function fetchCustomerInvoicesContext({
  agent,
  customerId,
  pgClient,
}: {
  agent: any;
  customerId: number;
  pgClient: any;
}): Promise<string> {
  if (!customerId) return 'No previous invoices.';
  const prefix = validateAgentPrefix(agent.agent_prefix);
  const invoicesTable = `${prefix}_orders_invoices`;
  const itemsTable = `${prefix}_orders_items`;

  try {
    const { rows: invoices } = await pgClient.query(
      `SELECT id, name, total_amount, advance_amount, status, pdf_url, discount_percentage, notes, generated_at
       FROM ${invoicesTable}
       WHERE customer_id = $1
       ORDER BY id DESC
       LIMIT 5`,
      [customerId]
    );

    if (!invoices || invoices.length === 0) {
      return 'No previous invoices.';
    }

    const invoiceIds = invoices.map((i: any) => i.id);
    let itemsByInvoice: Record<number, any[]> = {};

    try {
      const { rows: items } = await pgClient.query(
        `SELECT invoice_id, name, quantity, price
         FROM ${itemsTable}
         WHERE invoice_id = ANY($1::int[])`,
        [invoiceIds]
      );
      for (const it of items) {
        if (!itemsByInvoice[it.invoice_id]) itemsByInvoice[it.invoice_id] = [];
        itemsByInvoice[it.invoice_id].push(it);
      }
    } catch {
      // Items table query failure is non-blocking
    }

    return invoices.map((inv: any) => {
      const invNumber = `#INV-${String(inv.id).padStart(4, '0')}`;
      const totalNum = Number(inv.total_amount || 0);
      const advNum = Number(inv.advance_amount || 0);
      const total = totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const advance = advNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const balanceNum = Math.max(0, totalNum - advNum);
      const balance = balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const statusLower = (inv.status || '').toLowerCase();
      const isPaidFull = statusLower === 'paid' || (totalNum > 0 && advNum >= totalNum);
      const isAdvancePaid = !isPaidFull && (statusLower === 'advance_paid' || statusLower === 'partially_paid' || advNum > 0);

      let payBadge = '[UNPAID - Awaiting Payment]';
      if (isPaidFull) {
        payBadge = '[PAID IN FULL - DO NOT RE-INVOICE OR RE-CHARGE FOR THESE ITEMS]';
      } else if (isAdvancePaid) {
        payBadge = `[ADVANCE PAID - Advance: Rs. ${advance} Paid, Remaining Due: Rs. ${balance}]`;
      }

      const dispBalance = isPaidFull ? '0.00' : balance;
      const pdfStatus = inv.pdf_url && inv.pdf_url.startsWith('http') && !inv.pdf_url.endsWith('/invoices')
        ? ` | PDF: Available`
        : '';

      const lineItems = itemsByInvoice[inv.id]
        ? itemsByInvoice[inv.id].map((it: any) => `${it.name} (Qty: ${it.quantity || 1})`).join(', ')
        : (inv.name || 'Service/Product');
      const notes = inv.notes ? ` | Notes: ${inv.notes}` : '';
      return `• Invoice ${invNumber} ${payBadge}: Items: ${lineItems} | Total: Rs. ${total} | Advance Paid: Rs. ${advance} | Balance Due: Rs. ${dispBalance}${pdfStatus}${notes}`;
    }).join('\n');
  } catch (err: any) {
    console.warn(`[AI Business Context] Notice querying invoices for customer ${customerId}:`, err.message);
    return 'No previous invoices.';
  }
}

/**
 * Fetches recent orders for this customer, strictly isolated to agent prefix
 */
export async function fetchCustomerOrdersContext({
  agent,
  customerId,
  pgClient,
}: {
  agent: any;
  customerId: number;
  pgClient: any;
}): Promise<string> {
  if (!customerId) return 'No previous orders.';
  const prefix = validateAgentPrefix(agent.agent_prefix);
  const ordersTable = `${prefix}_orders`;
  const itemsTable = `${prefix}_orders_items`;

  try {
    const { rows: orders } = await pgClient.query(
      `SELECT id, invoice_id, total_amount, advance_amount, payment_status, status, notes, shipping_address, estimated_delivery_date, created_at
       FROM ${ordersTable}
       WHERE customer_id = $1
       ORDER BY id DESC
       LIMIT 5`,
      [customerId]
    );

    if (!orders || orders.length === 0) {
      return 'No previous orders.';
    }

    const orderIds = orders.map((o: any) => o.id);
    let itemsByOrder: Record<number, any[]> = {};

    try {
      const { rows: items } = await pgClient.query(
        `SELECT order_id, name, quantity, price
         FROM ${itemsTable}
         WHERE order_id = ANY($1::int[])`,
        [orderIds]
      );
      for (const it of items) {
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
        itemsByOrder[it.order_id].push(it);
      }
    } catch {
      // Items query failure is non-blocking
    }

    return orders.map((o: any) => {
      const ordNumber = `#ORD-${String(o.id).padStart(4, '0')}`;
      const totalNum = Number(o.total_amount || 0);
      const advNum = Number(o.advance_amount || 0);
      const total = totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const advance = advNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const isPaidFull = o.payment_status === 'paid' || (advNum >= totalNum && totalNum > 0);
      const isAdvancePaid = !isPaidFull && advNum > 0;

      let payBadge = '[UNPAID]';
      if (isPaidFull) {
        payBadge = '[PAID IN FULL - ALREADY CONFIRMED]';
      } else if (isAdvancePaid) {
        payBadge = `[ADVANCE PAID - Rs. ${advance}]`;
      }

      const lineItems = itemsByOrder[o.id]
        ? itemsByOrder[o.id].map((it: any) => `${it.name} (Qty: ${it.quantity || 1})`).join(', ')
        : 'Order items';
      const address = o.shipping_address ? ` | Shipping: ${o.shipping_address}` : '';
      const notes = o.notes ? ` | Notes: ${o.notes}` : '';
      return `• Order ${ordNumber} ${payBadge}: Fulfillment: ${o.status || 'pending'} | Items: ${lineItems} (Total: Rs. ${total}, Advance: Rs. ${advance})${address}${notes}`;
    }).join('\n');
  } catch (err: any) {
    console.warn(`[AI Business Context] Notice querying orders for customer ${customerId}:`, err.message);
    return 'No previous orders.';
  }
}

/**
 * Assembles all business context and customer records in parallel with strict tenant isolation
 */
export async function fetchFullBusinessContext({
  agent,
  customer,
  pgClient,
  stage,
}: {
  agent: any;
  customer: any;
  pgClient: any;
  stage?: string;
}): Promise<FullBusinessContextResult> {
  const shouldFetchCatalog = stage !== 'paid';

  const [
    companyOverview,
    catalogContext,
    appointmentsContext,
    invoicesContext,
    ordersContext,
  ] = await Promise.all([
    fetchCompanyOverview({ agent }),
    shouldFetchCatalog ? fetchCatalogContext({ agent, pgClient }) : Promise.resolve(''),
    fetchCustomerAppointmentsContext({ agent, customerId: customer?.id, pgClient }),
    fetchCustomerInvoicesContext({ agent, customerId: customer?.id, pgClient }),
    fetchCustomerOrdersContext({ agent, customerId: customer?.id, pgClient }),
  ]);

  const aiInstructions = fetchAiInstructions({ agent });

  return {
    companyOverview,
    aiInstructions,
    catalogContext,
    appointmentsContext,
    invoicesContext,
    ordersContext,
  };
}
