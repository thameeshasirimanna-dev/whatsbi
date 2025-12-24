import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function getUsersRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.get('/get-users', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      // Check if user is admin
      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      // Fetch users data
      const { data: usersData, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        return reply.code(500).send({
          success: false,
          message: `Failed to fetch users: ${fetchError.message}`
        });
      }

      if (usersData && usersData.length > 0) {
        // Transform data and fetch email verification status for each user
        const usersWithStatus = await Promise.all(
          usersData.map(async (user: any) => {
            const safeUser = {
              id: user.id,
              name: user.name || '',
              email: user.email || '',
              role: user.role || 'user',
              created_at: user.created_at || new Date().toISOString(),
            };

            // Fetch email verification status from auth.users
            let isEmailVerified = false;
            try {
              const { data: authUser } = await supabaseClient.auth.admin.getUserById(user.id);
              isEmailVerified = authUser?.user?.email_confirmed_at !== null;
            } catch (authError) {
              console.warn('Failed to fetch auth user email status:', authError);
              isEmailVerified = false;
            }

            return {
              ...safeUser,
              is_email_verified: isEmailVerified
            };
          })
        );

        return reply.code(200).send({
          success: true,
          users: usersWithStatus
        });
      } else {
        return reply.code(200).send({
          success: true,
          users: []
        });
      }

    } catch (err) {
      console.error("Get users error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}