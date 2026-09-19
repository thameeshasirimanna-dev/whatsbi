import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { deleteMediaFromR2 } from "../../utils/s3.js";
import { CacheService } from '../../utils/cache.js';
import { markInvoiceAsPaidAndRedispatch, sendOrResendInvoiceViaWhatsApp } from '../../services/invoice-lifecycle.service.js';
import { updateInvoiceWithPdfRegeneration } from '../../services/invoice-edit.service.js';

export default async function manageInvoicesRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  cacheService?: CacheService,
  emitNewMessage?: (agentId: number, messageData: any) => void,
  emitAgentStatusUpdate?: (agentId: number, statusData: any) => void
) {
  fastify.all("/manage-invoices", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)",
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({ success: false, message: "Agent not found" });
      }

      const agent = agentRows[0];
      const agentPrefix = agent.agent_prefix;
      const method = request.method;
      const url = new URL(request.url, `http://${request.headers.host}`);

      switch (method) {
        case "GET": {
          const customerId = url.searchParams.get("customer_id");
          const invoiceId = url.searchParams.get("id") || url.searchParams.get("invoice_id");
          const type = url.searchParams.get("type");

          // If type=items and invoiceId is provided, fetch line items for this invoice
          if (type === "items" && invoiceId) {
            const { rows: items } = await pgClient.query(
              `SELECT id, invoice_id, order_id, name, quantity, price, (quantity * price) as total 
               FROM ${agentPrefix}_orders_items 
               WHERE invoice_id = $1 OR order_id = (SELECT order_id FROM ${agentPrefix}_orders_invoices WHERE id = $1)
               ORDER BY id ASC`,
              [parseInt(invoiceId)]
            );

            return reply.code(200).send({
              success: true,
              items: items || [],
            });
          }

          // If invoiceId is provided, fetch single invoice
          if (invoiceId) {
            const sql = `
              SELECT
                i.*,
                COALESCE(i.customer_id, o.customer_id) as customer_id,
                c.name as customer_name,
                c.phone as customer_phone,
                o.id as linked_order_id,
                o.status as order_status,
                o.payment_status as order_payment_status
              FROM ${agentPrefix}_orders_invoices i
              LEFT JOIN ${agentPrefix}_customers c ON COALESCE(i.customer_id, (SELECT customer_id FROM ${agentPrefix}_orders WHERE id = i.order_id)) = c.id
              LEFT JOIN ${agentPrefix}_orders o ON i.order_id = o.id
              WHERE i.id = $1
            `;

            const { rows: invoiceRows } = await pgClient.query(sql, [parseInt(invoiceId)]);

            if (invoiceRows.length === 0) {
              return reply.code(404).send({
                success: false,
                message: "Invoice not found",
              });
            }

            const inv = invoiceRows[0];
            const { rows: items } = await pgClient.query(
              `SELECT id, invoice_id, order_id, name, quantity, price, (quantity * price) as total 
               FROM ${agentPrefix}_orders_items 
               WHERE invoice_id = $1 OR (order_id IS NOT NULL AND order_id = $2)
               ORDER BY id ASC`,
              [inv.id, inv.order_id || -1]
            );

            const calculatedSubtotal = items.reduce((sum, it) => sum + (parseFloat(it.total) || 0), 0);
            const discountPct = parseFloat(inv.discount_percentage) || 0;
            const calculatedTotal = calculatedSubtotal * (1 - discountPct / 100);
            const finalTotal = (inv.total_amount && parseFloat(inv.total_amount) > 0) ? parseFloat(inv.total_amount) : calculatedTotal;
            const adv = parseFloat(inv.advance_amount) || 0;
            const effectiveStatus = (inv.status === 'paid' && adv > 0 && adv < finalTotal)
              ? 'partially_paid'
              : inv.status;

            return reply.code(200).send({
              success: true,
              invoice: {
                ...inv,
                status: effectiveStatus,
                total: finalTotal,
                order_number: inv.order_id ? `#${inv.order_id.toString().padStart(4, "0")}` : null,
                invoice_number: `#INV-${inv.id.toString().padStart(4, "0")}`,
                items: items || [],
              },
            });
          }

          // Build query for list of invoices
          let sql = `
            SELECT
              i.*,
              COALESCE(i.customer_id, o.customer_id) as customer_id,
              c.name as customer_name,
              c.phone as customer_phone,
              o.id as linked_order_id,
              o.status as order_status,
              o.payment_status as order_payment_status
            FROM ${agentPrefix}_orders_invoices i
            LEFT JOIN ${agentPrefix}_customers c ON COALESCE(i.customer_id, (SELECT customer_id FROM ${agentPrefix}_orders WHERE id = i.order_id)) = c.id
            LEFT JOIN ${agentPrefix}_orders o ON i.order_id = o.id
          `;

          const params: any[] = [];
          if (customerId) {
            params.push(parseInt(customerId));
            sql += ` WHERE (i.customer_id = $${params.length} OR o.customer_id = $${params.length})`;
          }

          sql += ` ORDER BY i.generated_at DESC`;

          const { rows: invoices } = await pgClient.query(sql, params);

          if (invoices.length === 0) {
            return reply.code(200).send({
              success: true,
              invoices: [],
            });
          }

          // Fetch items for all invoices to compute totals
          const invoiceIds = invoices.map((inv: any) => inv.id);
          const invoiceOrderIds = invoices.filter((inv: any) => inv.order_id).map((inv: any) => inv.order_id);

          const { rows: allItems } = await pgClient.query(
            `SELECT id, invoice_id, order_id, name, quantity, price, (quantity * price) as total 
             FROM ${agentPrefix}_orders_items 
             WHERE invoice_id = ANY($1) OR (order_id IS NOT NULL AND order_id = ANY($2))`,
            [invoiceIds, invoiceOrderIds.length > 0 ? invoiceOrderIds : [-1]]
          );

          // Group items by invoice_id and order_id
          const itemsByInvoiceId = new Map<number, any[]>();
          const itemsByOrderId = new Map<number, any[]>();

          allItems.forEach((item: any) => {
            if (item.invoice_id) {
              const list = itemsByInvoiceId.get(item.invoice_id) || [];
              list.push(item);
              itemsByInvoiceId.set(item.invoice_id, list);
            }
            if (item.order_id) {
              const list = itemsByOrderId.get(item.order_id) || [];
              list.push(item);
              itemsByOrderId.set(item.order_id, list);
            }
          });

          const processedInvoices = invoices.map((inv: any) => {
            const items = itemsByInvoiceId.get(inv.id) || (inv.order_id ? itemsByOrderId.get(inv.order_id) : []) || [];
            const subtotal = items.reduce((sum: number, it: any) => sum + (parseFloat(it.total) || 0), 0);
            const discount = parseFloat(inv.discount_percentage) || 0;
            const calculatedTotal = subtotal * (1 - discount / 100);
            const finalTotal = (inv.total_amount && parseFloat(inv.total_amount) > 0) ? parseFloat(inv.total_amount) : calculatedTotal;
            const adv = parseFloat(inv.advance_amount) || 0;
            const effectiveStatus = (inv.status === 'paid' && adv > 0 && adv < finalTotal)
              ? 'partially_paid'
              : inv.status;

            return {
              ...inv,
              status: effectiveStatus,
              customer_name: inv.customer_name || "Unknown Customer",
              order_number: inv.order_id ? `#${inv.order_id.toString().padStart(4, "0")}` : null,
              invoice_number: `#INV-${inv.id.toString().padStart(4, "0")}`,
              total: finalTotal,
              items,
            };
          });

          return reply.code(200).send({
            success: true,
            invoices: processedInvoices,
          });
        }

        case "POST": {
          const body = request.body as any;
          const action = url.searchParams.get("action") || body?.action;

          // Action: Send or Resend Invoice via WhatsApp
          if (action === "send" || action === "resend") {
            const invoiceId = Number(body?.invoice_id || body?.id);
            if (!invoiceId || isNaN(invoiceId)) {
              return reply.code(400).send({ success: false, message: "Valid invoice ID is required" });
            }
            try {
              const sendResult = await sendOrResendInvoiceViaWhatsApp({
                agent,
                invoiceId,
                pgClient,
                emitNewMessage,
                cacheService,
              });
              return reply.code(200).send(sendResult);
            } catch (sendErr: any) {
              console.error("[Manage Invoices] Send invoice error:", sendErr);
              return reply.code(500).send({ success: false, message: sendErr.message || "Failed to send invoice" });
            }
          }

          // Action: Create Order from Invoice (when customer pays)
          const {
            invoice_id,
            shipping_address,
            estimated_delivery_date,
            advance_amount,
            payment_status,
            notes,
          } = body || {};

          if (!invoice_id || typeof invoice_id !== "number") {
            return reply.code(400).send({
              success: false,
              message: "Valid invoice ID is required",
            });
          }

          const client = await pgClient.connect();
          try {
            await client.query("BEGIN");

            // Fetch invoice
            const { rows: invRows } = await client.query(
              `SELECT * FROM ${agentPrefix}_orders_invoices WHERE id = $1 FOR UPDATE`,
              [invoice_id]
            );

            if (invRows.length === 0) {
              await client.query("ROLLBACK");
              return reply.code(404).send({ success: false, message: "Invoice not found" });
            }

            const invoice = invRows[0];

            // If order already created for this invoice
            if (invoice.order_id) {
              await client.query("ROLLBACK");
              return reply.code(400).send({
                success: false,
                message: `Order #${invoice.order_id} already exists for this invoice`,
                order_id: invoice.order_id,
              });
            }

            const totalAmount = parseFloat(invoice.total_amount) || 0;
            const inputAdvance = advance_amount !== undefined && !isNaN(Number(advance_amount)) ? Number(advance_amount) : null;
            const dbAdvance = parseFloat(invoice.advance_amount) || 0;
            // When creating an order from invoice, if advance is 0 or not passed, default to full totalAmount
            const advanceVal = inputAdvance !== null && inputAdvance > 0
              ? inputAdvance
              : (dbAdvance > 0 ? dbAdvance : totalAmount);

            const payStatus = payment_status || (advanceVal >= totalAmount ? 'paid' : (advanceVal > 0 ? 'partially_paid' : 'unpaid'));
            const orderNotes = notes || invoice.notes || null;

            // Insert into orders
            const { rows: orderRows } = await client.query(
              `INSERT INTO ${agentPrefix}_orders (customer_id, invoice_id, total_amount, advance_amount, payment_status, status, notes, shipping_address, estimated_delivery_date, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
               RETURNING *`,
              [
                invoice.customer_id,
                invoice.id,
                totalAmount,
                advanceVal,
                payStatus,
                'pending',
                orderNotes,
                shipping_address ? shipping_address.trim() : null,
                estimated_delivery_date ? new Date(estimated_delivery_date).toISOString() : null,
              ]
            );

            const newOrder = orderRows[0];

            // Link existing invoice items to the new order_id
            await client.query(
              `UPDATE ${agentPrefix}_orders_items SET order_id = $1 WHERE invoice_id = $2`,
              [newOrder.id, invoice.id]
            );

            // Update invoice status to 'paid' and set order_id
            const { rows: updatedInvRows } = await client.query(
              `UPDATE ${agentPrefix}_orders_invoices 
               SET status = 'paid', order_id = $1, advance_amount = $2, updated_at = NOW() 
               WHERE id = $3 
               RETURNING *`,
              [newOrder.id, advanceVal, invoice.id]
            );

            await client.query("COMMIT");

            // Regenerate paid PDF, delete old unpaid PDF from R2, and re-dispatch on WhatsApp
            let finalInvoice = updatedInvRows[0];
            try {
              const markResult = await markInvoiceAsPaidAndRedispatch({
                agent,
                invoiceId: invoice.id,
                advanceAmount: advanceVal,
                orderId: newOrder.id,
                pgClient,
                emitNewMessage,
                cacheService,
                emitAgentStatusUpdate,
              });
              if (markResult?.invoice) {
                finalInvoice = markResult.invoice;
              }
            } catch (lifecycleErr) {
              console.error("[Manage Invoices] Error in paid invoice lifecycle dispatch:", lifecycleErr);
            }

            return reply.code(201).send({
              success: true,
              message: "Order created from invoice successfully",
              order: newOrder,
              invoice: finalInvoice,
            });
          } catch (err) {
            await client.query("ROLLBACK");
            console.error("Create order from invoice error:", err);
            return reply.code(500).send({ success: false, message: "Failed to create order from invoice" });
          } finally {
            client.release();
          }
        }

        case "PUT": {
          const body = request.body as any;
          const { id, status, order_id, advance_amount } = body;

          if (!id || typeof id !== "number") {
            return reply.code(400).send({
              success: false,
              message: "Invoice ID is required",
            });
          }

          if (status && !["generated", "sent", "paid", "partially_paid"].includes(status)) {
            return reply.code(400).send({
              success: false,
              message: "Valid status is required",
            });
          }

          // If editing invoice details (items, name, notes, totals), perform complete update & PDF regeneration
          if (body.items || body.invoiceName || body.name || body.is_edit) {
            try {
              const editResult = await updateInvoiceWithPdfRegeneration({
                agent,
                invoiceId: id,
                invoiceName: body.invoiceName || body.name,
                items: body.items || [],
                discountPercentage: body.discountPercentage,
                advanceAmount: body.advanceAmount,
                totalAmount: body.totalAmount,
                notes: body.notes,
                status: body.status,
                customerId: body.customerId,
                pdfBase64: body.pdfBase64,
                pgClient,
              });
              return reply.code(200).send(editResult);
            } catch (editErr: any) {
              console.error("[Manage Invoices] Edit invoice error:", editErr);
              return reply.code(500).send({ success: false, message: editErr.message || "Failed to update invoice" });
            }
          }

          // If marking as paid or partially paid (advance), execute complete lifecycle: update PDF, update record, re-dispatch via WhatsApp
          if (status === "paid" || status === "partially_paid") {
            try {
              const markResult = await markInvoiceAsPaidAndRedispatch({
                agent,
                invoiceId: id,
                advanceAmount: advance_amount,
                orderId: order_id,
                pgClient,
                emitNewMessage,
                cacheService,
                emitAgentStatusUpdate,
              });
              const isPaidFull = markResult.invoice?.status === 'paid';
              return reply.code(200).send({
                success: true,
                message: isPaidFull ? "Invoice marked as paid in full, PDF updated, and sent via WhatsApp" : "Invoice advance recorded, PDF updated, and sent via WhatsApp",
                invoice: markResult.invoice,
                whatsappDispatched: markResult.whatsappDispatched,
              });
            } catch (err: any) {
              console.error("[Manage Invoices] Error marking invoice as paid:", err);
              return reply.code(500).send({ success: false, message: err.message || "Failed to mark invoice as paid" });
            }
          }

          const setParts: string[] = ["updated_at = NOW()"];
          const params: any[] = [id];
          let pIdx = 2;
          if (status) { setParts.push(`status = $${pIdx++}`); params.push(status === 'partially_paid' ? 'paid' : status); }
          if (order_id !== undefined) { setParts.push(`order_id = $${pIdx++}`); params.push(order_id); }
          if (advance_amount !== undefined) { setParts.push(`advance_amount = $${pIdx++}`); params.push(Number(advance_amount) || 0); }

          const { rows: updatedInvoices } = await pgClient.query(
            `UPDATE ${agentPrefix}_orders_invoices SET ${setParts.join(", ")} WHERE id = $1 RETURNING *`,
            params
          );
          if (updatedInvoices.length === 0) {
            return reply.code(404).send({ success: false, message: "Invoice not found" });
          }
          return reply.code(200).send({ success: true, message: "Invoice updated successfully", invoice: updatedInvoices[0] });
        }

        case "DELETE": {
          const id = url.searchParams.get("id");

          if (!id || typeof id !== "string" || !id.match(/^\d+$/)) {
            return reply.code(400).send({
              success: false,
              message: "Valid invoice ID is required",
            });
          }

          const invoiceId = parseInt(id);

          // Get invoice details including pdf_url for file deletion
          const selectQuery = `
            SELECT pdf_url FROM ${agentPrefix}_orders_invoices WHERE id = $1
          `;
          const { rows: invoices } = await pgClient.query(selectQuery, [
            invoiceId,
          ]);

          if (invoices.length === 0) {
            return reply.code(404).send({
              success: false,
              message: "Invoice not found",
            });
          }

          const invoice = invoices[0];

          // Extract key from pdf_url
          const publicUrl = process.env.R2_PUBLIC_URL;
          if (publicUrl && invoice.pdf_url) {
            const key = invoice.pdf_url.replace(publicUrl + "/", "");
            await deleteMediaFromR2(key).catch(e => console.error("Storage deletion error:", e));
          }

          // Delete from database (items with invoice_id cascade automatically)
          const deleteQuery = `
            DELETE FROM ${agentPrefix}_orders_invoices WHERE id = $1
          `;
          await pgClient.query(deleteQuery, [invoiceId]);

          return reply.code(200).send({ success: true, message: "Invoice deleted successfully" });
        }

        default:
          return reply.code(405).send({ success: false, message: "Method not allowed" });
      }
    } catch (error) {
      console.error("Invoice management error:", error);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });
}