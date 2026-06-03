import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function getUsersRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.get('/get-users', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Check if user is admin
      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      // Fetch users data
      const { rows: usersRows } = await pgClient.query(
        'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
      );

      const users = usersRows.map((user: any) => ({
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        created_at: user.created_at || new Date().toISOString(),
        is_email_verified: true
      }));

      return reply.code(200).send({
        success: true,
        users
      });

    } catch (err) {
      console.error("Get users error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}