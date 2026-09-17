import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';

export interface MaintenanceSettings {
  maintenance_mode: boolean;
  maintenance_title: string;
  maintenance_message: string;
  estimated_end: string | null;
  webhook_retry_mode: boolean;
  updated_at?: string;
  updated_by?: string | null;
}

// In-memory cache for ultra-fast checks on every request/webhook
let cachedMaintenanceSettings: MaintenanceSettings = {
  maintenance_mode: false,
  maintenance_title: 'System Maintenance Underway',
  maintenance_message: 'We are currently performing scheduled system updates to improve performance and stability. Our services will resume shortly.',
  estimated_end: null,
  webhook_retry_mode: true,
};

export function getCachedMaintenanceSettings(): MaintenanceSettings {
  return cachedMaintenanceSettings;
}

export async function refreshMaintenanceCache(pgClient: any): Promise<MaintenanceSettings> {
  try {
    const { rows } = await pgClient.query(
      "SELECT maintenance_mode, maintenance_title, maintenance_message, estimated_end, webhook_retry_mode, updated_at, updated_by FROM system_settings WHERE id = 'system' LIMIT 1"
    );
    if (rows && rows.length > 0) {
      cachedMaintenanceSettings = {
        maintenance_mode: Boolean(rows[0].maintenance_mode),
        maintenance_title: rows[0].maintenance_title || 'System Maintenance Underway',
        maintenance_message: rows[0].maintenance_message || 'We are currently performing scheduled maintenance. Services will resume shortly.',
        estimated_end: rows[0].estimated_end || null,
        webhook_retry_mode: rows[0].webhook_retry_mode !== false,
        updated_at: rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : undefined,
        updated_by: rows[0].updated_by || null,
      };
    }
  } catch (err: any) {
    console.warn('Notice: Could not load maintenance settings from database:', err.message);
  }
  return cachedMaintenanceSettings;
}

export default async function maintenanceRoutes(
  fastify: FastifyInstance,
  pgClient: any,
  cacheService?: any
) {
  // Prime the in-memory cache on route initialization
  await refreshMaintenanceCache(pgClient);

  // 1. Public endpoint to check maintenance status
  fastify.get('/maintenance-status', async (request, reply) => {
    return reply.code(200).send({
      success: true,
      ...cachedMaintenanceSettings,
    });
  });

  // 2. Admin endpoint to update maintenance settings
  fastify.post('/admin/maintenance', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);
      if (!authenticatedUser || !authenticatedUser.id) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      const { rows: userRows } = await pgClient.query(
        'SELECT id, role FROM users WHERE id = $1',
        [authenticatedUser.id]
      );

      if (userRows.length === 0 || userRows[0].role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Admin role required.',
        });
      }

      const body = request.body as Partial<MaintenanceSettings>;
      const {
        maintenance_mode,
        maintenance_title,
        maintenance_message,
        estimated_end,
        webhook_retry_mode,
      } = body;

      const { rows } = await pgClient.query(
        `INSERT INTO system_settings (id, maintenance_mode, maintenance_title, maintenance_message, estimated_end, webhook_retry_mode, updated_at, updated_by)
         VALUES ('system', $1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT (id) DO UPDATE SET
           maintenance_mode = EXCLUDED.maintenance_mode,
           maintenance_title = COALESCE(EXCLUDED.maintenance_title, system_settings.maintenance_title),
           maintenance_message = COALESCE(EXCLUDED.maintenance_message, system_settings.maintenance_message),
           estimated_end = EXCLUDED.estimated_end,
           webhook_retry_mode = COALESCE(EXCLUDED.webhook_retry_mode, system_settings.webhook_retry_mode),
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by
         RETURNING *`,
        [
          maintenance_mode !== undefined ? Boolean(maintenance_mode) : cachedMaintenanceSettings.maintenance_mode,
          maintenance_title !== undefined ? String(maintenance_title).trim() : cachedMaintenanceSettings.maintenance_title,
          maintenance_message !== undefined ? String(maintenance_message).trim() : cachedMaintenanceSettings.maintenance_message,
          estimated_end !== undefined ? (estimated_end ? String(estimated_end).trim() : null) : cachedMaintenanceSettings.estimated_end,
          webhook_retry_mode !== undefined ? Boolean(webhook_retry_mode) : cachedMaintenanceSettings.webhook_retry_mode,
          authenticatedUser.id,
        ]
      );

      // Refresh in-memory cache
      await refreshMaintenanceCache(pgClient);

      return reply.code(200).send({
        success: true,
        message: cachedMaintenanceSettings.maintenance_mode
          ? 'Maintenance mode activated successfully'
          : 'Maintenance mode deactivated successfully',
        settings: cachedMaintenanceSettings,
      });
    } catch (err: any) {
      console.error('Update maintenance settings error:', err);
      return reply.code(500).send({
        success: false,
        message: 'Failed to update maintenance settings: ' + err.message,
      });
    }
  });
}
