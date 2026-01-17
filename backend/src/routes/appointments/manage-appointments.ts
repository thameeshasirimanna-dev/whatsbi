import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function manageAppointmentsRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.all("/manage-appointments", async (request, reply) => {
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
          const customerId = url.searchParams.get("customer_id");
          const status = url.searchParams.get("status");


          // Build the query
          let queryText = `
            SELECT a.*, c.name as customer_name, c.phone as customer_phone
            FROM ${agentPrefix}_appointments a
            LEFT JOIN ${agentPrefix}_customers c ON a.customer_id = c.id
            WHERE 1=1
          `;
          const queryParams: any[] = [];

          if (customerId) {
            queryText += ` AND a.customer_id = $${queryParams.length + 1}`;
            queryParams.push(parseInt(customerId));
          }

          if (status) {
            queryText += ` AND a.status = $${queryParams.length + 1}`;
            queryParams.push(status);
          }

          if (search) {
            queryText += ` AND (a.title ILIKE $${
              queryParams.length + 1
            } OR a.notes ILIKE $${queryParams.length + 1} OR c.name ILIKE $${
              queryParams.length + 1
            } OR c.phone ILIKE $${queryParams.length + 1})`;
            queryParams.push(`%${search}%`);
          }

          queryText += ` ORDER BY a.appointment_date ASC`;

          if (limit > 0) {
            queryText += ` LIMIT $${queryParams.length + 1}`;
            queryParams.push(limit);
          }

          if (offset > 0) {
            queryText += ` OFFSET $${queryParams.length + 1}`;
            queryParams.push(offset);
          }

          const { rows: appointments } = await pgClient.query(
            queryText,
            queryParams
          );

          return reply.code(200).send({
            success: true,
            appointments: appointments || [],
          });
        }

        case "POST": {
          const body = parsedBody;
          const {
            customer_id,
            title,
            appointment_date,
            duration_minutes,
            notes,
          } = body || {};

          // Validate required fields
          if (!customer_id || typeof customer_id !== "number") {
            return reply.code(400).send({
              success: false,
              message: "Valid customer ID is required",
            });
          }

          if (
            !title ||
            typeof title !== "string" ||
            title.trim().length === 0
          ) {
            return reply.code(400).send({
              success: false,
              message: "Appointment title is required",
            });
          }

          if (!appointment_date) {
            return reply.code(400).send({
              success: false,
              message: "Appointment date is required",
            });
          }

          // Validate appointment date is in the future
          const appointmentDate = new Date(appointment_date);
          if (
            isNaN(appointmentDate.getTime()) ||
            appointmentDate <= new Date()
          ) {
            return reply.code(400).send({
              success: false,
              message: "Appointment date must be in the future",
            });
          }

          const appointmentData = {
            customer_id,
            title: title.trim(),
            appointment_date: appointment_date,
            duration_minutes: duration_minutes || 60,
            status: "pending",
            notes: notes ? notes.trim() : null,
            updated_at: new Date().toISOString(),
          };

          const insertQuery = `
            INSERT INTO ${agentPrefix}_appointments (customer_id, title, appointment_date, duration_minutes, status, notes, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
          const insertParams = [
            appointmentData.customer_id,
            appointmentData.title,
            appointmentData.appointment_date,
            appointmentData.duration_minutes,
            appointmentData.status,
            appointmentData.notes,
            appointmentData.updated_at,
          ];

          const { rows: insertedRows } = await pgClient.query(
            insertQuery,
            insertParams
          );

          if (insertedRows.length === 0) {
            return reply.code(500).send({
              success: false,
              message: "Failed to create appointment",
            });
          }

          // Fetch the appointment with customer info
          const selectQuery = `
            SELECT a.*, c.name as customer_name, c.phone as customer_phone
            FROM ${agentPrefix}_appointments a
            LEFT JOIN ${agentPrefix}_customers c ON a.customer_id = c.id
            WHERE a.id = $1
          `;
          const { rows: appointmentRows } = await pgClient.query(selectQuery, [
            insertedRows[0].id,
          ]);

          return reply.code(201).send({
            success: true,
            message: "Appointment created successfully",
            appointment: appointmentRows[0],
          });
        }

        case "PUT": {
          const body = parsedBody;
          const {
            id,
            title,
            appointment_date,
            duration_minutes,
            status,
            notes,
          } = body || {};

          if (!id || typeof id !== "number") {
            return reply
              .code(400)
              .send({ success: false, message: "Appointment ID is required" });
          }

          // Validate status if provided
          const validStatuses = [
            "pending",
            "confirmed",
            "completed",
            "cancelled",
            "no_show",
          ];
          if (status && !validStatuses.includes(status)) {
            return reply
              .code(400)
              .send({ success: false, message: "Invalid appointment status" });
          }

          // Validate appointment date if provided
          if (appointment_date) {
            const appointmentDate = new Date(appointment_date);
            if (isNaN(appointmentDate.getTime())) {
              return reply
                .code(400)
                .send({ success: false, message: "Invalid appointment date" });
            }
          }

          const updateData: any = {
            updated_at: new Date().toISOString(),
          };

          if (title !== undefined)
            updateData.title = title ? title.trim() : null;
          if (appointment_date !== undefined)
            updateData.appointment_date = appointment_date;
          if (duration_minutes !== undefined)
            updateData.duration_minutes = duration_minutes;
          if (status !== undefined) updateData.status = status;
          if (notes !== undefined)
            updateData.notes = notes ? notes.trim() : null;

          const updateFields: string[] = [];
          const updateValues: any[] = [];

          if (title !== undefined) {
            updateFields.push(`title = $${updateValues.length + 1}`);
            updateValues.push(title ? title.trim() : null);
          }
          if (appointment_date !== undefined) {
            updateFields.push(`appointment_date = $${updateValues.length + 1}`);
            updateValues.push(appointment_date);
          }
          if (duration_minutes !== undefined) {
            updateFields.push(`duration_minutes = $${updateValues.length + 1}`);
            updateValues.push(duration_minutes);
          }
          if (status !== undefined) {
            updateFields.push(`status = $${updateValues.length + 1}`);
            updateValues.push(status);
          }
          if (notes !== undefined) {
            updateFields.push(`notes = $${updateValues.length + 1}`);
            updateValues.push(notes ? notes.trim() : null);
          }
          updateFields.push(`updated_at = $${updateValues.length + 1}`);
          updateValues.push(updateData.updated_at);

          if (updateFields.length === 0) {
            return reply
              .code(400)
              .send({ success: false, message: "No fields to update" });
          }

          const updateQuery = `
            UPDATE ${agentPrefix}_appointments
            SET ${updateFields.join(", ")}
            WHERE id = $${updateValues.length + 1}
            RETURNING *
          `;
          updateValues.push(id);

          const { rows: updatedRows } = await pgClient.query(
            updateQuery,
            updateValues
          );

          if (updatedRows.length === 0) {
            return reply
              .code(404)
              .send({ success: false, message: "Appointment not found" });
          }

          // Fetch with customer info
          const selectQuery = `
            SELECT a.*, c.name as customer_name, c.phone as customer_phone
            FROM ${agentPrefix}_appointments a
            LEFT JOIN ${agentPrefix}_customers c ON a.customer_id = c.id
            WHERE a.id = $1
          `;
          const { rows: appointmentRows } = await pgClient.query(selectQuery, [
            id,
          ]);

          return reply.code(200).send({
            success: true,
            message: "Appointment updated successfully",
            appointment: appointmentRows[0],
          });
        }

        case "DELETE": {
          const id = url.searchParams.get("id");

          if (!id || typeof id !== "string" || !id.match(/^\d+$/)) {
            return reply.code(400).send({
              success: false,
              message: "Valid appointment ID is required",
            });
          }

          const appointmentId = parseInt(id);

          const deleteQuery = `
            DELETE FROM ${agentPrefix}_appointments
            WHERE id = $1
            RETURNING *
          `;

          const { rows: deletedRows } = await pgClient.query(deleteQuery, [
            appointmentId,
          ]);

          if (deletedRows.length === 0) {
            return reply
              .code(404)
              .send({ success: false, message: "Appointment not found" });
          }

          return reply.code(200).send({
            success: true,
            message: "Appointment deleted successfully",
          });
        }

        default: {
          return reply
            .code(405)
            .send({ success: false, message: "Method not allowed" });
        }
      }
    } catch (error) {
      console.error("Appointment management error:", error);
      return reply
        .code(500)
        .send({ success: false, message: "Internal server error" });
    }
  });
}