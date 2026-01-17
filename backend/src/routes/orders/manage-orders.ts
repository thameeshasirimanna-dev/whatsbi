import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function manageOrdersRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.all("/manage-orders", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE user_id = $1",
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          message: "Agent not found",
        });
      }

      const agent = agentRows[0];
      const agentPrefix = agent.agent_prefix;
      const method = request.method;
      const url = new URL(request.url, `http://${request.headers.host}`);
      let parsedBody = null;

      if (method === "POST" || method === "PUT") {
        try {
          parsedBody = request.body as any;
        } catch (e) {
          console.error("JSON parse error:", e);
          return reply
            .code(400)
            .send({ success: false, message: "Invalid JSON body" });
        }
      }


      switch (method) {
        case "GET": {
          const search = url.searchParams.get("search") || undefined;
          const limit = parseInt(url.searchParams.get("limit") || "50");
          const offset = parseInt(url.searchParams.get("offset") || "0");
          const customerId = url.searchParams.get("customer_id");
          const orderId = url.searchParams.get("order_id");
          const type = url.searchParams.get("type");

          console.log("Orders fetch params:", {
            search,
            limit,
            offset,
            customerId,
            orderId,
            type,
            agentPrefix,
          });

          // If type=items and order_id is provided, fetch only order items
          if (type === "items" && orderId) {
            const sql = `
              SELECT
                name, quantity, price, (quantity * price) as total
              FROM ${agentPrefix}_orders_items
              WHERE order_id = $1
              ORDER BY id
            `;

            const { rows: items } = await pgClient.query(sql, [
              parseInt(orderId),
            ]);

            return reply.code(200).send({
              success: true,
              items: items || [],
            });
          }

          // If order_id is provided, fetch single order
          if (orderId) {
            const sql = `
              SELECT
                o.*,
                json_build_object('id', c.id, 'name', c.name, 'phone', c.phone) as customer,
                COALESCE(json_agg(
                  json_build_object('order_id', oi.order_id, 'name', oi.name, 'quantity', oi.quantity, 'price', oi.price, 'total', oi.quantity * oi.price)
                ) FILTER (WHERE oi.order_id IS NOT NULL), '[]'::json) as items
              FROM ${agentPrefix}_orders o
              LEFT JOIN ${agentPrefix}_customers c ON o.customer_id = c.id
              LEFT JOIN ${agentPrefix}_orders_items oi ON o.id = oi.order_id
              WHERE o.id = $1
              GROUP BY o.id, c.id
            `;

            const { rows: orders } = await pgClient.query(sql, [
              parseInt(orderId),
            ]);

            if (orders.length === 0) {
              return reply.code(404).send({
                success: false,
                message: "Order not found",
              });
            }

            return reply.code(200).send({
              success: true,
              order: orders[0],
            });
          }

          // Build the SQL query
          let sql = `
            SELECT
              o.*,
              json_build_object('id', c.id, 'name', c.name, 'phone', c.phone) as customer,
              COALESCE(json_agg(
                json_build_object('order_id', oi.order_id, 'name', oi.name, 'quantity', oi.quantity, 'price', oi.price)
              ) FILTER (WHERE oi.order_id IS NOT NULL), '[]'::json) as order_items
            FROM ${agentPrefix}_orders o
            LEFT JOIN ${agentPrefix}_customers c ON o.customer_id = c.id
            LEFT JOIN ${agentPrefix}_orders_items oi ON o.id = oi.order_id
          `;

          const params: any[] = [];
          const conditions: string[] = [];

          if (customerId) {
            conditions.push("o.customer_id = $" + (params.length + 1));
            params.push(parseInt(customerId));
          }

          if (search) {
            conditions.push(
              "(o.notes ILIKE $" +
                (params.length + 1) +
                " OR c.name ILIKE $" +
                (params.length + 2) +
                ")"
            );
            params.push(`%${search}%`, `%${search}%`);
          }

          if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
          }

          sql += " GROUP BY o.id, c.id ORDER BY o.created_at DESC";

          if (limit > 0) {
            sql += " LIMIT $" + (params.length + 1);
            params.push(limit);
          }

          if (offset > 0) {
            sql += " OFFSET $" + (params.length + 1);
            params.push(offset);
          }

          const { rows: orders, rowCount } = await pgClient.query(sql, params);

          if (rowCount === undefined) {
            return reply
              .code(500)
              .send({ success: false, message: "Failed to fetch orders" });
          }

          return reply.code(200).send({
            success: true,
            orders: orders || [],
          });
        }

        case "POST": {
          const body = parsedBody;
          const { customer_id, notes, shipping_address, items, order_id } =
            body || {};
          const type = url.searchParams.get("type");

          // Handle insert-items type
          if (type === "insert-items") {
            if (!body?.order_id || typeof body.order_id !== "number") {
              return reply.code(400).send({
                success: false,
                message: "Valid order ID is required",
              });
            }

            if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
              return reply.code(400).send({
                success: false,
                message: "Order items are required",
              });
            }

            // Validate items
            for (const item of body.items) {
              if (
                !item.name ||
                typeof item.name !== "string" ||
                item.name.trim().length === 0
              ) {
                return reply
                  .code(400)
                  .send({ success: false, message: "Item name is required" });
              }
              if (
                !item.quantity ||
                typeof item.quantity !== "number" ||
                item.quantity <= 0
              ) {
                return reply.code(400).send({
                  success: false,
                  message: "Valid item quantity is required",
                });
              }
              if (typeof item.price !== "number" || isNaN(item.price) || item.price < 0) {
                return reply.code(400).send({
                  success: false,
                  message: "Valid item price is required",
                });
              }
            }

            // Insert order items
            const orderItems = body.items.map((item: any) => ({
              order_id: body.order_id,
              name: item.name.trim(),
              quantity: item.quantity,
              price: item.price,
            }));

            if (orderItems.length > 0) {
              const values = orderItems
                .map(
                  (_, i) =>
                    `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${
                      i * 4 + 4
                    })`
                )
                .join(", ");
              const params = orderItems.flatMap((item) => [
                item.order_id,
                item.name,
                item.quantity,
                item.price,
              ]);
              await pgClient.query(
                `INSERT INTO ${agentPrefix}_orders_items (order_id, name, quantity, price) VALUES ${values}`,
                params
              );
            }

            return reply.code(201).send({
              success: true,
              message: "Order items inserted successfully",
            });
          }

          // Validate required fields for creating new order
          if (!customer_id || typeof customer_id !== "number") {
            return reply.code(400).send({
              success: false,
              message: "Valid customer ID is required",
            });
          }

          if (!items || !Array.isArray(items) || items.length === 0) {
            return reply.code(400).send({
              success: false,
              message: "Order must have at least one item",
            });
          }

          // Validate items
          for (const item of items) {
            if (
              !item.name ||
              typeof item.name !== "string" ||
              item.name.trim().length === 0
            ) {
              return reply
                .code(400)
                .send({ success: false, message: "Item name is required" });
            }
            if (
              !item.quantity ||
              typeof item.quantity !== "number" ||
              item.quantity <= 0
            ) {
              return reply.code(400).send({
                success: false,
                message: "Valid item quantity is required",
              });
            }
            if (typeof item.price !== "number" || isNaN(item.price) || item.price < 0) {
              return reply.code(400).send({
                success: false,
                message: "Valid item price is required",
              });
            }
          }

          // Calculate total amount
          const totalAmount = items.reduce(
            (sum: number, item: any) => sum + item.quantity * item.price,
            0
          );

          const orderData = {
            customer_id,
            total_amount: totalAmount,
            status: "pending",
            notes: notes ? notes.trim() : null,
            shipping_address: shipping_address ? shipping_address.trim() : null,
            updated_at: new Date().toISOString(),
          };

          // Start transaction
          const client = await pgClient.connect();
          try {
            await client.query("BEGIN");

            // Insert order
            const { rows: orderRows } = await client.query(
              `INSERT INTO ${agentPrefix}_orders (customer_id, total_amount, status, notes, shipping_address, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
              [
                orderData.customer_id,
                orderData.total_amount,
                orderData.status,
                orderData.notes,
                orderData.shipping_address,
                orderData.updated_at,
              ]
            );

            if (orderRows.length === 0) {
              await client.query("ROLLBACK");
              return reply
                .code(500)
                .send({ success: false, message: "Failed to create order" });
            }

            const order = orderRows[0];

            // Insert order items
            const orderItems = items.map((item: any) => ({
              order_id: order.id,
              name: item.name.trim(),
              quantity: item.quantity,
              price: item.price,
            }));

            if (orderItems.length > 0) {
              const values = orderItems
                .map(
                  (_, i) =>
                    `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${
                      i * 4 + 4
                    })`
                )
                .join(", ");
              const params = orderItems.flatMap((item) => [
                item.order_id,
                item.name,
                item.quantity,
                item.price,
              ]);
              await client.query(
                `INSERT INTO ${agentPrefix}_orders_items (order_id, name, quantity, price) VALUES ${values}`,
                params
              );
            }

            await client.query("COMMIT");

            return reply.code(201).send({
              success: true,
              message: "Order created successfully",
              order: {
                ...order,
                items: orderItems,
              },
            });
          } catch (error) {
            await client.query("ROLLBACK");
            console.error("Create order error:", error);
            return reply
              .code(500)
              .send({ success: false, message: "Failed to create order" });
          } finally {
            client.release();
          }
        }

        case "PUT": {
          const body = parsedBody;
          const { id, status, notes, shipping_address, total_amount } =
            body || {};

          if (!id || typeof id !== "number") {
            return reply
              .code(400)
              .send({ success: false, message: "Order ID is required" });
          }

          // Validate status if provided
          const validStatuses = [
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
          ];
          if (status && !validStatuses.includes(status)) {
            return reply
              .code(400)
              .send({ success: false, message: "Invalid order status" });
          }

          const updateData: any = {
            updated_at: new Date().toISOString(),
          };

          if (status !== undefined) updateData.status = status;
          if (notes !== undefined)
            updateData.notes = notes ? notes.trim() : null;
          if (shipping_address !== undefined)
            updateData.shipping_address = shipping_address
              ? shipping_address.trim()
              : null;
          if (
            total_amount !== undefined &&
            typeof total_amount === "number" &&
            total_amount >= 0
          )
            updateData.total_amount = total_amount;

          const setParts = [];
          const params = [id];
          let paramIndex = 2;

          if (status !== undefined) {
            setParts.push(`status = $${paramIndex++}`);
            params.push(status);
          }
          if (notes !== undefined) {
            setParts.push(`notes = $${paramIndex++}`);
            params.push(notes);
          }
          if (shipping_address !== undefined) {
            setParts.push(`shipping_address = $${paramIndex++}`);
            params.push(shipping_address);
          }
          if (
            total_amount !== undefined &&
            typeof total_amount === "number" &&
            total_amount >= 0
          ) {
            setParts.push(`total_amount = $${paramIndex++}`);
            params.push(total_amount);
          }
          setParts.push(`updated_at = $${paramIndex++}`);
          params.push(updateData.updated_at);

          const { rows: orderRows } = await pgClient.query(
            `UPDATE ${agentPrefix}_orders SET ${setParts.join(
              ", "
            )} WHERE id = $1 RETURNING *`,
            params
          );

          if (orderRows.length === 0) {
            return reply
              .code(404)
              .send({ success: false, message: "Order not found" });
          }

          const order = orderRows[0];

          return reply.code(200).send({
            success: true,
            message: "Order updated successfully",
            order,
          });
        }

        case "DELETE": {
          const type = url.searchParams.get("type");
          const orderId = url.searchParams.get("order_id");

          // Handle delete-items type
          if (type === "delete-items" && orderId) {
            const sql = `DELETE FROM ${agentPrefix}_orders_items WHERE order_id = $1`;

            await pgClient.query(sql, [parseInt(orderId)]);

            return reply.code(200).send({
              success: true,
              message: "Order items deleted successfully",
            });
          }

          // Handle full order deletion
          const id = url.searchParams.get("id");

          if (!id || typeof id !== "string" || !id.match(/^\d+$/)) {
            return reply
              .code(400)
              .send({ success: false, message: "Valid order ID is required" });
          }

          const orderIdNum = parseInt(id);

          // Delete order (cascade will delete order items)
          const { rows: orderRows } = await pgClient.query(
            `DELETE FROM ${agentPrefix}_orders WHERE id = $1 RETURNING *`,
            [orderIdNum]
          );

          if (orderRows.length === 0) {
            return reply
              .code(404)
              .send({ success: false, message: "Order not found" });
          }

          return reply.code(200).send({
            success: true,
            message: "Order deleted successfully",
          });
        }

        default: {
          return reply
            .code(405)
            .send({ success: false, message: "Method not allowed" });
        }
      }
    } catch (error) {
      console.error("Order management error:", error);
      return reply
        .code(500)
        .send({ success: false, message: "Internal server error" });
    }
  });
}