import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function getAdminInfoRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.get('/get-admin-info', async (request, reply) => {
    console.log('=== GET-ADMIN-INFO REQUEST RECEIVED ===');
    try {
      console.log('Starting JWT verification...');
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);
      console.log('JWT verification successful');

      console.log('=== GET-ADMIN-INFO FUNCTION START ===');
      console.log('Authenticated User:', authenticatedUser.id);

      // Get user info including role
      console.log('Fetching user data for ID:', authenticatedUser.id);
      const { rows: userRows } = await pgClient.query(
        'SELECT id, name, email, role FROM users WHERE id = $1',
        [authenticatedUser.id]
      );

      let userData = userRows[0];
      let userError = null;
      if (userRows.length === 0) {
        userError = { message: 'User not found' };
      }

      console.log('User data query result:', { userData, userError });

      if (userError) {
        console.error('User query error details:', {
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
          code: userError.code
        });
      }

      if (userError) {
        console.error('User query error:', userError);
        return reply.code(500).send({
          success: false,
          message: `Failed to fetch user info: ${userError.message}`
        });
      }

      if (!userData) {
        console.error('No user data found for ID:', authenticatedUser.id);
        // Try to create the user record if it doesn't exist
        console.log('Attempting to create user record for authenticated user...');
        const { rows: newUserRows, rowCount } = await pgClient.query(
          'INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4) RETURNING *',
          [
            authenticatedUser.id,
            authenticatedUser.user_metadata?.name || authenticatedUser.email || 'Unknown',
            authenticatedUser.email,
            'admin' // Default to admin for now
          ]
        );

        if (rowCount === 0) {
          console.error('Failed to create user record');
          return reply.code(500).send({
            success: false,
            message: 'Failed to create user record'
          });
        }

        console.log('Created user record:', newUserRows[0]);
        userData = newUserRows[0];
      }

      console.log('User role:', userData.role, 'Type:', typeof userData.role);
      console.log('DEBUG: Actual role value:', JSON.stringify(userData.role));
      console.log('DEBUG: Full userData:', JSON.stringify(userData, null, 2));

      // Check if user is admin
      if (userData.role !== 'admin') {
        console.log('User is not admin, role:', userData.role, 'Expected: admin');
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      // Get analytics data
      const { rows: agentsRows } = await pgClient.query('SELECT COUNT(*) as count FROM agents');
      const totalAgents = parseInt(agentsRows[0].count);
      let agentsError = null;
      // No error handling needed for simple count

      return reply.code(200).send({
        success: true,
        user: userData,
        analytics: {
          total_agents: totalAgents || 0,
          total_messages: 0 // Placeholder for now
        }
      });

    } catch (err) {
      console.error("Get admin info error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}