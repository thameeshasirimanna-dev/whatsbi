import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function getAnalyticsRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.get("/get-analytics", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE user_id = $1",
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          message: "Agent not found",
        });
      }

      const agent = agentRows[0];
      const agentPrefix = agent.agent_prefix;

      // Fetch total customers
      const { rows: customerCountRows } = await pgClient.query(
        `SELECT COUNT(*) as count FROM ${agentPrefix}_customers`
      );

      const totalCustomers = parseInt(customerCountRows[0].count);

      // Fetch orders data
      const { rows: ordersData } = await pgClient.query(
        `SELECT id, status, total_amount, created_at FROM ${agentPrefix}_orders`
      );

      // Calculate order statistics
      const totalOrders = ordersData?.length || 0;
      const pendingOrders =
        ordersData?.filter((order) => order.status === "pending").length || 0;
      const completedOrders =
        ordersData?.filter((order) => order.status === "completed").length || 0;
      const totalRevenue =
        ordersData?.reduce(
          (sum, order) => sum + (order.total_amount || 0),
          0
        ) || 0;

      // Calculate monthly orders and revenue (last 12 months)
      const monthlyOrders: { month: string; count: number }[] = [];
      const monthlyRevenue: { month: string; revenue: number }[] = [];

      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        const monthName = date.toLocaleDateString("en-US", { month: "short" });

        const monthOrders =
          ordersData?.filter((order) => {
            const orderDate = new Date(order.created_at);
            return (
              orderDate.getFullYear() === date.getFullYear() &&
              orderDate.getMonth() === date.getMonth()
            );
          }) || [];

        monthlyOrders.push({
          month: monthName,
          count: monthOrders.length,
        });

        const monthRevenue = monthOrders.reduce(
          (sum, order) => sum + (order.total_amount || 0),
          0
        );
        monthlyRevenue.push({
          month: monthName,
          revenue: monthRevenue,
        });
      }

      // Calculate order statuses
      const statusCounts: { [key: string]: number } = {};
      ordersData?.forEach((order) => {
        const status = order.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const orderStatuses = Object.entries(statusCounts).map(
        ([status, count]) => ({
          status,
          count,
        })
      );

      // Fetch appointments data
      const { rows: appointmentsData } = await pgClient.query(
        `SELECT id, appointment_date, status FROM ${agentPrefix}_appointments`
      );

      const totalAppointments = appointmentsData?.length || 0;
      const upcomingAppointments =
        appointmentsData?.filter((appointment) => {
          const appointmentDate = new Date(appointment.appointment_date);
          const now = new Date();
          return appointmentDate > now && appointment.status !== "cancelled";
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
        orderStatuses,
      };

      return reply.code(200).send({
        success: true,
        analytics,
      });
    } catch (err) {
      console.error("Get analytics error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message,
      });
    }
  });
}