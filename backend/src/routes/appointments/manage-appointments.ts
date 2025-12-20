import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function manageAppointmentsRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.all('/manage-appointments', async (request, reply) => {
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
          const customerId = url.searchParams.get('customer_id');
          const status = url.searchParams.get('status');

          console.log('Appointments fetch params:', { search, limit, offset, customerId, status, agentPrefix });

          // Query the appointments table with customer information
          let query = supabaseClient
            .from(`${agentPrefix}_appointments`)
            .select(`
              *,
              customers (
                id,
                name,
                phone
              )
            `)
            .order('appointment_date', { ascending: true });

          if (customerId) {
            query = query.eq('customer_id', parseInt(customerId));
          }

          if (status) {
            query = query.eq('status', status);
          }

          if (search) {
            // Search in title, notes, or customer name/phone
            query = query.or(`title.ilike.%${search}%,notes.ilike.%${search}%,customers.name.ilike.%${search}%,customers.phone.ilike.%${search}%`);
          }

          if (limit > 0) {
            query = query.limit(limit);
          }

          if (offset > 0) {
            query = query.offset(offset);
          }

          const { data: appointments, error: getError } = await query;

          if (getError) {
            console.error('Get appointments error:', getError);
            return reply.code(500).send({ success: false, message: getError.message });
          }

          return reply.code(200).send({
            success: true,
            appointments: appointments || []
          });
        }

        case 'POST': {
          const body = parsedBody;
          const { customer_id, title, appointment_date, duration_minutes, notes } = body || {};

          // Validate required fields
          if (!customer_id || typeof customer_id !== 'number') {
            return reply.code(400).send({ success: false, message: 'Valid customer ID is required' });
          }

          if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return reply.code(400).send({ success: false, message: 'Appointment title is required' });
          }

          if (!appointment_date) {
            return reply.code(400).send({ success: false, message: 'Appointment date is required' });
          }

          // Validate appointment date is in the future
          const appointmentDate = new Date(appointment_date);
          if (isNaN(appointmentDate.getTime()) || appointmentDate <= new Date()) {
            return reply.code(400).send({ success: false, message: 'Appointment date must be in the future' });
          }

          const appointmentData = {
            customer_id,
            title: title.trim(),
            appointment_date: appointment_date,
            duration_minutes: duration_minutes || 60,
            status: 'scheduled',
            notes: notes ? notes.trim() : null,
            updated_at: new Date().toISOString()
          };

          const { data: appointment, error: createError } = await supabaseClient
            .from(`${agentPrefix}_appointments`)
            .insert(appointmentData)
            .select(`
              *,
              customers (
                id,
                name,
                phone
              )
            `)
            .single();

          if (createError) {
            console.error('Create appointment error:', createError);
            return reply.code(500).send({ success: false, message: createError.message });
          }

          return reply.code(201).send({
            success: true,
            message: 'Appointment created successfully',
            appointment
          });
        }

        case 'PUT': {
          const body = parsedBody;
          const { id, title, appointment_date, duration_minutes, status, notes } = body || {};

          if (!id || typeof id !== 'number') {
            return reply.code(400).send({ success: false, message: 'Appointment ID is required' });
          }

          // Validate status if provided
          const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
          if (status && !validStatuses.includes(status)) {
            return reply.code(400).send({ success: false, message: 'Invalid appointment status' });
          }

          // Validate appointment date if provided
          if (appointment_date) {
            const appointmentDate = new Date(appointment_date);
            if (isNaN(appointmentDate.getTime())) {
              return reply.code(400).send({ success: false, message: 'Invalid appointment date' });
            }
          }

          const updateData: any = {
            updated_at: new Date().toISOString()
          };

          if (title !== undefined) updateData.title = title ? title.trim() : null;
          if (appointment_date !== undefined) updateData.appointment_date = appointment_date;
          if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
          if (status !== undefined) updateData.status = status;
          if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;

          const { data: appointment, error: updateError } = await supabaseClient
            .from(`${agentPrefix}_appointments`)
            .update(updateData)
            .eq('id', id)
            .select(`
              *,
              customers (
                id,
                name,
                phone
              )
            `)
            .single();

          if (updateError) {
            console.error('Update appointment error:', updateError);
            return reply.code(500).send({ success: false, message: updateError.message });
          }

          if (!appointment) {
            return reply.code(404).send({ success: false, message: 'Appointment not found' });
          }

          return reply.code(200).send({
            success: true,
            message: 'Appointment updated successfully',
            appointment
          });
        }

        case 'DELETE': {
          const id = url.searchParams.get('id');

          if (!id || typeof id !== 'string' || !id.match(/^\d+$/)) {
            return reply.code(400).send({ success: false, message: 'Valid appointment ID is required' });
          }

          const appointmentId = parseInt(id);

          const { data: appointment, error: deleteError } = await supabaseClient
            .from(`${agentPrefix}_appointments`)
            .delete()
            .eq('id', appointmentId)
            .select()
            .single();

          if (deleteError) {
            console.error('Delete appointment error:', deleteError);
            return reply.code(500).send({ success: false, message: deleteError.message });
          }

          if (!appointment) {
            return reply.code(404).send({ success: false, message: 'Appointment not found' });
          }

          return reply.code(200).send({
            success: true,
            message: 'Appointment deleted successfully'
          });
        }

        default: {
          return reply.code(405).send({ success: false, message: 'Method not allowed' });
        }
      }
    } catch (error) {
      console.error('Appointment management error:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}