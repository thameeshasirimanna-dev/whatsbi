import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function updatePasswordRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.patch('/update-password', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const body = request.body as any;

      // Validate required fields
      if (!body.new_password) {
        return reply.code(400).send({
          success: false,
          message: "new_password is required",
        });
      }

      if (body.new_password.length < 8) {
        return reply.code(400).send({
          success: false,
          message: "Password must be at least 8 characters long",
        });
      }

      // Update password using Supabase Admin API
      const { data, error } = await supabaseClient.auth.admin.updateUserById(
        authenticatedUser.id,
        {
          password: body.new_password,
        }
      );

      if (error) {
        console.error("Password update error:", error);
        return reply.code(400).send({
          success: false,
          message: "Failed to update password: " + error.message,
        });
      }

      return reply.code(200).send({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Update password error:", error);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (error as Error).message
      });
    }
  });
}