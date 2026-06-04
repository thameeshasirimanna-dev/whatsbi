import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { deleteMediaFromR2 } from '../../utils/s3.js';

export default async function manageInventoryRoutes(fastify: FastifyInstance, pgClient: any) {
  fastify.all('/manage-inventory', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent (support both owner and sub-users)
      const { rows: agentRows } = await pgClient.query(
        'SELECT id, agent_prefix FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)',
        [authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          status: 'error',
          message: 'Agent not found'
        });
      }

      const agent = agentRows[0];
      const agentPrefix = agent.agent_prefix;
      const method = request.method;
      const url = new URL(request.url, `http://${request.headers.host}`);
      let parsedBody = null;

      if (method === 'POST' || method === 'PUT') {
        try {
          parsedBody = request.body as any;
        } catch (e) {
          console.error('JSON parse error:', e);
          return reply.code(400).send({ error: 'Invalid JSON body' });
        }
      }

      const type = url.searchParams.get('type') || (parsedBody ? parsedBody.type : null);

      switch (method) {
        case 'GET': {
          if (type === 'categories') {
            // Get categories
            const search = url.searchParams.get('search') || undefined;
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const offset = parseInt(url.searchParams.get('offset') || '0');

            let sql = `
              SELECT c.id, c.name, c.description, c.color,
                     COALESCE(ii_count.count::INTEGER, 0) as item_count,
                     c.created_at, c.updated_at
              FROM ${agentPrefix}_categories c
              LEFT JOIN (
                SELECT category_id, COUNT(*)::INTEGER as count
                FROM ${agentPrefix}_inventory_items
                WHERE agent_id = $1
                GROUP BY category_id
              ) ii_count ON c.id = ii_count.category_id
              WHERE 1=1
            `;
            const params: any[] = [agent.id];

            if (search) {
              params.push(`%${search}%`);
              sql += ` AND c.name ILIKE $${params.length}`;
            }

            sql += ` ORDER BY c.name ASC`;

            if (limit > 0) {
              params.push(limit);
              sql += ` LIMIT $${params.length}`;
            }

            if (offset > 0) {
              params.push(offset);
              sql += ` OFFSET $${params.length}`;
            }

            const { rows: categories } = await pgClient.query(sql, params);
            return reply.code(200).send({ categories });
          } else {
            // Get inventory items
            const category = url.searchParams.get('category') || undefined;
            const search = url.searchParams.get('search') || undefined;
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const offset = parseInt(url.searchParams.get('offset') || '0');

            let sql = `
              SELECT i.id, i.name, i.description, i.quantity, i.price,
                     COALESCE(c.name, NULL) as category_name, i.sku, i.image_urls, i.created_at, i.updated_at
              FROM ${agentPrefix}_inventory_items i
              LEFT JOIN ${agentPrefix}_categories c ON i.category_id = c.id
              WHERE i.agent_id = $1
            `;
            const params: any[] = [agent.id];

            if (category) {
              params.push(category);
              sql += ` AND LOWER(c.name) = LOWER($${params.length})`;
            }

            if (search) {
              params.push(`%${search}%`);
              sql += ` AND (i.name ILIKE $${params.length} OR i.description ILIKE $${params.length} OR i.sku ILIKE $${params.length})`;
            }

            sql += ` ORDER BY i.updated_at DESC`;

            if (limit > 0) {
              params.push(limit);
              sql += ` LIMIT $${params.length}`;
            }

            if (offset > 0) {
              params.push(offset);
              sql += ` OFFSET $${params.length}`;
            }

            const { rows: items } = await pgClient.query(sql, params);
            return reply.code(200).send({ items });
          }
        }

        case 'POST': {
          const body = parsedBody;
          const { name, quantity, price, category_id, description, sku, image_urls, color } = body || {};

          if (type === 'category') {
            // Create category
            if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
              return reply.code(400).send({ error: 'Category name is required and must be 1-50 characters' });
            }

            if (name.trim().match(/[^a-zA-Z0-9 ]/) !== null) {
              return reply.code(400).send({ error: 'Category name must be alphanumeric with spaces' });
            }

            if (color && !color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
              return reply.code(400).send({ error: 'Invalid color format (use hex #RRGGBB or #RGB)' });
            }

            // Check for duplicate name
            const { rows: duplicateRows } = await pgClient.query(
              `SELECT id FROM ${agentPrefix}_categories WHERE LOWER(name) = LOWER($1)`,
              [name.trim()]
            );

            if (duplicateRows.length > 0) {
              return reply.code(400).send({ error: 'Category name already exists' });
            }

            // Insert category
            const { rows: insertedCategoryRows } = await pgClient.query(
              `INSERT INTO ${agentPrefix}_categories (name, description, color, updated_at)
               VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id`,
              [name.trim(), description || null, color || null]
            );

            return reply.code(201).send({
              success: true,
              category_id: insertedCategoryRows[0].id,
              message: 'Category created successfully'
            });
          } else {
            // Create inventory item
            // Validate required fields
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
              return reply.code(400).send({ error: 'Item name is required' });
            }

            if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
              return reply.code(400).send({ error: 'Quantity must be a non-negative number' });
            }

            if (price !== undefined && (typeof price !== 'number' || price < 0)) {
              return reply.code(400).send({ error: 'Price must be a non-negative number' });
            }

            if (category_id !== undefined && (typeof category_id !== 'number' || category_id < 1)) {
              return reply.code(400).send({ error: 'Category ID must be a positive integer' });
            }

            // Validate category_id if provided
            if (category_id) {
              const { rows: catCheckRows } = await pgClient.query(
                `SELECT 1 FROM ${agentPrefix}_categories WHERE id = $1`,
                [category_id]
              );
              if (catCheckRows.length === 0) {
                return reply.code(400).send({ error: 'Invalid category ID' });
              }
            }

            // Insert item
            const { rows: insertedItemRows } = await pgClient.query(
              `INSERT INTO ${agentPrefix}_inventory_items (agent_id, name, quantity, price, category_id, description, sku, image_urls, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING id`,
              [
                agent.id,
                name.trim(),
                quantity || 0,
                price || 0,
                category_id || null,
                description || null,
                sku || null,
                image_urls ? JSON.stringify(image_urls) : null
              ]
            );

            return reply.code(201).send({
              success: true,
              item_id: insertedItemRows[0].id,
              message: 'Inventory item created successfully'
            });
          }
        }

        case 'PUT': {
          const body = parsedBody;
          const typeParam = body.type || url.searchParams.get('type');

          if (typeParam === 'category') {
            // Update category
            const { id, name, description, color } = body || {};

            if (!id || typeof id !== 'number' || id < 1) {
              return reply.code(400).send({ error: 'Category ID is required and must be a positive integer' });
            }

            // Validate name if provided
            if (name !== undefined) {
              if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
                return reply.code(400).send({ error: 'Category name must be 1-50 characters' });
              }

              if (name.trim().match(/[^a-zA-Z0-9 ]/) !== null) {
                return reply.code(400).send({ error: 'Category name must be alphanumeric with spaces' });
              }
            }

            // Validate color if provided
            if (color !== undefined && color && !color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
              return reply.code(400).send({ error: 'Invalid color format (use hex #RRGGBB or #RGB)' });
            }

            // Check if category exists
            const { rows: catRows } = await pgClient.query(
              `SELECT id FROM ${agentPrefix}_categories WHERE id = $1`,
              [id]
            );

            if (catRows.length === 0) {
              return reply.code(404).send({ error: 'Category not found or access denied' });
            }

            // Validate name duplicate if provided
            if (name !== undefined) {
              const { rows: dupRows } = await pgClient.query(
                `SELECT 1 FROM ${agentPrefix}_categories WHERE LOWER(name) = LOWER($1) AND id != $2`,
                [name.trim(), id]
              );
              if (dupRows.length > 0) {
                return reply.code(400).send({ error: 'Category name already exists' });
              }
            }

            // Build update dynamic query
            const updates: string[] = [];
            const queryParams: any[] = [];
            if (name !== undefined) {
              queryParams.push(name.trim());
              updates.push(`name = $${queryParams.length}`);
            }
            if (description !== undefined) {
              queryParams.push(description);
              updates.push(`description = $${queryParams.length}`);
            }
            if (color !== undefined) {
              queryParams.push(color);
              updates.push(`color = $${queryParams.length}`);
            }

            if (updates.length > 0) {
              queryParams.push(id);
              await pgClient.query(
                `UPDATE ${agentPrefix}_categories SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${queryParams.length}`,
                queryParams
              );
            }

            return reply.code(200).send({
              success: true,
              message: 'Category updated successfully'
            });
          } else {
            // Update inventory item
            const { id, name, quantity, price, category, description, sku, image_urls, removed_image_urls } = body || {};

            if (!id || typeof id !== 'number') {
              return reply.code(400).send({ error: 'Item ID is required' });
            }

            // Validate optional fields
            if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
              return reply.code(400).send({ error: 'Quantity must be a non-negative number' });
            }

            if (price !== undefined && (typeof price !== 'number' || price < 0)) {
              return reply.code(400).send({ error: 'Price must be a non-negative number' });
            }

            if (category !== undefined && (typeof category !== 'number' || category < 1)) {
              return reply.code(400).send({ error: 'Category ID must be a positive integer' });
            }

            // Check if item exists and belongs to agent
            const { rows: itemRows } = await pgClient.query(
              `SELECT id FROM ${agentPrefix}_inventory_items WHERE id = $1 AND agent_id = $2`,
              [id, agent.id]
            );

            if (itemRows.length === 0) {
              return reply.code(404).send({ error: 'Item not found or access denied' });
            }

            // Validate category ID if provided
            if (category) {
              const { rows: catRows } = await pgClient.query(
                `SELECT 1 FROM ${agentPrefix}_categories WHERE id = $1`,
                [category]
              );
              if (catRows.length === 0) {
                return reply.code(400).send({ error: 'Invalid category ID' });
              }
            }

            // Handle image deletions from R2 storage if provided
            if (removed_image_urls && Array.isArray(removed_image_urls) && removed_image_urls.length > 0) {
              const publicUrlBase = process.env.R2_PUBLIC_URL || '';
              for (const url of removed_image_urls) {
                if (typeof url === 'string' && publicUrlBase && url.startsWith(publicUrlBase)) {
                  const key = url.substring(publicUrlBase.length).replace(/^\/+/, '');
                  if (key) {
                    await deleteMediaFromR2(key);
                  }
                }
              }
            }

            // Build dynamic update query
            const updates: string[] = [];
            const queryParams: any[] = [];
            if (name !== undefined) {
              queryParams.push(name.trim());
              updates.push(`name = $${queryParams.length}`);
            }
            if (quantity !== undefined) {
              queryParams.push(quantity);
              updates.push(`quantity = $${queryParams.length}`);
            }
            if (price !== undefined) {
              queryParams.push(price);
              updates.push(`price = $${queryParams.length}`);
            }
            if (category !== undefined) {
              queryParams.push(category);
              updates.push(`category_id = $${queryParams.length}`);
            }
            if (description !== undefined) {
              queryParams.push(description);
              updates.push(`description = $${queryParams.length}`);
            }
            if (sku !== undefined) {
              queryParams.push(sku);
              updates.push(`sku = $${queryParams.length}`);
            }
            if (image_urls !== undefined) {
              queryParams.push(image_urls ? JSON.stringify(image_urls) : null);
              updates.push(`image_urls = $${queryParams.length}`);
            }

            if (updates.length > 0) {
              queryParams.push(id);
              queryParams.push(agent.id);
              await pgClient.query(
                `UPDATE ${agentPrefix}_inventory_items SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${queryParams.length - 1} AND agent_id = $${queryParams.length}`,
                queryParams
              );
            }

            return reply.code(200).send({
              success: true,
              message: 'Inventory item updated successfully'
            });
          }
        }

        case 'DELETE': {
          const url = new URL(request.url, `http://${request.headers.host}`);
          const typeParam = url.searchParams.get('type');
          const id = url.searchParams.get('id');

          if (!id || typeof id !== 'string' || !id.match(/^\d+$/)) {
            return reply.code(400).send({ error: 'Valid ID is required' });
          }

          const entityId = parseInt(id);

          if (typeParam === 'category') {
            // Delete category
            // Check if category exists
            const { rows: catRows } = await pgClient.query(
              `SELECT id FROM ${agentPrefix}_categories WHERE id = $1`,
              [entityId]
            );

            if (catRows.length === 0) {
              return reply.code(404).send({ error: 'Category not found or access denied' });
            }

            // Check if any items are assigned to this category
            const { rows: countRows } = await pgClient.query(
              `SELECT COUNT(*)::INTEGER as count FROM ${agentPrefix}_inventory_items WHERE category_id = $1 AND agent_id = $2`,
              [entityId, agent.id]
            );

            if (countRows[0].count > 0) {
              return reply.code(400).send({ error: 'Cannot delete category with assigned items. Reassign items first.' });
            }

            // Delete the category
            await pgClient.query(
              `DELETE FROM ${agentPrefix}_categories WHERE id = $1`,
              [entityId]
            );

            return reply.code(200).send({
              success: true,
              message: 'Category deleted successfully'
            });
          } else {
            // Delete inventory item
            const itemId = entityId;

            // Get current item images for cleanup
            const { rows: itemRows } = await pgClient.query(
              `SELECT image_urls FROM ${agentPrefix}_inventory_items WHERE id = $1 AND agent_id = $2`,
              [itemId, agent.id]
            );

            if (itemRows.length === 0) {
              return reply.code(404).send({ error: 'Item not found or access denied' });
            }

            const currentItemData = itemRows[0];
            if (currentItemData && currentItemData.image_urls && Array.isArray(currentItemData.image_urls)) {
              const imageUrls = currentItemData.image_urls as string[];
              const publicUrlBase = process.env.R2_PUBLIC_URL || '';
              for (const url of imageUrls) {
                if (typeof url === 'string' && publicUrlBase && url.startsWith(publicUrlBase)) {
                  const key = url.substring(publicUrlBase.length).replace(/^\/+/, '');
                  if (key) {
                    await deleteMediaFromR2(key);
                  }
                }
              }
            }

            // Delete the item
            await pgClient.query(
              `DELETE FROM ${agentPrefix}_inventory_items WHERE id = $1 AND agent_id = $2`,
              [itemId, agent.id]
            );

            return reply.code(200).send({
              success: true,
              message: 'Inventory item deleted successfully'
            });
          }
        }

        default: {
          return reply.code(405).send({ error: 'Method not allowed' });
        }
      }
    } catch (error) {
      console.error('Inventory management error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}