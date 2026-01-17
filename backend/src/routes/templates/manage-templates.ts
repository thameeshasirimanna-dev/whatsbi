import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function manageTemplatesRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.all('/manage-templates', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      // Get agent
      const { data: agent, error: agentError } = await supabaseClient
        .from('agents')
        .select('id, agent_prefix')
        .eq('user_id', authenticatedUser.id)
        .single();

      if (agentError || !agent) {
        return reply.code(403).send({
          success: false,
          message: 'Agent not found'
        });
      }

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

          console.log('Templates fetch params:', { search, limit, offset, isActive, agentPrefix });

          // Query the templates table
          let query = supabaseClient
            .from(`${agentPrefix}_templates`)
            .select('*')
            .order('created_at', { ascending: false });

          if (isActive !== null) {
            query = query.eq('is_active', isActive === 'true');
          }

          if (search) {
            query = query.or(`name.ilike.%${search}%,body->>text.ilike.%${search}%`);
          }

          if (limit > 0) {
            query = query.limit(limit);
          }

          if (offset > 0) {
            query = query.offset(offset);
          }

          const { data: templates, error: getError } = await query;

          if (getError) {
            console.error('Get templates error:', getError);
            return reply.code(500).send({ success: false, message: getError.message });
          }

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

          const templateData = {
            name: name.trim(),
            body: templateBody,
            is_active: is_active !== undefined ? is_active : true,
            updated_at: new Date().toISOString()
          };

          const { data: template, error: createError } = await supabaseClient
            .from(`${agentPrefix}_templates`)
            .insert(templateData)
            .select()
            .single();

          if (createError) {
            console.error('Create template error:', createError);
            return reply.code(500).send({ success: false, message: createError.message });
          }

          return reply.code(201).send({
            success: true,
            message: 'Template created successfully',
            template
          });
        }

        case 'PUT': {
          const body = parsedBody;
          const { id, name, body: templateBody, is_active } = body || {};

          if (!id || typeof id !== 'number') {
            return reply.code(400).send({ success: false, message: 'Template ID is required' });
          }

          const updateData: any = {
            updated_at: new Date().toISOString()
          };

          if (name !== undefined) updateData.name = name ? name.trim() : null;
          if (templateBody !== undefined) updateData.body = templateBody;
          if (is_active !== undefined) updateData.is_active = is_active;

          const { data: template, error: updateError } = await supabaseClient
            .from(`${agentPrefix}_templates`)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (updateError) {
            console.error('Update template error:', updateError);
            return reply.code(500).send({ success: false, message: updateError.message });
          }

          if (!template) {
            return reply.code(404).send({ success: false, message: 'Template not found' });
          }

          return reply.code(200).send({
            success: true,
            message: 'Template updated successfully',
            template
          });
        }

        case 'DELETE': {
          const id = url.searchParams.get('id');

          if (!id || typeof id !== 'string' || !id.match(/^\d+$/)) {
            return reply.code(400).send({ success: false, message: 'Valid template ID is required' });
          }

          const templateId = parseInt(id);

          const { data: template, error: deleteError } = await supabaseClient
            .from(`${agentPrefix}_templates`)
            .delete()
            .eq('id', templateId)
            .select()
            .single();

          if (deleteError) {
            console.error('Delete template error:', deleteError);
            return reply.code(500).send({ success: false, message: deleteError.message });
          }

          if (!template) {
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