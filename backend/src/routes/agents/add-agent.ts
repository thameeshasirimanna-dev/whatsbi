import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { verifyJWT } from '../../utils/helpers.js';

export default async function addAgentRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.post('/add-agent', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Check if user is admin
      if (authenticatedUser.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }

      const body = request.body as any;

      const {
        agent_name,
        email,
        temp_password,
        business_type,
        whatsapp_number,
        webhook_url,
        api_key,
        business_account_id,
        phone_number_id,
        createdBy
      } = body;

      // Validate required agent fields only
      if (!agent_name || !email || !temp_password) {
        return reply.code(400).send({
          success: false,
          message: "agent_name, email, and temp_password are required"
        });
      }

      // Validate business_type
      if (!business_type || !['product', 'service'].includes(business_type)) {
        return reply.code(400).send({
          success: false,
          message: "business_type must be 'product' or 'service'"
        });
      }

      // 1️⃣ Check if user already exists
      const { rows: existingUsers } = await pgClient.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUsers.length > 0) {
        return reply.code(400).send({
          success: false,
          message: "User with this email already exists"
        });
      }

      // Hash the password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(temp_password, saltRounds);

      // Generate UUID for user
      const { rows: uuidRows } = await pgClient.query('SELECT gen_random_uuid() as id');
      const authUserId = uuidRows[0].id;

      // 2️⃣ Insert into users table
      const { rows: userRows, rowCount: userInserted } = await pgClient.query(
        'INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [authUserId, agent_name, email, 'agent', passwordHash]
      );

      if (userInserted === 0) {
        return reply.code(400).send({
          success: false,
          message: "Failed to create user record"
        });
      }

      const user = userRows[0];

      // 3️⃣ Insert into agents table
      const agentPrefix = "agt_" + authUserId.slice(0, 4);
      const { rows: agentRows, rowCount: agentInserted } = await pgClient.query(
        'INSERT INTO agents (user_id, agent_prefix, business_type, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [authUserId, agentPrefix, business_type, createdBy || authenticatedUser.id]
      );

      if (agentInserted === 0) {
        // Rollback user
        await pgClient.query('DELETE FROM users WHERE id = $1', [authUserId]);
        return reply.code(400).send({
          success: false,
          message: "Failed to create agent record"
        });
      }

      const agentData = agentRows[0];

      // Update owner user's agent_id to point to the new agent
      await pgClient.query(
        'UPDATE users SET agent_id = $1 WHERE id = $2',
        [agentData.id, authUserId]
      );

      let whatsappConfig: any = null;

      // 4️⃣ Optionally create WhatsApp configuration if provided
      if (whatsapp_number && webhook_url) {
        try {
          const { rows: configRows, rowCount: configInserted } = await pgClient.query(
            `INSERT INTO whatsapp_configuration (user_id, whatsapp_number, webhook_url, api_key, business_account_id, phone_number_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
              authUserId,
              whatsapp_number,
              webhook_url,
              api_key || null,
              business_account_id || null,
              phone_number_id || null
            ]
          );

          if (configInserted > 0) {
            whatsappConfig = configRows[0];
          } else {
            whatsappConfig = { warning: "WhatsApp config could not be created. Please set it up separately." };
          }
        } catch (configError: any) {
          console.error('WhatsApp config creation warning (non-fatal):', configError);
          whatsappConfig = { warning: "WhatsApp config could not be created. Please set it up separately." };
        }
      } else {
        whatsappConfig = { info: "WhatsApp configuration not provided. Agent created successfully. Set up WhatsApp integration separately." };
      }

      // 5️⃣ Create agent-specific tables using RPC (Database trigger might run this, but we run it explicitly to be sure)
      const agentPrefixLower = agentPrefix.toLowerCase();
      try {
        await pgClient.query('SELECT create_agent_tables($1, $2)', [
          agentPrefixLower,
          parseInt(agentData.id)
        ]);
      } catch (createTablesError) {
        console.error('Table creation error (non-fatal):', createTablesError);
        // Continue with success since the tables might have been created by database trigger automatically
      }

      // 6️⃣ Return success response
      return reply.code(200).send({
        success: true,
        message: "Agent created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        agent: agentData,
        whatsapp_config: whatsappConfig
      });

    } catch (err) {
      console.error("Add agent error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}