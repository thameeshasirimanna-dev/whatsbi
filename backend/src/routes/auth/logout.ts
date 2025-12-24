import { FastifyInstance } from 'fastify';

export default async function logoutRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.post('/logout', async (request, reply) => {
    // For stateless JWT, logout is handled on the client side by removing the token
    // We can optionally implement token blacklisting here if needed
    return reply.code(200).send({
      success: true,
      message: 'Logged out successfully'
    });
  });
}