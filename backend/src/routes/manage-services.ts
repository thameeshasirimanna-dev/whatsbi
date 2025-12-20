import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../utils/helpers';

export default async function manageServicesRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post('/manage-services', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const body = request.body as any;
      const { operation, ...opData } = body;

      if (!operation || !['create', 'get', 'update', 'delete'].includes(operation)) {
        return reply.code(400).send({
          status: 'error',
          message: 'operation must be "create", "get", "update", or "delete"'
        });
      }

      // Get agent
      const { data: agent, error: agentError } = await supabaseClient
        .from('agents')
        .select('id, agent_prefix')
        .eq('user_id', authenticatedUser.id)
        .single();

      if (agentError || !agent) {
        return reply.code(403).send({
          status: 'error',
          message: 'Agent not found'
        });
      }

      const agentId = agent.id;
      const agentPrefix = agent.agent_prefix;
      const servicesTable = `${agentPrefix}_services`;
      const servicePackagesTable = `${agentPrefix}_service_packages`;

      switch (operation) {
        case 'create': {
          const { service_name, description, packages, images } = opData;

          // Validation
          if (!service_name || typeof service_name !== 'string' || service_name.trim().length === 0) {
            return reply.code(400).send({
              status: 'error',
              message: 'service_name is required'
            });
          }

          if (!Array.isArray(packages) || packages.length === 0) {
            return reply.code(400).send({
              status: 'error',
              message: 'packages array is required and must not be empty'
            });
          }

          // Check for duplicate service_name
          const { data: existingService, error: checkError } = await supabaseClient
            .from(servicesTable)
            .select('id')
            .eq('service_name', service_name.trim())
            .eq('agent_id', agentId)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            return reply.code(500).send({
              status: 'error',
              message: 'Error checking duplicate service'
            });
          }

          if (existingService) {
            return reply.code(409).send({
              status: 'error',
              message: 'Service name already exists'
            });
          }

          // Call transaction function
          const { data: transactionData, error: txError } = await supabaseClient.rpc('create_service_transaction', {
            p_agent_id: agentId,
            p_services_table: servicesTable,
            p_service_packages_table: servicePackagesTable,
            p_service_name: service_name.trim(),
            p_description: description || null,
            p_image_urls: null,
            p_packages: packages
          });

          if (txError) {
            return reply.code(500).send({
              status: 'error',
              message: txError.message || 'Failed to create service'
            });
          }

          let finalData = transactionData;

          // Handle image upload after service creation if images provided
          if (images && Array.isArray(images) && images.length > 0) {
            // Note: Image processing logic would need to be ported from Edge Function
            // For now, skip images
            console.log('Image upload not implemented yet');
          }

          return reply.code(201).send({
            status: 'success',
            message: 'Service created successfully',
            data: finalData
          });
        }

        case 'get': {
          const { service_name: serviceNameFilter = '', package_name: packageNameFilter = '', sort_by: sortBy = 'created_at', sort_order: sortOrder = 'desc' } = opData;

          // Validate sort options
          const validSorts = ['price', 'created_at'];
          if (!validSorts.includes(sortBy)) {
            return reply.code(400).send({
              status: 'error',
              message: 'Invalid sort_by parameter. Use price or created_at'
            });
          }

          // Call database function
          const { data: servicesData, error } = await supabaseClient.rpc('get_agent_services', {
            p_agent_id: agentId,
            p_service_name_filter: serviceNameFilter,
            p_package_name_filter: packageNameFilter,
            p_sort_by: sortBy,
            p_sort_order: sortOrder
          });

          if (error) {
            return reply.code(500).send({
              status: 'error',
              message: 'Failed to fetch services'
            });
          }

          const services = servicesData || [];

          return reply.code(200).send({
            status: 'success',
            message: 'Services fetched successfully',
            data: services
          });
        }

        case 'update': {
          const { type, id, updates, removed_image_urls } = opData;

          // Validation
          if (!type || !['service', 'package'].includes(type)) {
            return reply.code(400).send({
              status: 'error',
              message: 'type must be "service" or "package"'
            });
          }

          if (!id || typeof id !== 'string') {
            return reply.code(400).send({
              status: 'error',
              message: 'id is required'
            });
          }

          if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
            return reply.code(400).send({
              status: 'error',
              message: 'updates object is required and must not be empty'
            });
          }

          // Handle removed images
          if (type === 'service' && removed_image_urls && Array.isArray(removed_image_urls) && removed_image_urls.length > 0) {
            // Note: Image deletion logic would need to be ported
            console.log('Image deletion not implemented yet');
            if (!updates.image_urls) updates.image_urls = {};
            if (!updates.image_urls.remove) updates.image_urls.remove = [];
            updates.image_urls.remove.push(...removed_image_urls);
          }

          // Handle new images
          if (type === 'service' && updates.images && Array.isArray(updates.images) && updates.images.length > 0) {
            // Note: Image upload logic would need to be ported
            console.log('Image upload not implemented yet');
          }

          // Call database function
          const { data, error: rpcError } = await supabaseClient.rpc('update_service_data', {
            p_agent_id: agentId,
            p_table_type: type,
            p_id: id,
            p_updates: updates
          });

          if (rpcError) {
            return reply.code(500).send({
              status: 'error',
              message: rpcError.message || 'Failed to update service'
            });
          }

          return reply.code(200).send({
            status: 'success',
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`,
            data
          });
        }

        case 'delete': {
          const { id } = opData;

          // Validation
          if (!id || typeof id !== 'string') {
            return reply.code(400).send({
              status: 'error',
              message: 'id is required'
            });
          }

          // Check dependencies
          const { data: dependencyCheck, error: depError } = await supabaseClient.rpc('check_service_dependencies', {
            p_agent_id: agentId,
            p_service_id: id
          });

          if (depError || (dependencyCheck && dependencyCheck.has_dependencies)) {
            return reply.code(403).send({
              status: 'error',
              message: 'Cannot delete: service has dependencies'
            });
          }

          // Hard delete
          const { data: hardData, error: hardError } = await supabaseClient.rpc('hard_delete_service', {
            p_agent_id: agentId,
            p_service_id: id
          });

          if (hardError) {
            return reply.code(500).send({
              status: 'error',
              message: hardError.message || 'Failed to permanently delete service'
            });
          }

          return reply.code(200).send({
            status: 'success',
            message: 'Service permanently deleted successfully',
            data: hardData
          });
        }

        default:
          return reply.code(400).send({
            status: 'error',
            message: 'Invalid operation'
          });
      }
    } catch (error) {
      console.error('Manage services error:', error);
      return reply.code(500).send({
        status: 'error',
        message: 'Internal server error'
      });
    }
  });
}