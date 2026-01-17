import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export default async function addAgentRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post('/add-agent', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const body = request.body as any;
      console.log('=== ADD-AGENT FUNCTION START ===');
      console.log('Method:', request.method);
      console.log('Headers:', request.headers);
      console.log('Authenticated User:', authenticatedUser.id);

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

      // 1️⃣ Create Auth user
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: temp_password,
        user_metadata: {
          agent_name: agent_name,
          role: 'agent'
        },
        email_confirm: true
      });

      if (authError || !authUser) {
        return reply.code(400).send({
          success: false,
          message: "Failed to create Auth user: " + authError?.message
        });
      }

      const authUserId = authUser.user.id;

      // Update auth user's display name to match agent name
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          ...authUser.user.user_metadata,
          name: agent_name
        }
      });

      if (updateError) {
        console.error('Failed to update auth user display name:', updateError);
        // Continue without failing the entire operation
      }

      // 2️⃣ Insert into users table with auth_id
      const { data: user, error: userError } = await supabaseClient.from("users").insert({
        id: authUserId,
        name: agent_name,
        email: email,
        role: "agent"
      }).select().single();

      if (userError || !user) {
        // Clean up auth user if users table insert fails
        await supabaseClient.auth.admin.deleteUser(authUserId);
        return reply.code(400).send({
          success: false,
          message: "Failed to create user record: " + userError?.message
        });
      }

      // 3️⃣ Insert into agents table
      const agentPrefix = "agt_" + authUserId.slice(0, 4);
      const { data: agentData, error: agentError } = await supabaseClient.from("agents").insert({
        user_id: authUserId,
        agent_prefix: agentPrefix,
        business_type: business_type,
        created_by: createdBy  // UUID users table ID from admin
      }).select().single();

      if (agentError || !agentData) {
        console.error('Agent insertion error:', agentError);
        // Clean up
        await supabaseClient.from("users").delete().eq("id", authUserId);
        await supabaseClient.auth.admin.deleteUser(authUserId);
        return reply.code(400).send({
          success: false,
          message: "Failed to create agent record: " + agentError?.message
        });
      }

      let whatsappConfig: any = null;

      // 4️⃣ Optionally create WhatsApp configuration if provided
      if (whatsapp_number && webhook_url) {
        const { data: configData, error: configError } = await supabaseClient.rpc('create_whatsapp_config', {
          p_user_id: authUserId,
          p_whatsapp_number: whatsapp_number,
          p_webhook_url: webhook_url,
          p_api_key: api_key || null,
          p_business_account_id: business_account_id || null,
          p_phone_number_id: phone_number_id || null
        });

        if (configError) {
          console.error('WhatsApp config creation warning (non-fatal):', configError);
          whatsappConfig = { warning: "WhatsApp config could not be created. Please set it up separately." };
        } else {
          whatsappConfig = configData;
        }
      } else {
        whatsappConfig = { info: "WhatsApp configuration not provided. Agent created successfully. Set up WhatsApp integration separately." };
      }

      console.log('Agent created successfully:', agentData);

      // 5️⃣ Create agent-specific tables using RPC
      const agentPrefixLower = agentPrefix.toLowerCase();
      const { error: createTablesError } = await supabaseClient.rpc('create_agent_tables', {
        p_agent_prefix: agentPrefixLower,
        p_agent_id: agentData.id
      });

      if (createTablesError) {
        console.error('Table creation error (non-fatal):', createTablesError);
        // Continue with success but log the issue
      }

      // 6️⃣ Return success response
      return reply.code(200).send({
        success: true,
        message: "Agent created successfully",
        authUser,
        user,
        agent: agentData,
        whatsapp_config: whatsappConfig
      });

    } catch (err) {
      console.error("Edge function error:", err);
      return reply.code(500).send({
        success: false,
        message: "Server error: " + (err as Error).message
      });
    }
  });
}