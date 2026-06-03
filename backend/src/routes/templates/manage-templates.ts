import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function manageTemplatesRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.all('/manage-templates', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent
      const { rows: agentRows } = await pgClient.query(
        'SELECT id, agent_prefix FROM agents WHERE user_id = $1',
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          message: 'Agent not found'
        });
      }

      const agent = agentRows[0];
      const agentPrefix = agent.agent_prefix;
      const method = request.method;
      const url = new URL(request.url, `http://${request.headers.host}`);
      let parsedBody = null;

      if (method === 'POST' || method === 'PUT') {
        try {
          parsedBody = request.body as any;
        } catch (e) {
          console.error('JSON parse error:', e);
          return reply.code(400).send({ success: false, message: 'Invalid JSON body' });
        }
      }

      switch (method) {
        case 'GET': {
          const search = url.searchParams.get('search') || undefined;
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const offset = parseInt(url.searchParams.get('offset') || '0');
          const isActive = url.searchParams.get('is_active');

          let sql = `SELECT * FROM ${agentPrefix}_templates WHERE 1=1`;
          const params: any[] = [];

          if (isActive !== null && isActive !== undefined) {
            params.push(isActive === 'true');
            sql += ` AND is_active = $${params.length}`;
          }

          if (search) {
            params.push(`%${search}%`);
            sql += ` AND (name ILIKE $${params.length} OR body::text ILIKE $${params.length})`;
          }

          sql += ` ORDER BY created_at DESC`;

          if (limit > 0) {
            params.push(limit);
            sql += ` LIMIT $${params.length}`;
          }

          if (offset > 0) {
            params.push(offset);
            sql += ` OFFSET $${params.length}`;
          }

          const { rows: templates } = await pgClient.query(sql, params);

          return reply.code(200).send({
            success: true,
            templates: templates || []
          });
        }

        case 'POST': {
          const body = parsedBody;
          const { name, body: templateBody, is_active } = body || {};

          // Validate required fields
          if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return reply.code(400).send({ success: false, message: 'Template name is required' });
          }

          if (!templateBody || typeof templateBody !== 'object') {
            return reply.code(400).send({ success: false, message: 'Template body is required' });
          }

          const { rows: templateRows } = await pgClient.query(
            `INSERT INTO ${agentPrefix}_templates (agent_id, name, body, is_active, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
            [
              agent.id,
              name.trim(),
              JSON.stringify(templateBody),
              is_active !== undefined ? is_active : true
            ]
          );

          return reply.code(201).send({
            success: true,
            message: 'Template created successfully',
            template: templateRows[0]
          });
        }

        case 'PUT': {
          const body = parsedBody;
          const { id, name, body: templateBody, is_active } = body || {};

          if (!id || typeof id !== 'number') {
            return reply.code(400).send({ success: false, message: 'Template ID is required' });
          }

          const updateData: any = {
            updated_at: new Date()
          };

          if (name !== undefined) updateData.name = name ? name.trim() : null;
          if (templateBody !== undefined) updateData.body = templateBody;
          if (is_active !== undefined) updateData.is_active = is_active;

          const setClauses: string[] = [];
          const queryParams: any[] = [];
          Object.keys(updateData).forEach((key) => {
            const val = updateData[key];
            queryParams.push(key === 'body' && typeof val === 'object' ? JSON.stringify(val) : val);
            setClauses.push(`${key} = $${queryParams.length}`);
          });

          queryParams.push(id);
          const { rows: templateRows } = await pgClient.query(
            `UPDATE ${agentPrefix}_templates SET ${setClauses.join(', ')} WHERE id = $${queryParams.length} RETURNING *`,
            queryParams
          );

          if (templateRows.length === 0) {
            return reply.code(404).send({ success: false, message: 'Template not found' });
          }

          return reply.code(200).send({
            success: true,
            message: 'Template updated successfully',
            template: templateRows[0]
          });
        }

        case 'DELETE': {
          const id = url.searchParams.get('id');

          if (!id || typeof id !== 'string' || !id.match(/^\d+$/)) {
            return reply.code(400).send({ success: false, message: 'Valid template ID is required' });
          }

          const templateId = parseInt(id);

          const { rows: templateRows } = await pgClient.query(
            `DELETE FROM ${agentPrefix}_templates WHERE id = $1 RETURNING *`,
            [templateId]
          );

          if (templateRows.length === 0) {
            return reply.code(404).send({ success: false, message: 'Template not found' });
          }

          return reply.code(200).send({
            success: true,
            message: 'Template deleted successfully'
          });
        }

        default: {
          return reply.code(405).send({ success: false, message: 'Method not allowed' });
        }
      }
    } catch (error) {
      console.error('Template management error:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}