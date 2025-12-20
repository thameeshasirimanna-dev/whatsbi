import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';

export default async function deleteUserRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.delete('/delete-user/:id', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const { id } = request.params as any;
      console.log('=== DELETE-USER FUNCTION START ===');
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

      // Prevent deleting self
      if (authenticatedUser.id === id) {
        return reply.code(400).send({
          success: false,
          message: 'Cannot delete your own account.'
        });
      }

      // Check if user exists
      const { data: existingUser, error: checkError } = await supabaseClient
        .from('users')
        .select('id, role')
        .eq('id', id)
        .single();

      if (checkError || !existingUser) {
        return reply.code(404).send({
          success: false,
          message: 'User not found.'
        });
      }

      // Prevent deleting other admins
      if (existingUser.role === 'admin') {
        return reply.code(400).send({
          success: false,
          message: 'Cannot delete admin users.'
        });
      }

      // Delete from users table first
      const { error: userError } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', id);

      if (userError) {
        return reply.code(500).send({
          success: false,
          message: 'Failed to delete user from database: ' + userError.message
        });
      }

      // Delete from auth
      const { error: authError } = await supabaseClient.auth.admin.deleteUser(id);

      if (authError) {
        console.error('Failed to delete auth user:', authError);
        // Continue since user record is already deleted
      }

      console.log('User deleted successfully:', id);

      // Return success response
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