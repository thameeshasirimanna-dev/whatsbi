import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';

export default async function manageCustomersRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.all('/manage-customers', async (request, reply) => {
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

          console.log('Customers fetch params:', { search, limit, offset, agentPrefix });

          // Query the customers table directly
          let query = supabaseClient
            .from(`${agentPrefix}_customers`)
            .select('*')
            .order('created_at', { ascending: false });

          if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
          }

          if (limit > 0) {
            query = query.limit(limit);
          }

          if (offset > 0) {
            query = query.offset(offset);
          }

          const { data: customers, error: getError } = await query;

          if (getError) {
            console.error('Get customers error:', getError);
            return reply.code(500).send({ success: false, message: getError.message });
          }

          return reply.code(200).send({
            success: true,
            customers: customers || []
          });
        }

        case 'POST': {
          const body = parsedBody;
          const { name, phone, email, address, lead_stage, language, ai_enabled } = body || {};

          // Validate required fields
          if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return reply.code(400).send({ success: false, message: 'Customer name is required' });
          }

          if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
            return reply.code(400).send({ success: false, message: 'Customer phone is required' });
          }

          // Validate lead_stage if provided
          const validStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
          if (lead_stage && !validStages.includes(lead_stage)) {
            return reply.code(400).send({ success: false, message: 'Invalid lead stage' });
          }

          // Validate language if provided
          const validLanguages = ['en', 'si', 'ta'];
          if (language && !validLanguages.includes(language)) {
            return reply.code(400).send({ success: false, message: 'Invalid language' });
          }

          const customerData = {
            name: name.trim(),
            phone: phone.trim(),
            email: email ? email.trim() : null,
            address: address ? address.trim() : null,
            lead_stage: lead_stage || 'new',
            language: language || 'en',
            ai_enabled: ai_enabled !== undefined ? ai_enabled : true,
            last_user_message_time: new Date().toISOString()
          };

          const { data: customer, error: createError } = await supabaseClient
            .from(`${agentPrefix}_customers`)
            .insert(customerData)
            .select()
            .single();

          if (createError) {
            console.error('Create customer error:', createError);
            return reply.code(500).send({ success: false, message: createError.message });
          }

          return reply.code(201).send({
            success: true,
            message: 'Customer created successfully',
            customer
          });
        }

        case 'PUT': {
          const body = parsedBody;
          const { id, name, phone, email, address, lead_stage, language, ai_enabled } = body || {};

          if (!id || typeof id !== 'number') {
            return reply.code(400).send({ success: false, message: 'Customer ID is required' });
          }

          // Validate lead_stage if provided
          const validStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
          if (lead_stage && !validStages.includes(lead_stage)) {
            return reply.code(400).send({ success: false, message: 'Invalid lead stage' });
          }

          // Validate language if provided
          const validLanguages = ['en', 'si', 'ta'];
          if (language && !validLanguages.includes(language)) {
            return reply.code(400).send({ success: false, message: 'Invalid language' });
          }

          const updateData: any = {};
          if (name !== undefined) updateData.name = name.trim();
          if (phone !== undefined) updateData.phone = phone.trim();
          if (email !== undefined) updateData.email = email ? email.trim() : null;
          if (address !== undefined) updateData.address = address ? address.trim() : null;
          if (lead_stage !== undefined) updateData.lead_stage = lead_stage;
          if (language !== undefined) updateData.language = language;
          if (ai_enabled !== undefined) updateData.ai_enabled = ai_enabled;

          const { data: customer, error: updateError } = await supabaseClient
            .from(`${agentPrefix}_customers`)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (updateError) {
            console.error('Update customer error:', updateError);
            return reply.code(500).send({ success: false, message: updateError.message });
          }

          if (!customer) {
            return reply.code(404).send({ success: false, message: 'Customer not found' });
          }

          return reply.code(200).send({
            success: true,
            message: 'Customer updated successfully',
            customer
          });
        }

        case 'DELETE': {
          const id = url.searchParams.get('id');

          if (!id || typeof id !== 'string' || !id.match(/^\d+$/)) {
            return reply.code(400).send({ success: false, message: 'Valid customer ID is required' });
          }

          const customerId = parseInt(id);

          const { data: customer, error: deleteError } = await supabaseClient
            .from(`${agentPrefix}_customers`)
            .delete()
            .eq('id', customerId)
            .select()
            .single();

          if (deleteError) {
            console.error('Delete customer error:', deleteError);
            return reply.code(500).send({ success: false, message: deleteError.message });
          }

          if (!customer) {
            return reply.code(404).send({ success: false, message: 'Customer not found' });
          }

          return reply.code(200).send({
            success: true,
            message: 'Customer deleted successfully'
          });
        }

        default: {
          return reply.code(405).send({ success: false, message: 'Method not allowed' });
        }
      }
    } catch (error) {
      console.error('Customer management error:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}