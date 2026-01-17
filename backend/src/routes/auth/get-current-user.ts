import { FastifyInstance } from "fastify";
import { verifyJWT } from "../../utils/helpers.js";

export default async function getCurrentUserRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.get("/get-current-user", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get additional user details
      const { rows } = await pgClient.query(
        "SELECT id, email, name, role FROM users WHERE id = $1",
        [authenticatedUser.id]
      );

      if (rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "User not found",
        });
      }

      const user = rows[0];

      return reply.code(200).send({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("Get current user error:", err);
      return reply.code(401).send({
        success: false,
        message: "Invalid or expired token",
      });
    }
  });
}
