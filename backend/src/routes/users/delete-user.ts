import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function deleteUserRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.delete('/delete-user/:id', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      const { id } = request.params as any;

      // Check if user is admin
      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      // Prevent deleting self
      if (authenticatedUser.id === id) {
        return reply.code(400).send({
          success: false,
          message: 'Cannot delete your own account.'
        });
      }

      // Check if user exists
      const { rows: existingUserRows } = await pgClient.query(
        'SELECT id, role FROM users WHERE id = $1',
        [id]
      );

      if (existingUserRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User not found.'
        });
      }

      const existingUser = existingUserRows[0];

      // Prevent deleting other admins
      if (existingUser.role === 'admin') {
        return reply.code(400).send({
          success: false,
          message: 'Cannot delete admin users.'
        });
      }

      // Delete from users table (cascades agents, config, etc.)
      const { rowCount: userDeleted } = await pgClient.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );

      if (userDeleted === 0) {
        return reply.code(500).send({
          success: false,
          message: 'Failed to delete user from database.'
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (err) {
      console.error("Delete user error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}