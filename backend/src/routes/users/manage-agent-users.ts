import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { verifyJWT } from '../../utils/helpers.js';

export default async function manageAgentUsersRoutes(fastify: FastifyInstance, pgClient: any) {
  // GET /agent/get-users - Get list of users belonging to the agent
  fastify.get('/agent/get-users', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Find the agent associated with this user
      const agentQuery = `
        SELECT id, user_id FROM agents
        WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)
      `;
      const agentResult = await pgClient.query(agentQuery, [authenticatedUser.id]);
      if (agentResult.rows.length === 0) {
        return reply.code(404).send({ success: false, message: "Agent not found" });
      }
      const agent = agentResult.rows[0];

      // Fetch users belonging to the agent
      const usersQuery = `
        SELECT id, name, email, role, created_at
        FROM users
        WHERE agent_id = $1
        ORDER BY created_at DESC
      `;
      const { rows: usersRows } = await pgClient.query(usersQuery, [agent.id]);

      const users = usersRows.map((u: any) => ({
        id: u.id,
        name: u.name || '',
        email: u.email || '',
        role: u.role || 'user',
        created_at: u.created_at || new Date().toISOString(),
        is_owner: u.id === agent.user_id
      }));

      return reply.code(200).send({
        success: true,
        users
      });
    } catch (err) {
      console.error("Get agent users error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });

  // POST /agent/add-user - Add a team member (owner-only)
  fastify.post('/agent/add-user', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);

      const agentQuery = `
        SELECT id, user_id FROM agents
        WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)
      `;
      const agentResult = await pgClient.query(agentQuery, [authenticatedUser.id]);
      if (agentResult.rows.length === 0) {
        return reply.code(404).send({ success: false, message: "Agent not found" });
      }
      const agent = agentResult.rows[0];

      // Only the owner can add users
      if (authenticatedUser.id !== agent.user_id) {
        return reply.code(403).send({
          success: false,
          message: "Access denied. Only the agent owner can manage team members."
        });
      }

      const body = request.body as any;
      const { name, email, password } = body;

      if (!name || !email || !password) {
        return reply.code(400).send({
          success: false,
          message: "name, email, and password are required"
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

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate UUID
      const { rows: uuidRows } = await pgClient.query('SELECT gen_random_uuid() as id');
      const userId = uuidRows[0].id;

      // Insert user
      const { rows: userRows, rowCount } = await pgClient.query(
        'INSERT INTO users (id, name, email, role, password_hash, agent_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, name, email, 'agent', passwordHash, agent.id]
      );

      if (rowCount === 0) {
        return reply.code(400).send({
          success: false,
          message: "Failed to create user record"
        });
      }

      const user = userRows[0];

      return reply.code(200).send({
        success: true,
        message: "Team member added successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error("Add agent user error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });

  // DELETE /agent/delete-user/:id - Delete a team member (owner-only)
  fastify.delete('/agent/delete-user/:id', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);

      const agentQuery = `
        SELECT id, user_id FROM agents
        WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)
      `;
      const agentResult = await pgClient.query(agentQuery, [authenticatedUser.id]);
      if (agentResult.rows.length === 0) {
        return reply.code(404).send({ success: false, message: "Agent not found" });
      }
      const agent = agentResult.rows[0];

      // Only the owner can delete users
      if (authenticatedUser.id !== agent.user_id) {
        return reply.code(403).send({
          success: false,
          message: "Access denied. Only the agent owner can manage team members."
        });
      }

      const { id } = request.params as any;

      // Prevent deleting self (owner)
      if (id === agent.user_id) {
        return reply.code(400).send({
          success: false,
          message: "Cannot delete the agent owner."
        });
      }

      // Check if user exists and belongs to this agent
      const { rows: subUserRows } = await pgClient.query(
        'SELECT id, agent_id FROM users WHERE id = $1',
        [id]
      );
      if (subUserRows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "User not found."
        });
      }

      const subUser = subUserRows[0];
      if (subUser.agent_id !== agent.id) {
        return reply.code(403).send({
          success: false,
          message: "Access denied. User does not belong to this agent."
        });
      }

      // Delete user
      const { rowCount: userDeleted } = await pgClient.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );

      if (userDeleted === 0) {
        return reply.code(500).send({
          success: false,
          message: "Failed to delete user."
        });
      }

      return reply.code(200).send({
        success: true,
        message: "Team member deleted successfully."
      });
    } catch (err) {
      console.error("Delete agent user error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}
