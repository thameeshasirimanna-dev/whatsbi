import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { generateJWT } from '../../utils/helpers.js';

export default async function loginRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      if (!email || !password) {
        return reply.code(400).send({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user by email
      const { rows } = await pgClient.query(
        'SELECT id, email, password_hash, role, name FROM users WHERE email = $1',
        [email]
      );

      if (rows.length === 0) {
        return reply.code(401).send({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const user = rows[0];

      // Check if user has a password hash (for non-Supabase users)
      if (!user.password_hash) {
        return reply.code(401).send({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return reply.code(401).send({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user role is valid (admin or agent)
      if (user.role !== 'admin' && user.role !== 'agent') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Valid role required.'
        });
      }

      // Generate JWT token
      const token = generateJWT(user.id);

      return reply.code(200).send({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      });

    } catch (err) {
      console.error("Login error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}