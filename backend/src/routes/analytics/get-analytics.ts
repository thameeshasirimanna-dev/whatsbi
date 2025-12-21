import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function getAnalyticsRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.get('/get-analytics', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      console.log('=== GET-ANALYTICS FUNCTION START ===');
      console.log('Authenticated User:', authenticatedUser.id);

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

      // Fetch total customers
      const { count: totalCustomers, error: customersError } = await supabaseClient
        .from(`${agentPrefix}_customers`)
        .select('*', { count: 'exact', head: true });

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        return reply.code(500).send({
          success: false,
          message: 'Failed to fetch customer data'
        });
      }

      // Fetch orders data
      const { data: ordersData, error: ordersError } = await supabaseClient
        .from(`${agentPrefix}_orders`)
        .select('id, status, total_amount, created_at');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return reply.code(500).send({
          success: false,
          message: 'Failed to fetch orders data'
        });
      }

      // Calculate order statistics
      const totalOrders = ordersData?.length || 0;
      const pendingOrders = ordersData?.filter(order => order.status === 'pending').length || 0;
      const completedOrders = ordersData?.filter(order => order.status === 'completed').length || 0;
      const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // Calculate monthly orders and revenue (last 12 months)
      const monthlyOrders: { month: string; count: number }[] = [];
      const monthlyRevenue: { month: string; revenue: number }[] = [];

      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });

        const monthOrders = ordersData?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getFullYear() === date.getFullYear() &&
                 orderDate.getMonth() === date.getMonth();
        }) || [];

        monthlyOrders.push({
          month: monthName,
          count: monthOrders.length
        });

        const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        monthlyRevenue.push({
          month: monthName,
          revenue: monthRevenue
        });
      }

      // Calculate order statuses
      const statusCounts: { [key: string]: number } = {};
      ordersData?.forEach(order => {
        const status = order.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const orderStatuses = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));

      // Fetch appointments data
      const { data: appointmentsData, error: appointmentsError } = await supabaseClient
        .from(`${agentPrefix}_appointments`)
        .select('id, appointment_date, status');

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        return reply.code(500).send({
          success: false,
          message: 'Failed to fetch appointments data'
        });
      }

      const totalAppointments = appointmentsData?.length || 0;
      const upcomingAppointments = appointmentsData?.filter(appointment => {
        const appointmentDate = new Date(appointment.appointment_date);
        const now = new Date();
        return appointmentDate > now && appointment.status !== 'cancelled';
      }).length || 0;

      const analytics = {
        totalCustomers: totalCustomers || 0,
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        upcomingAppointments,
        totalAppointments,
        monthlyOrders,
        monthlyRevenue,
        orderStatuses
      };

      return reply.code(200).send({
        success: true,
        analytics
      });

    } catch (err) {
      console.error("Get analytics error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}