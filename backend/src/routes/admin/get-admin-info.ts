import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function getAdminInfoRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.get("/get-admin-info", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get user info including role
      const { rows: userRows } = await pgClient.query(
        "SELECT id, name, email, role FROM users WHERE id = $1",
        [authenticatedUser.id]
      );

      let userData = userRows[0];
      let userError = null;
      if (userRows.length === 0) {
        userError = { message: "User not found" };
      }

      if (userError) {
        console.error("User query error:", userError.message);
      }

      if (userError) {
        console.error("User query error:", userError);
        return reply.code(500).send({
          success: false,
          message: `Failed to fetch user info: ${userError.message}`,
        });
      }

      if (!userData) {
        console.error("No user data found for ID:", authenticatedUser.id);
        // Try to create the user record if it doesn't exist
        const { rows: newUserRows, rowCount } = await pgClient.query(
          "INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4) RETURNING *",
          [
            authenticatedUser.id,
            authenticatedUser.email || "Unknown",
            authenticatedUser.email,
            "admin", // Default to admin for now
          ]
        );

        if (rowCount === 0) {
          console.error("Failed to create user record");
          return reply.code(500).send({
            success: false,
            message: "Failed to create user record",
          });
        }

        userData = newUserRows[0];
      }

      // Check if user is admin
      if (userData.role !== "admin") {
        return reply.code(403).send({
          success: false,
          message: "Access denied. Admin role required.",
        });
      }

      // Get analytics data
      const { rows: agentsRows } = await pgClient.query(
        "SELECT COUNT(*) as count FROM agents"
      );
      const totalAgents = parseInt(agentsRows[0].count);
      let agentsError = null;
      // No error handling needed for simple count

      return reply.code(200).send({
        success: true,
        user: userData,
        analytics: {
          total_agents: totalAgents || 0,
          total_messages: 0, // Placeholder for now
        },
      });
    } catch (err) {
      console.error("Get admin info error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message,
      });
    }
  });
}