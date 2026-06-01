import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function updateUserRoutes(fastify: FastifyInstance, pgClient: any) {
  // Admin: POST /update-user — used by AdminDashboard (confirm email, etc.)
  fastify.post('/update-user', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);

      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Access denied. Admin role required.' });
      }

      const body = request.body as any;

      if (!body.user_id) {
        return reply.code(400).send({ success: false, message: 'user_id is required' });
      }

      const updates = body.updates || {};

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (updates.name)           { fields.push(`name = $${idx++}`);           values.push(updates.name); }
      if (updates.email)          { fields.push(`email = $${idx++}`);          values.push(updates.email); }
      if (updates.role)           { fields.push(`role = $${idx++}`);           values.push(updates.role); }
      if (updates.email_verified !== undefined) {
        fields.push(`email_verified = $${idx++}`);
        values.push(updates.email_verified);
      }

      if (fields.length === 0) {
        return reply.code(400).send({ success: false, message: 'No valid fields provided for update' });
      }

      values.push(body.user_id);
      const { rows, rowCount } = await pgClient.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role`,
        values
      );

      if (rowCount === 0) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      return reply.code(200).send({ success: true, message: 'User updated successfully', user: rows[0] });
    } catch (err) {
      console.error('Update user error:', err);
      return reply.code(500).send({ success: false, message: 'Server error: ' + (err as Error).message });
    }
  });

  // Admin: PUT /update-user/:id — legacy form
  fastify.put('/update-user/:id', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);

      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Access denied. Admin role required.' });
      }

      const { id } = request.params as any;
      const body = request.body as any;
      const { name, email, role } = body;

      if (!name && !email && !role) {
        return reply.code(400).send({ success: false, message: 'At least one field (name, email, role) must be provided' });
      }

      if (role && !['admin', 'agent', 'user'].includes(role)) {
        return reply.code(400).send({ success: false, message: "role must be 'admin', 'agent', or 'user'" });
      }

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (name)  { fields.push(`name = $${idx++}`);  values.push(name); }
      if (email) { fields.push(`email = $${idx++}`); values.push(email); }
      if (role)  { fields.push(`role = $${idx++}`);  values.push(role); }

      values.push(id);
      const { rows, rowCount } = await pgClient.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role`,
        values
      );

      if (rowCount === 0) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      return reply.code(200).send({ success: true, message: 'User updated successfully', user: rows[0] });
    } catch (err) {
      console.error('Update user error:', err);
      return reply.code(500).send({ success: false, message: 'Server error: ' + (err as Error).message });
    }
  });
}
