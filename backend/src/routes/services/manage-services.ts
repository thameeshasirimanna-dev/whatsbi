import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function manageServicesRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.post("/manage-services", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;
      const { operation, ...opData } = body;

      if (
        !operation ||
        !["create", "get", "update", "delete"].includes(operation)
      ) {
        return reply.code(400).send({
          status: "error",
          message: 'operation must be "create", "get", "update", or "delete"',
        });
      }

      // Get agent
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE user_id = $1",
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          status: "error",
          message: "Agent not found",
        });
      }

      const agent = agentRows[0];

      const agentId = agent.id;
      const agentPrefix = agent.agent_prefix;
      const servicesTable = `${agentPrefix}_services`;
      const servicePackagesTable = `${agentPrefix}_service_packages`;

      switch (operation) {
        case "create": {
          const { service_name, description, packages, images } = opData;

          // Validation
          if (
            !service_name ||
            typeof service_name !== "string" ||
            service_name.trim().length === 0
          ) {
            return reply.code(400).send({
              status: "error",
              message: "service_name is required",
            });
          }

          if (!Array.isArray(packages) || packages.length === 0) {
            return reply.code(400).send({
              status: "error",
              message: "packages array is required and must not be empty",
            });
          }

          // Check for duplicate service_name
          const { rows: existingServiceRows } = await pgClient.query(
            `SELECT id FROM ${servicesTable} WHERE service_name = $1 AND agent_id = $2`,
            [service_name.trim(), agentId]
          );

          if (existingServiceRows.length > 0) {
            return reply.code(409).send({
              status: "error",
              message: "Service name already exists",
            });
          }

          // Call transaction function
          const { rows: transactionRows } = await pgClient.query(
            "SELECT create_service_transaction($1, $2, $3, $4, $5, $6, $7)",
            [
              agentId,
              servicesTable,
              servicePackagesTable,
              service_name.trim(),
              description || null,
              null, // p_image_urls
              JSON.stringify(packages), // p_packages as JSONB
            ]
          );

          if (transactionRows.length === 0) {
            return reply.code(500).send({
              status: "error",
              message: "Failed to create service",
            });
          }

          const transactionData = transactionRows[0].create_service_transaction;

          let finalData = transactionData;

          // Handle image upload after service creation if images provided
          if (images && Array.isArray(images) && images.length > 0) {
            // Note: Image processing logic would need to be ported from Edge Function
            // For now, skip images
            console.log("Image upload not implemented yet");
          }

          return reply.code(201).send({
            status: "success",
            message: "Service created successfully",
            data: finalData,
          });
        }

        case "get": {
          const {
            service_name: serviceNameFilter = "",
            package_name: packageNameFilter = "",
            sort_by: sortBy = "created_at",
            sort_order: sortOrder = "desc",
          } = opData;

          // Validate sort options
          const validSorts = ["price", "created_at"];
          if (!validSorts.includes(sortBy)) {
            return reply.code(400).send({
              status: "error",
              message: "Invalid sort_by parameter. Use price or created_at",
            });
          }

          // Call database function
          const { rows: servicesRows } = await pgClient.query(
            "SELECT * FROM get_agent_services($1, $2, $3, $4, $5)",
            [
              agentId,
              serviceNameFilter || null,
              packageNameFilter || null,
              sortBy,
              sortOrder,
            ]
          );

          const services = servicesRows || [];

          return reply.code(200).send({
            status: "success",
            message: "Services fetched successfully",
            data: services,
          });
        }

        case "update": {
          const { type, id, updates, removed_image_urls } = opData;

          // Validation
          if (!type || !["service", "package"].includes(type)) {
            return reply.code(400).send({
              status: "error",
              message: 'type must be "service" or "package"',
            });
          }

          if (!id || typeof id !== "string") {
            return reply.code(400).send({
              status: "error",
              message: "id is required",
            });
          }

          if (
            !updates ||
            typeof updates !== "object" ||
            Object.keys(updates).length === 0
          ) {
            return reply.code(400).send({
              status: "error",
              message: "updates object is required and must not be empty",
            });
          }

          // Handle removed images
          if (
            type === "service" &&
            removed_image_urls &&
            Array.isArray(removed_image_urls) &&
            removed_image_urls.length > 0
          ) {
            // Note: Image deletion logic would need to be ported
            console.log("Image deletion not implemented yet");
            if (!updates.image_urls) updates.image_urls = {};
            if (!updates.image_urls.remove) updates.image_urls.remove = [];
            updates.image_urls.remove.push(...removed_image_urls);
          }

          // Handle new images
          if (
            type === "service" &&
            updates.images &&
            Array.isArray(updates.images) &&
            updates.images.length > 0
          ) {
            // Note: Image upload logic would need to be ported
            console.log("Image upload not implemented yet");
          }

          // Call database function
          const { rows: updateRows } = await pgClient.query(
            "SELECT update_service_data($1, $2, $3, $4)",
            [agentId, type, id, JSON.stringify(updates)]
          );

          if (updateRows.length === 0) {
            return reply.code(500).send({
              status: "error",
              message: "Failed to update service",
            });
          }

          const data = updateRows[0].update_service_data;

          return reply.code(200).send({
            status: "success",
            message: `${
              type.charAt(0).toUpperCase() + type.slice(1)
            } updated successfully`,
            data,
          });
        }

        case "delete": {
          const { id } = opData;

          // Validation
          if (!id || typeof id !== "string") {
            return reply.code(400).send({
              status: "error",
              message: "id is required",
            });
          }

          // Check dependencies
          const { rows: dependencyRows } = await pgClient.query(
            "SELECT check_service_dependencies($1, $2)",
            [agentId, id]
          );

          if (dependencyRows.length === 0) {
            return reply.code(500).send({
              status: "error",
              message: "Failed to check dependencies",
            });
          }

          const dependencyCheck = dependencyRows[0].check_service_dependencies;

          if (dependencyCheck && dependencyCheck.has_dependencies) {
            return reply.code(403).send({
              status: "error",
              message: "Cannot delete: service has dependencies",
            });
          }

          // Hard delete
          const { rows: hardDeleteRows } = await pgClient.query(
            "SELECT hard_delete_service($1, $2)",
            [agentId, id]
          );

          if (hardDeleteRows.length === 0) {
            return reply.code(500).send({
              status: "error",
              message: "Failed to permanently delete service",
            });
          }

          const hardData = hardDeleteRows[0].hard_delete_service;

          return reply.code(200).send({
            status: "success",
            message: "Service permanently deleted successfully",
            data: hardData,
          });
        }

        default:
          return reply.code(400).send({
            status: "error",
            message: "Invalid operation",
          });
      }
    } catch (error) {
      console.error("Manage services error:", error);
      return reply.code(500).send({
        status: "error",
        message: "Internal server error",
      });
    }
  });
}