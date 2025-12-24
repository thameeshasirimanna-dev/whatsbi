import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function manageCustomersRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.all("/manage-customers", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent
      const agentQuery =
        "SELECT id, agent_prefix FROM agents WHERE user_id = $1";
      const agentResult = await pgClient.query(agentQuery, [
        authenticatedUser.id,
      ]);

      if (agentResult.rows.length === 0) {
        return reply.code(403).send({
          success: false,
          message: "Agent not found",
        });
      }

      const agent = agentResult.rows[0];

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

          // console.log("Customers fetch params:", {
          //   search,
          //   limit,
          //   offset,
          //   agentPrefix,
          // });

          // Build the query with order count
           let queryText = `
             SELECT c.*,
                    COALESCE(order_counts.order_count, 0) as order_count
             FROM ${agentPrefix}_customers c
             LEFT JOIN (
               SELECT customer_id, COUNT(*) as order_count
               FROM ${agentPrefix}_orders
               GROUP BY customer_id
             ) order_counts ON c.id = order_counts.customer_id
             ORDER BY c.created_at DESC
           `;
           const queryParams: any[] = [];

          if (search) {
            queryText += ` WHERE (name ILIKE $1 OR phone ILIKE $1)`;
            queryParams.push(`%${search}%`);
          }

          if (limit > 0) {
            queryText += ` LIMIT $${queryParams.length + 1}`;
            queryParams.push(limit);
          }

          if (offset > 0) {
            queryText += ` OFFSET $${queryParams.length + 1}`;
            queryParams.push(offset);
          }

          const { rows: customers } = await pgClient.query(
            queryText,
            queryParams
          );

          return reply.code(200).send({
            success: true,
            customers: customers || [],
          });
        }

        case "POST": {
          const body = parsedBody;
          const {
            name,
            phone,
            email,
            address,
            lead_stage,
            interest_stage,
            conversion_stage,
            language,
            ai_enabled,
          } = body || {};

          // Validate required fields
          if (!name || typeof name !== "string" || name.trim().length === 0) {
            return reply
              .code(400)
              .send({ success: false, message: "Customer name is required" });
          }

          if (
            !phone ||
            typeof phone !== "string" ||
            phone.trim().length === 0
          ) {
            return reply
              .code(400)
              .send({ success: false, message: "Customer phone is required" });
          }

          // Validate stages if provided
          const validLeadStages = [
            "New Lead",
            "Contacted",
            "Not Responding",
            "Follow-up Needed",
          ];
          const validInterestStages = [
            "Interested",
            "Quotation Sent",
            "Asked for More Info",
          ];
          const validConversionStages = [
            "Payment Pending",
            "Paid",
            "Order Confirmed",
          ];
          if (lead_stage && !validLeadStages.includes(lead_stage)) {
            return reply
              .code(400)
              .send({ success: false, message: "Invalid lead stage" });
          }
          if (interest_stage && !validInterestStages.includes(interest_stage)) {
            return reply
              .code(400)
              .send({ success: false, message: "Invalid interest stage" });
          }
          if (conversion_stage && !validConversionStages.includes(conversion_stage)) {
            return reply
              .code(400)
              .send({ success: false, message: "Invalid conversion stage" });
          }

          // Validate language if provided
          const validLanguages = ["en", "si", "ta"];
          if (language && !validLanguages.includes(language)) {
            return reply
              .code(400)
              .send({ success: false, message: "Invalid language" });
          }

          const customerData = {
            name: name.trim(),
            phone: phone.trim(),
            email: email ? email.trim() : null,
            address: address ? address.trim() : null,
            lead_stage: lead_stage || "New Lead",
            interest_stage: interest_stage || null,
            conversion_stage: conversion_stage || null,
            language: language || "en",
            ai_enabled: ai_enabled !== undefined ? ai_enabled : true,
            last_user_message_time: new Date().toISOString(),
          };

           const insertQuery = `
            INSERT INTO ${agentPrefix}_customers (name, phone, email, address, lead_stage, interest_stage, conversion_stage, language, ai_enabled, last_user_message_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
          `;
           const insertParams = [
             customerData.name,
             customerData.phone,
             customerData.email,
             customerData.address,
             customerData.lead_stage,
             customerData.interest_stage,
             customerData.conversion_stage,
             customerData.language,
             customerData.ai_enabled,
             customerData.last_user_message_time,
           ];

          const { rows: customers } = await pgClient.query(
            insertQuery,
            insertParams
          );

          if (customers.length === 0) {
            return reply
              .code(500)
              .send({ success: false, message: "Failed to create customer" });
          }

          return reply.code(201).send({
            success: true,
            message: "Customer created successfully",
            customer: customers[0],
          });
        }

        case "PUT": {
           const body = parsedBody;
           const {
             id,
             name,
             phone,
             email,
             address,
             lead_stage,
             interest_stage,
             conversion_stage,
             language,
             ai_enabled,
           } = body || {};

           if (!id || typeof id !== "number") {
             return reply
               .code(400)
               .send({ success: false, message: "Customer ID is required" });
           }

           // Validate lead_stage if provided
           const validLeadStages = [
             "New Lead",
             "Contacted",
             "Not Responding",
             "Follow-up Needed",
           ];
           const validInterestStages = [
             "Interested",
             "Quotation Sent",
             "Asked for More Info",
           ];
           const validConversionStages = [
             "Payment Pending",
             "Paid",
             "Order Confirmed",
           ];
           if (lead_stage && !validLeadStages.includes(lead_stage)) {
             return reply
               .code(400)
               .send({ success: false, message: "Invalid lead stage" });
           }
           if (interest_stage && !validInterestStages.includes(interest_stage)) {
             return reply
               .code(400)
               .send({ success: false, message: "Invalid interest stage" });
           }
           if (conversion_stage && !validConversionStages.includes(conversion_stage)) {
             return reply
               .code(400)
               .send({ success: false, message: "Invalid conversion stage" });
           }

           // Validate language if provided
           const validLanguages = ["en", "si", "ta"];
           if (language && !validLanguages.includes(language)) {
             return reply
               .code(400)
               .send({ success: false, message: "Invalid language" });
           }

           const updateFields: string[] = [];
           const updateValues: any[] = [];

           if (name !== undefined) {
             updateFields.push(`name = $${updateValues.length + 1}`);
             updateValues.push(name.trim());
           }
           if (phone !== undefined) {
             updateFields.push(`phone = $${updateValues.length + 1}`);
             updateValues.push(phone.trim());
           }
           if (email !== undefined) {
             updateFields.push(`email = $${updateValues.length + 1}`);
             updateValues.push(email ? email.trim() : null);
           }
           if (address !== undefined) {
             updateFields.push(`address = $${updateValues.length + 1}`);
             updateValues.push(address ? address.trim() : null);
           }
           if (lead_stage !== undefined) {
             updateFields.push(`lead_stage = $${updateValues.length + 1}`);
             updateValues.push(lead_stage);
           }
           if (interest_stage !== undefined) {
             updateFields.push(`interest_stage = $${updateValues.length + 1}`);
             updateValues.push(interest_stage);
           }
           if (conversion_stage !== undefined) {
             updateFields.push(
               `conversion_stage = $${updateValues.length + 1}`
             );
             updateValues.push(conversion_stage);
           }
          if (language !== undefined) {
            updateFields.push(`language = $${updateValues.length + 1}`);
            updateValues.push(language);
          }
          if (ai_enabled !== undefined) {
            updateFields.push(`ai_enabled = $${updateValues.length + 1}`);
            updateValues.push(ai_enabled);
          }

          if (updateFields.length === 0) {
            return reply
              .code(400)
              .send({ success: false, message: "No fields to update" });
          }

          const updateQuery = `
            UPDATE ${agentPrefix}_customers
            SET ${updateFields.join(", ")}
            WHERE id = $${updateValues.length + 1}
            RETURNING *
          `;
          updateValues.push(id);

          const { rows: customers } = await pgClient.query(
            updateQuery,
            updateValues
          );

          if (customers.length === 0) {
            return reply
              .code(404)
              .send({ success: false, message: "Customer not found" });
          }

          return reply.code(200).send({
            success: true,
            message: "Customer updated successfully",
            customer: customers[0],
          });
        }

        case "DELETE": {
          const id = url.searchParams.get("id");

          if (!id || typeof id !== "string" || !id.match(/^\d+$/)) {
            return reply
              .code(400)
              .send({
                success: false,
                message: "Valid customer ID is required",
              });
          }

          const customerId = parseInt(id);

          const deleteQuery = `
            DELETE FROM ${agentPrefix}_customers
            WHERE id = $1
            RETURNING *
          `;

          const { rows: customers } = await pgClient.query(deleteQuery, [
            customerId,
          ]);

          if (customers.length === 0) {
            return reply
              .code(404)
              .send({ success: false, message: "Customer not found" });
          }

          return reply.code(200).send({
            success: true,
            message: "Customer deleted successfully",
          });
        }

        default: {
          return reply
            .code(405)
            .send({ success: false, message: "Method not allowed" });
        }
      }
    } catch (error) {
      console.error("Customer management error:", error);
      return reply
        .code(500)
        .send({ success: false, message: "Internal server error" });
    }
  });
}