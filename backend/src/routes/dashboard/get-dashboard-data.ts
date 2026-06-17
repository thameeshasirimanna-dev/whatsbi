import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function getDashboardDataRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.get("/get-dashboard-data", async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent
      const agentQuery = `
        SELECT a.id, a.agent_prefix, u.name
        FROM agents a
        JOIN users u ON u.id = $1
        WHERE a.user_id = $1 OR a.id = (SELECT agent_id FROM users WHERE id = $1)
      `;
      const { rows: agentRows } = await pgClient.query(agentQuery, [authenticatedUser.id]);

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

      // Fetch recent messages for active conversations and activity
      const messagesTable = `${agentPrefix}_messages`;
      const customersTable = `${agentPrefix}_customers`;
 
      // Get active conversations (unique customers with messages in last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { rows: activeConvRows } = await pgClient.query(
        `SELECT COUNT(DISTINCT customer_id)::integer as count 
         FROM ${messagesTable} 
         WHERE timestamp >= $1`,
        [oneDayAgo]
      );
      const activeConversations = activeConvRows[0].count;
 
      // Get orders today
      const ordersTable = `${agentPrefix}_orders`;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
 
      const { rows: ordersTodayRows } = await pgClient.query(
        `SELECT COUNT(*) as count FROM ${ordersTable} WHERE DATE(created_at) = $1`,
        [today]
      );
 
      const ordersToday = parseInt(ordersTodayRows[0].count);
 
      // Get recent activity (last 3 messages overall)
      const { rows: recentActivityRows } = await pgClient.query(
        `SELECT m.id, m.customer_id, m.message, m.direction, m.timestamp, m.is_read,
                c.name as customer_name
         FROM ${messagesTable} m
         JOIN ${customersTable} c ON m.customer_id = c.id
         ORDER BY m.timestamp DESC
         LIMIT 3`
      );

      const recentActivity = recentActivityRows.map((msg: any) => ({
        id: msg.id.toString(),
        type: 'conversation' as const,
        title: `Message from ${msg.customer_name || `Customer ${msg.customer_id}`}`,
        description: msg.message ? (msg.message.substring(0, 50) + (msg.message.length > 50 ? '...' : '')) : '[Media]',
        time: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
        status: msg.is_read ? 'completed' : 'new'
      }));

      const dashboardData = {
        agent: {
          name: agent.name || "Agent"
        },
        metrics: {
          activeConversations,
          totalCustomers,
          ordersToday,
          avgResponseTime: "2.3 min" // This could be calculated from data
        },
        recentActivity
      };

      return reply.code(200).send({
        success: true,
        data: dashboardData,
      });
    } catch (err) {
      console.error("Get dashboard data error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message,
      });
    }
  });
}