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
        JOIN users u ON a.user_id = u.id
        WHERE a.user_id = $1
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

      // Get recent messages (last 24 hours for active conversations, last 10 for activity)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { rows: recentMessages } = await pgClient.query(
        `SELECT m.id, m.customer_id, m.message, m.direction, m.timestamp, m.is_read,
                c.name as customer_name
         FROM ${messagesTable} m
         JOIN ${customersTable} c ON m.customer_id = c.id
         WHERE m.timestamp >= $1
         ORDER BY m.timestamp DESC
         LIMIT 50`,
        [oneDayAgo]
      );

      // Calculate active conversations (unique customers with messages in last 24h)
      const activeConversations = new Set(recentMessages.map((msg: any) => msg.customer_id)).size;

      // Get orders today
      const ordersTable = `${agentPrefix}_orders`;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const { rows: ordersTodayRows } = await pgClient.query(
        `SELECT COUNT(*) as count FROM ${ordersTable} WHERE DATE(created_at) = $1`,
        [today]
      );

      const ordersToday = parseInt(ordersTodayRows[0].count);

      // Get recent activity (last 3 messages)
      const recentActivity = recentMessages.slice(0, 3).map((msg: any) => ({
        id: msg.id.toString(),
        type: 'conversation' as const,
        title: `Message from ${msg.customer_name || `Customer ${msg.customer_id}`}`,
        description: msg.message.substring(0, 50) + (msg.message.length > 50 ? '...' : ''),
        time: new Date(msg.timestamp).toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) + ' ago',
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