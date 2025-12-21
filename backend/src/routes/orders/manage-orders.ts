import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function manageOrdersRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.all('/manage-orders', async (request, reply) => {
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

          console.log('Orders fetch params:', { search, limit, offset, customerId, agentPrefix });

          // Query the orders table with customer information
          let query = supabaseClient
            .from(`${agentPrefix}_orders`)
            .select(`
              *,
              ${agentPrefix}_customers!customer_id (
                id,
                name,
                phone
              )
            `)
            .order('created_at', { ascending: false });

          if (customerId) {
            query = query.eq('customer_id', parseInt(customerId));
          }

          if (search) {
            // Search in customer name or order notes
            query = query.or(`notes.ilike.%${search}%,${agentPrefix}_customers.name.ilike.%${search}%`);
          }

          if (limit > 0) {
            query = query.limit(limit);
          }

          if (offset > 0) {
            query = query.offset(offset);
          }

          const { data: orders, error: getError } = await query;

          if (getError) {
            console.error('Get orders error:', getError);
            return reply.code(500).send({ success: false, message: getError.message });
          }

          return reply.code(200).send({
            success: true,
            orders: orders || []
          });
        }

        case 'POST': {
          const body = parsedBody;
          const { customer_id, notes, shipping_address, items } = body || {};

          // Validate required fields
          if (!customer_id || typeof customer_id !== 'number') {
            return reply.code(400).send({ success: false, message: 'Valid customer ID is required' });
          }

          if (!items || !Array.isArray(items) || items.length === 0) {
            return reply.code(400).send({ success: false, message: 'Order must have at least one item' });
          }

          // Validate items
          for (const item of items) {
            if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
              return reply.code(400).send({ success: false, message: 'Item name is required' });
            }
            if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
              return reply.code(400).send({ success: false, message: 'Valid item quantity is required' });
            }
            if (typeof item.price !== 'number' || item.price < 0) {
              return reply.code(400).send({ success: false, message: 'Valid item price is required' });
            }
          }

          // Calculate total amount
          const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);

          const orderData = {
            customer_id,
            total_amount: totalAmount,
            status: 'pending',
            notes: notes ? notes.trim() : null,
            shipping_address: shipping_address ? shipping_address.trim() : null,
            updated_at: new Date().toISOString()
          };

          // Start transaction by inserting order
          const { data: order, error: orderError } = await supabaseClient
            .from(`${agentPrefix}_orders`)
            .insert(orderData)
            .select()
            .single();

          if (orderError) {
            console.error('Create order error:', orderError);
            return reply.code(500).send({ success: false, message: orderError.message });
          }

          // Insert order items
          const orderItems = items.map((item: any) => ({
            order_id: order.id,
            name: item.name.trim(),
            quantity: item.quantity,
            price: item.price
          }));

          const { data: insertedItems, error: itemsError } = await supabaseClient
            .from(`${agentPrefix}_order_items`)
            .insert(orderItems)
            .select();

          if (itemsError) {
            console.error('Create order items error:', itemsError);
            // Try to delete the order if items insertion failed
            await supabaseClient
              .from(`${agentPrefix}_orders`)
              .delete()
              .eq('id', order.id);
            return reply.code(500).send({ success: false, message: 'Failed to create order items' });
          }

          return reply.code(201).send({
            success: true,
            message: 'Order created successfully',
            order: {
              ...order,
              items: insertedItems
            }
          });
        }

        case 'PUT': {
          const body = parsedBody;
          const { id, status, notes, shipping_address } = body || {};

          if (!id || typeof id !== 'number') {
            return reply.code(400).send({ success: false, message: 'Order ID is required' });
          }

          // Validate status if provided
          const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
          if (status && !validStatuses.includes(status)) {
            return reply.code(400).send({ success: false, message: 'Invalid order status' });
          }

          const updateData: any = {
            updated_at: new Date().toISOString()
          };

          if (status !== undefined) updateData.status = status;
          if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
          if (shipping_address !== undefined) updateData.shipping_address = shipping_address ? shipping_address.trim() : null;

          const { data: order, error: updateError } = await supabaseClient
            .from(`${agentPrefix}_orders`)
            .update(updateData)
            .eq('id', id)
            .select(`
              *,
              ${agentPrefix}_customers!customer_id (
                id,
                name,
                phone
              )
            `)
            .single();

          if (updateError) {
            console.error('Update order error:', updateError);
            return reply.code(500).send({ success: false, message: updateError.message });
          }

          if (!order) {
            return reply.code(404).send({ success: false, message: 'Order not found' });
          }

          return reply.code(200).send({
            success: true,
            message: 'Order updated successfully',
            order
          });
        }

        case 'DELETE': {
          const id = url.searchParams.get('id');

          if (!id || typeof id !== 'string' || !id.match(/^\d+$/)) {
            return reply.code(400).send({ success: false, message: 'Valid order ID is required' });
          }

          const orderId = parseInt(id);

          // Delete order (cascade will delete order items)
          const { data: order, error: deleteError } = await supabaseClient
            .from(`${agentPrefix}_orders`)
            .delete()
            .eq('id', orderId)
            .select()
            .single();

          if (deleteError) {
            console.error('Delete order error:', deleteError);
            return reply.code(500).send({ success: false, message: deleteError.message });
          }

          if (!order) {
            return reply.code(404).send({ success: false, message: 'Order not found' });
          }

          return reply.code(200).send({
            success: true,
            message: 'Order deleted successfully'
          });
        }

        default: {
          return reply.code(405).send({ success: false, message: 'Method not allowed' });
        }
      }
    } catch (error) {
      console.error('Order management error:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}