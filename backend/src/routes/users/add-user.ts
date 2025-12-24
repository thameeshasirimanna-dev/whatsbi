import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { verifyJWT } from '../../utils/helpers';

export default async function addUserRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.post('/add-user', async (request, reply) => {
    try {
      const body = request.body as any;
      console.log('=== ADD-USER FUNCTION START ===');
      console.log('Method:', request.method);
      console.log('Headers:', request.headers);

      const {
        name,
        email,
        password,
        role
      } = body;

      // Validate required fields
      if (!name || !email || !password) {
        return reply.code(400).send({
          success: false,
          message: "name, email, and password are required"
        });
      }

      // Validate role
      if (!role || !['admin', 'agent', 'user'].includes(role)) {
        return reply.code(400).send({
          success: false,
          message: "role must be 'admin', 'agent', or 'user'"
        });
      }

      // Check if user already exists
      const { rows: existingUsers } = await pgClient.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUsers.length > 0) {
        return reply.code(400).send({
          success: false,
          message: "User with this email already exists"
        });
      }

      // Check if trying to create first admin (no existing admins)
      let isFirstAdmin = false;
      if (role === 'admin') {
        const { rows: adminRows } = await pgClient.query(
          'SELECT COUNT(*) as count FROM users WHERE role = $1',
          ['admin']
        );
        isFirstAdmin = parseInt(adminRows[0].count) === 0;
      }

      // If not creating first admin, verify JWT and check admin role
      if (!isFirstAdmin) {
        // Verify JWT and get authenticated user
        const authenticatedUser = await verifyJWT(request, pgClient);
        console.log('Authenticated User:', authenticatedUser.id);

        // Get user role from database
        const { rows: userRows } = await pgClient.query(
          'SELECT role FROM users WHERE id = $1',
          [authenticatedUser.id]
        );

        if (userRows.length === 0 || userRows[0].role !== 'admin') {
          return reply.code(403).send({
            success: false,
            message: 'Access denied. Admin role required.'
          });
        }
      }

      // Hash the password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate UUID for user
      const { rows: uuidRows } = await pgClient.query('SELECT gen_random_uuid() as id');
      const userId = uuidRows[0].id;

      // Insert into users table
      const { rows: userRows, rowCount } = await pgClient.query(
        'INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, name, email, role, passwordHash]
      );

      if (rowCount === 0) {
        return reply.code(400).send({
          success: false,
          message: "Failed to create user record"
        });
      }

      const user = userRows[0];
      console.log('User created successfully:', user);

      // Return success response
      return reply.code(200).send({
        success: true,
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (err) {
      console.error("Add user error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}