import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import {
  ensureCustomerGroupTables,
  syncCustomerLeadStageGroup,
  reconcileLeadStageGroupMemberships,
  reconcile24hActiveMemberships,
  normalizeLeadStageName,
  assignCustomerToDefaultGroup,
  removeCustomerFromDefaultGroup,
} from './customer-groups-sync.js';

export {
  ensureCustomerGroupTables,
  syncCustomerLeadStageGroup,
  reconcileLeadStageGroupMemberships,
  reconcile24hActiveMemberships,
  normalizeLeadStageName,
  assignCustomerToDefaultGroup,
  removeCustomerFromDefaultGroup,
};

export default async function manageCustomerGroupsRoutes(
  fastify: FastifyInstance,
  pgClient: any
) {
  fastify.all('/manage-customer-groups', async (request, reply) => {
    try {
      // Verify JWT and get authenticated user
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Get agent details (support both owner and sub-users)
      const agentQuery =
        'SELECT id, agent_prefix FROM agents WHERE user_id = $1 OR id = (SELECT agent_id FROM users WHERE id = $1)';
      const agentResult = await pgClient.query(agentQuery, [authenticatedUser.id]);

      if (agentResult.rows.length === 0) {
        return reply.code(403).send({
          success: false,
          message: 'Agent not found',
        });
      }

      const agent = agentResult.rows[0];
      const agentPrefix = agent.agent_prefix;
      const agentId = Number(agent.id);

      await ensureCustomerGroupTables(pgClient, agentPrefix, agentId);

      const method = request.method;
      const url = new URL(request.url, `http://${request.headers.host}`);
      const body = (request.body as any) || {};

      switch (method) {
        case 'GET': {
          await reconcile24hActiveMemberships(pgClient, agentPrefix);
          const groupIdParam = url.searchParams.get('group_id');
          const includeMembers = url.searchParams.get('include_members') === 'true';
          const exportPhones = url.searchParams.get('action') === 'export_phones';

          // If export phones requested for a group
          if (groupIdParam && exportPhones) {
            const groupId = parseInt(groupIdParam, 10);
            const { rows } = await pgClient.query(`
              SELECT c.phone, c.name
              FROM ${agentPrefix}_customer_group_members gm
              JOIN ${agentPrefix}_customers c ON gm.customer_id = c.id
              WHERE gm.group_id = $1
              ORDER BY c.name ASC
            `, [groupId]);

            return reply.code(200).send({
              success: true,
              group_id: groupId,
              count: rows.length,
              phones: rows.map(r => r.phone),
              members: rows,
            });
          }

          // If single group details requested
          if (groupIdParam) {
            const groupId = parseInt(groupIdParam, 10);
            const { rows: groupRows } = await pgClient.query(`
              SELECT 
                g.*,
                COALESCE(COUNT(DISTINCT m.customer_id), 0)::int AS member_count
              FROM ${agentPrefix}_customer_groups g
              LEFT JOIN ${agentPrefix}_customer_group_members m ON g.id = m.group_id
              WHERE g.id = $1
              GROUP BY g.id
            `, [groupId]);

            if (groupRows.length === 0) {
              return reply.code(404).send({
                success: false,
                message: 'Customer group not found',
              });
            }

            const group = groupRows[0];
            let members: any[] = [];

            if (includeMembers) {
              const { rows: memberRows } = await pgClient.query(`
                SELECT 
                  c.id,
                  c.name,
                  c.phone,
                  c.lead_stage,
                  c.interest_stage,
                  c.conversion_stage,
                  c.profile_image_url,
                  gm.added_at,
                  COALESCE(oc.order_count, 0) as order_count
                FROM ${agentPrefix}_customer_group_members gm
                JOIN ${agentPrefix}_customers c ON gm.customer_id = c.id
                LEFT JOIN (
                  SELECT customer_id, COUNT(*) as order_count
                  FROM ${agentPrefix}_orders
                  GROUP BY customer_id
                ) oc ON c.id = oc.customer_id
                WHERE gm.group_id = $1
                ORDER BY gm.added_at DESC
              `, [groupId]);
              members = memberRows;
            }

            return reply.code(200).send({
              success: true,
              group: {
                ...group,
                members,
              },
            });
          }

          // List all customer groups with member counts and preview avatars
          const { rows: groups } = await pgClient.query(`
            SELECT 
              g.id,
              g.name,
              g.description,
              g.color,
              COALESCE(g.is_default, false) AS is_default,
              g.created_at,
              g.updated_at,
              COALESCE(COUNT(DISTINCT m.customer_id), 0)::int AS member_count,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'phone', c.phone,
                    'profile_image_url', c.profile_image_url
                  ))
                  FROM (
                    SELECT c.id, c.name, c.phone, c.profile_image_url
                    FROM ${agentPrefix}_customer_group_members gm
                    JOIN ${agentPrefix}_customers c ON gm.customer_id = c.id
                    WHERE gm.group_id = g.id
                    ORDER BY gm.added_at DESC
                    LIMIT 4
                  ) c
                ),
                '[]'::json
              ) AS preview_members
            FROM ${agentPrefix}_customer_groups g
            LEFT JOIN ${agentPrefix}_customer_group_members m ON g.id = m.group_id
            GROUP BY g.id
            ORDER BY COALESCE(g.is_default, false) DESC, g.created_at ASC
          `);

          // Also get total distinct grouped customers count
          const { rows: statsRows } = await pgClient.query(`
            SELECT 
              COUNT(DISTINCT customer_id)::int as total_grouped_customers,
              (SELECT COUNT(*)::int FROM ${agentPrefix}_customers) as total_customers
            FROM ${agentPrefix}_customer_group_members
          `);

          const stats = statsRows[0] || { total_grouped_customers: 0, total_customers: 0 };

          return reply.code(200).send({
            success: true,
            groups,
            total_groups: groups.length,
            total_grouped_customers: stats.total_grouped_customers,
            total_customers: stats.total_customers,
          });
        }

        case 'POST': {
          const name = body.name ? String(body.name).trim() : '';
          const description = body.description ? String(body.description).trim() : null;
          const color = body.color ? String(body.color).trim() : '#22C55E';
          const customerIds = Array.isArray(body.customer_ids) ? body.customer_ids : [];

          if (!name) {
            return reply.code(400).send({
              success: false,
              message: 'Group name is required',
            });
          }

          // Insert new group
          const { rows: insertedGroup } = await pgClient.query(`
            INSERT INTO ${agentPrefix}_customer_groups (agent_id, name, description, color, created_at, updated_at)
            VALUES ($1, $2, $3, $4, now(), now())
            RETURNING *
          `, [agentId, name, description, color]);

          const newGroup = insertedGroup[0];

          // Add initial members if provided
          if (customerIds.length > 0) {
            for (const cId of customerIds) {
              const parsedCId = parseInt(cId, 10);
              if (!isNaN(parsedCId)) {
                await pgClient.query(`
                  INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id, added_at)
                  VALUES ($1, $2, now())
                  ON CONFLICT (group_id, customer_id) DO NOTHING
                `, [newGroup.id, parsedCId]);
              }
            }
          }

          return reply.code(201).send({
            success: true,
            message: 'Customer group created successfully',
            group: {
              ...newGroup,
              member_count: customerIds.length,
            },
          });
        }

        case 'PUT': {
          const id = parseInt(body.id, 10);
          if (isNaN(id)) {
            return reply.code(400).send({
              success: false,
              message: 'Valid group ID is required',
            });
          }

          const action = body.action;
          const customerIds = Array.isArray(body.customer_ids) ? body.customer_ids : [];

          // Membership mutations
          if (['add_members', 'remove_members', 'set_members'].includes(action)) {
            const { rows: grpRows } = await pgClient.query(
              `SELECT id, name FROM ${agentPrefix}_customer_groups WHERE id = $1`,
              [id]
            );
            if (grpRows[0]?.name?.toLowerCase() === 'within 24h active') {
              return reply.code(400).send({
                success: false,
                message: 'The "Within 24h Active" group is automatically managed by WhatsApp messaging activity and cannot be manually modified.',
              });
            }
          }

          if (action === 'add_members' && customerIds.length > 0) {
            const groupRes = await pgClient.query(
              `SELECT id, name, is_default FROM ${agentPrefix}_customer_groups WHERE id = $1`,
              [id]
            );
            const groupInfo = groupRes.rows[0];

            for (const cId of customerIds) {
              const parsedCId = parseInt(cId, 10);
              if (!isNaN(parsedCId)) {
                if (groupInfo?.is_default) {
                  await assignCustomerToDefaultGroup(pgClient, agentPrefix, groupInfo.name, parsedCId);
                } else {
                  await pgClient.query(`
                    INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id, added_at)
                    VALUES ($1, $2, now())
                    ON CONFLICT (group_id, customer_id) DO NOTHING
                  `, [id, parsedCId]);
                }
              }
            }

            await pgClient.query(`
              UPDATE ${agentPrefix}_customer_groups SET updated_at = now() WHERE id = $1
            `, [id]);

            return reply.code(200).send({
              success: true,
              message: `Added ${customerIds.length} customer(s) to group`,
            });
          }

          if (action === 'remove_members' && customerIds.length > 0) {
            const groupRes = await pgClient.query(
              `SELECT id, name, is_default FROM ${agentPrefix}_customer_groups WHERE id = $1`,
              [id]
            );
            const groupInfo = groupRes.rows[0];
            const parsedCIds = customerIds.map((cid: any) => parseInt(cid, 10)).filter((n: number) => !isNaN(n));

            if (groupInfo?.is_default) {
              await removeCustomerFromDefaultGroup(pgClient, agentPrefix, groupInfo.name, parsedCIds);
            } else {
              await pgClient.query(`
                DELETE FROM ${agentPrefix}_customer_group_members
                WHERE group_id = $1 AND customer_id = ANY($2::int[])
              `, [id, parsedCIds]);
            }

            await pgClient.query(`
              UPDATE ${agentPrefix}_customer_groups SET updated_at = now() WHERE id = $1
            `, [id]);

            return reply.code(200).send({
              success: true,
              message: `Removed ${customerIds.length} customer(s) from group`,
            });
          }

          if (action === 'set_members') {
            await pgClient.query(`
              DELETE FROM ${agentPrefix}_customer_group_members WHERE group_id = $1
            `, [id]);

            for (const cId of customerIds) {
              const parsedCId = parseInt(cId, 10);
              if (!isNaN(parsedCId)) {
                await pgClient.query(`
                  INSERT INTO ${agentPrefix}_customer_group_members (group_id, customer_id, added_at)
                  VALUES ($1, $2, now())
                  ON CONFLICT (group_id, customer_id) DO NOTHING
                `, [id, parsedCId]);
              }
            }

            await pgClient.query(`
              UPDATE ${agentPrefix}_customer_groups SET updated_at = now() WHERE id = $1
            `, [id]);

            return reply.code(200).send({
              success: true,
              message: 'Group members updated successfully',
            });
          }

          const { rows: existingGroup } = await pgClient.query(
            `SELECT id, name, is_default FROM ${agentPrefix}_customer_groups WHERE id = $1`,
            [id]
          );
          if (existingGroup.length === 0) {
            return reply.code(404).send({ success: false, message: 'Group not found' });
          }
          if (existingGroup[0].is_default && body.name !== undefined && String(body.name).trim() !== existingGroup[0].name) {
            return reply.code(400).send({
              success: false,
              message: 'The name of a default lead stage group cannot be modified.',
            });
          }

          // Metadata update (name, description, color)
          const updates: string[] = ['updated_at = now()'];
          const values: any[] = [id];

          if (body.name !== undefined) {
            values.push(String(body.name).trim());
            updates.push(`name = $${values.length}`);
          }
          if (body.description !== undefined) {
            values.push(body.description ? String(body.description).trim() : null);
            updates.push(`description = $${values.length}`);
          }
          if (body.color !== undefined) {
            values.push(String(body.color).trim());
            updates.push(`color = $${values.length}`);
          }

          const { rows: updatedRows } = await pgClient.query(`
            UPDATE ${agentPrefix}_customer_groups
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING *
          `, values);

          if (updatedRows.length === 0) {
            return reply.code(404).send({
              success: false,
              message: 'Group not found',
            });
          }

          return reply.code(200).send({
            success: true,
            message: 'Customer group updated successfully',
            group: updatedRows[0],
          });
        }

        case 'DELETE': {
          const idParam = body.id || url.searchParams.get('id');
          const id = parseInt(idParam, 10);

          if (isNaN(id)) {
            return reply.code(400).send({
              success: false,
              message: 'Valid group ID is required',
            });
          }

          const { rows: existingGroup } = await pgClient.query(
            `SELECT id, name, is_default FROM ${agentPrefix}_customer_groups WHERE id = $1`,
            [id]
          );
          if (existingGroup.length === 0) {
            return reply.code(404).send({ success: false, message: 'Group not found' });
          }
          if (existingGroup[0].is_default) {
            return reply.code(400).send({
              success: false,
              message: 'Default lead stage groups cannot be deleted as they are managed by the CRM system.',
            });
          }

          const { rows } = await pgClient.query(`
            DELETE FROM ${agentPrefix}_customer_groups
            WHERE id = $1
            RETURNING id, name
          `, [id]);

          if (rows.length === 0) {
            return reply.code(404).send({
              success: false,
              message: 'Group not found',
            });
          }

          return reply.code(200).send({
            success: true,
            message: `Group "${rows[0].name}" deleted successfully`,
          });
        }

        default:
          return reply.code(405).send({
            success: false,
            message: 'Method not allowed',
          });
      }
    } catch (err: any) {
      console.error('[manage-customer-groups] Error:', err);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error: ' + (err?.message || String(err)),
      });
    }
  });
}
