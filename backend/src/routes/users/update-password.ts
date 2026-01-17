import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { verifyJWT } from '../../utils/helpers.js';

export default async function updatePasswordRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.patch('/update-password', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      const body = request.body as any;

      // Validate required fields
      if (!body.current_password) {
        return reply.code(400).send({
          success: false,
          message: "current_password is required",
        });
      }

      if (!body.new_password) {
        return reply.code(400).send({
          success: false,
          message: "new_password is required",
        });
      }

      if (body.new_password.length < 8) {
        return reply.code(400).send({
          success: false,
          message: "Password must be at least 8 characters long",
        });
      }

      // Get current password hash from database
      const userQuery = await pgClient.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [authenticatedUser.id]
      );

      if (userQuery.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "User not found",
        });
      }

      const currentPasswordHash = userQuery.rows[0].password_hash;

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(body.current_password, currentPasswordHash);
      if (!isCurrentPasswordValid) {
        return reply.code(400).send({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash the new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(body.new_password, saltRounds);

      // Update password hash in database
      const { rowCount } = await pgClient.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, authenticatedUser.id]
      );

      if (rowCount === 0) {
        return reply.code(404).send({
          success: false,
          message: "User not found",
        });
      }

      return reply.code(200).send({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Update password error:", error);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (error as Error).message
      });
    }
  });
}