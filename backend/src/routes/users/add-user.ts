import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';

export default async function addUserRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post('/add-user', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const body = request.body as any;
      console.log('=== ADD-USER FUNCTION START ===');
      console.log('Method:', request.method);
      console.log('Headers:', request.headers);
      console.log('Authenticated User:', authenticatedUser.id);

      // Check if user is admin
      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

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

      // 1️⃣ Create Auth user
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        user_metadata: {
          name: name,
          role: role
        },
        email_confirm: true
      });

      if (authError || !authUser) {
        return reply.code(400).send({
          success: false,
          message: "Failed to create Auth user: " + authError?.message
        });
      }

      const authUserId = authUser.user.id;

      // Update auth user's display name
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          ...authUser.user.user_metadata,
          name: name
        }
      });

      if (updateError) {
        console.error('Failed to update auth user display name:', updateError);
        // Continue without failing
      }

      // 2️⃣ Insert into users table
      const { data: user, error: userError } = await supabaseClient.from("users").insert({
        id: authUserId,
        name: name,
        email: email,
        role: role
      }).select().single();

      if (userError || !user) {
        // Clean up auth user if users table insert fails
        await supabaseClient.auth.admin.deleteUser(authUserId);
        return reply.code(400).send({
          success: false,
          message: "Failed to create user record: " + userError?.message
        });
      }

      console.log('User created successfully:', user);

      // 3️⃣ Return success response
      return reply.code(200).send({
        success: true,
        message: "User created successfully",
        authUser,
        user
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