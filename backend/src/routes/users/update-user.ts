import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function updateUserRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.put('/update-user/:id', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const { id } = request.params as any;
      const body = request.body as any;
      console.log('=== UPDATE-USER FUNCTION START ===');
      console.log('Method:', request.method);
      console.log('Headers:', request.headers);
      console.log('Authenticated User:', authenticatedUser.id);
      console.log('Target User ID:', id);

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
        role
      } = body;

      // Validate that at least one field is provided
      if (!name && !email && !role) {
        return reply.code(400).send({
          success: false,
          message: "At least one field (name, email, or role) must be provided for update"
        });
      }

      // Validate role if provided
      if (role && !['admin', 'agent', 'user'].includes(role)) {
        return reply.code(400).send({
          success: false,
          message: "role must be 'admin', 'agent', or 'user'"
        });
      }

      // Prepare update data
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;

      // Update users table
      const { data: user, error: userError } = await supabaseClient
        .from("users")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (userError || !user) {
        return reply.code(400).send({
          success: false,
          message: "Failed to update user: " + userError?.message
        });
      }

      // Update auth user metadata if name or email changed
      if (name || email) {
        const authUpdateData: any = {};
        if (name) {
          authUpdateData.user_metadata = { name: name };
        }
        if (email) {
          authUpdateData.email = email;
        }

        const { error: authError } = await supabaseClient.auth.admin.updateUserById(id, authUpdateData);

        if (authError) {
          console.error('Failed to update auth user:', authError);
          // Continue without failing the entire operation
        }
      }

      console.log('User updated successfully:', user);

      // Return success response
      return reply.code(200).send({
        success: true,
        message: "User updated successfully",
        user
      });

    } catch (err) {
      console.error("Update user error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}