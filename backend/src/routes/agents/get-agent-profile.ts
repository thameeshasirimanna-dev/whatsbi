import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function getAgentProfileRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.get('/get-agent-profile', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      // Get agent data with user details
      const { data: agentData, error: agentError } = await supabaseClient
        .from('agents')
        .select(`
          id,
          address,
          business_email,
          contact_number,
          website,
          invoice_template_path,
          credits
        `)
        .eq('user_id', authenticatedUser.id)
        .single();

      if (agentError) {
        console.error('Agent fetch error:', agentError);
        return reply.code(500).send({ success: false, message: 'Failed to fetch agent data' });
      }

      // Get user name
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('name, email')
        .eq('id', authenticatedUser.id)
        .single();

      if (userError) {
        console.error('User fetch error:', userError);
        return reply.code(500).send({ success: false, message: 'Failed to fetch user data' });
      }

      // Get whatsapp configuration
      const { data: whatsappData, error: whatsappError } = await supabaseClient
        .from('whatsapp_configuration')
        .select('whatsapp_number')
        .eq('user_id', authenticatedUser.id)
        .single();

      if (whatsappError && whatsappError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('WhatsApp config fetch error:', whatsappError);
        return reply.code(500).send({ success: false, message: 'Failed to fetch WhatsApp configuration' });
      }

      return reply.code(200).send({
        success: true,
        agent: {
          id: agentData.id,
          name: userData?.name || 'Agent',
          email: userData?.email || '',
          whatsapp_number: whatsappData?.whatsapp_number || '',
          address: agentData.address || '',
          business_email: agentData.business_email || '',
          contact_number: agentData.contact_number || '',
          website: agentData.website || '',
          invoice_template_path: agentData.invoice_template_path,
          credits: agentData.credits || 0,
        }
      });
    } catch (error) {
      console.error('Get agent profile error:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}