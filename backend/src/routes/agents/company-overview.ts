import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers.js';
import { uploadMediaToR2, deleteMediaFromR2 } from '../../utils/s3.js';

// Helper to extract S3 key from a full public R2 URL
function getS3KeyFromUrl(url: string): string {
  if (!url || !url.startsWith('http')) {
    return url;
  }
  try {
    const publicUrl = process.env.R2_PUBLIC_URL || '';
    if (publicUrl && url.startsWith(publicUrl)) {
      return url.replace(publicUrl, '').replace(/^\//, '');
    }
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\//, '');
  } catch (e) {
    console.error("Error parsing R2 URL to extract S3 key:", e);
    return url;
  }
}

export default async function companyOverviewRoutes(fastify: FastifyInstance, pgClient: any) {
  // Upload company overview document
  fastify.post('/upload-company-overview', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);

      // Parse multipart form data
      const parts = request.parts();
      let agentId: string | undefined;
      let fileBuffer: Buffer | undefined;
      let filename: string | undefined;
      let contentType: string | undefined;

      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(Buffer.from(chunk));
          }
          fileBuffer = Buffer.concat(chunks);
          filename = part.filename;
          contentType = part.mimetype;
        } else {
          if (part.fieldname === 'agentId') {
            agentId = part.value as string;
          }
        }
      }

      if (!agentId) {
        return reply.code(400).send({
          success: false,
          error: "agentId is required",
        });
      }

      if (!fileBuffer || !filename) {
        return reply.code(400).send({
          success: false,
          error: "file is required",
        });
      }

      // Check ownership/permissions
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, company_overview_path FROM agents WHERE id = $1 AND (user_id = $2 OR created_by = $2)",
        [agentId, authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          error: "Agent not found or access denied",
        });
      }

      const agent = agentRows[0];

      // If an existing file exists, delete it from R2 first
      if (agent.company_overview_path) {
        try {
          const oldS3Key = getS3KeyFromUrl(agent.company_overview_path);
          await deleteMediaFromR2(oldS3Key);
        } catch (deleteErr) {
          console.error("Warning: failed to delete old company overview file:", deleteErr);
        }
      }

      // Upload the new file to R2
      const fileExt = filename.split('.').pop() || 'txt';
      const cleanFileName = `company_overview_${Date.now()}.${fileExt}`;
      const s3Key = `${agent.agent_prefix}/company_overview/${cleanFileName}`;

      const uploadResult = await uploadMediaToR2(
        "",
        fileBuffer,
        filename,
        contentType || "application/octet-stream",
        "incoming",
        s3Key
      );

      if (!uploadResult) {
        return reply.code(500).send({
          success: false,
          error: "Failed to upload file to storage",
        });
      }

      // Update the agent record with the full public URL
      await pgClient.query(
        "UPDATE agents SET company_overview_path = $1 WHERE id = $2",
        [uploadResult, agentId]
      );

      return reply.code(200).send({
        success: true,
        message: "Company overview document uploaded successfully",
        filePath: uploadResult,
      });
    } catch (error) {
      console.error("Upload company overview error:", error);
      return reply.code(500).send({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Update company overview text
  fastify.post('/update-company-overview', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);
      const { agentId, company_overview } = request.body as {
        agentId?: string;
        company_overview?: string;
      };

      if (!agentId) {
        return reply.code(400).send({
          success: false,
          error: "agentId is required",
        });
      }

      // Check ownership/permissions
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE id = $1 AND (user_id = $2 OR created_by = $2)",
        [agentId, authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          error: "Agent not found or access denied",
        });
      }

      const trimmedOverview = typeof company_overview === 'string' ? company_overview.trim() : null;

      try {
        await pgClient.query(
          "UPDATE agents SET company_overview = $1 WHERE id = $2",
          [trimmedOverview || null, agentId]
        );
      } catch (colErr: any) {
        // In case migration 042 hasn't been executed yet, ensure column exists
        if (colErr.code === '42703') {
          await pgClient.query("ALTER TABLE agents ADD COLUMN IF NOT EXISTS company_overview TEXT;");
          await pgClient.query(
            "UPDATE agents SET company_overview = $1 WHERE id = $2",
            [trimmedOverview || null, agentId]
          );
        } else {
          throw colErr;
        }
      }

      return reply.code(200).send({
        success: true,
        message: "Company overview updated successfully",
        company_overview: trimmedOverview || "",
      });
    } catch (error) {
      console.error("Update company overview error:", error);
      return reply.code(500).send({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Delete company overview document or text
  fastify.post('/delete-company-overview', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);
      const { agentId } = request.body as { agentId?: string };

      if (!agentId) {
        return reply.code(400).send({
          success: false,
          error: "agentId is required",
        });
      }

      // Check ownership/permissions
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix, company_overview_path FROM agents WHERE id = $1 AND (user_id = $2 OR created_by = $2)",
        [agentId, authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          error: "Agent not found or access denied",
        });
      }

      const agent = agentRows[0];

      // If an existing file exists, delete it from R2
      if (agent.company_overview_path) {
        try {
          const oldS3Key = getS3KeyFromUrl(agent.company_overview_path);
          await deleteMediaFromR2(oldS3Key);
        } catch (deleteErr) {
          console.error("Warning: failed to delete company overview file:", deleteErr);
        }
      }

      // Update agent record: clear both company_overview text and company_overview_path
      try {
        await pgClient.query(
          "UPDATE agents SET company_overview = NULL, company_overview_path = NULL WHERE id = $1",
          [agentId]
        );
      } catch (colErr: any) {
        await pgClient.query(
          "UPDATE agents SET company_overview_path = NULL WHERE id = $1",
          [agentId]
        );
      }

      return reply.code(200).send({
        success: true,
        message: "Company overview removed successfully",
      });
    } catch (error) {
      console.error("Delete company overview error:", error);
      return reply.code(500).send({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Update AI agent instructions (business rules) text
  fastify.post('/update-ai-instructions', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);
      const { agentId, ai_instructions } = request.body as {
        agentId?: string;
        ai_instructions?: string;
      };

      if (!agentId) {
        return reply.code(400).send({
          success: false,
          error: "agentId is required",
        });
      }

      // Check ownership/permissions
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE id = $1 AND (user_id = $2 OR created_by = $2)",
        [agentId, authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          error: "Agent not found or access denied",
        });
      }

      const trimmedInstructions = typeof ai_instructions === 'string' ? ai_instructions.trim() : null;

      try {
        await pgClient.query(
          "UPDATE agents SET ai_instructions = $1 WHERE id = $2",
          [trimmedInstructions || null, agentId]
        );
      } catch (colErr: any) {
        // Fallback: add column if migration 043 hasn't run yet
        if (colErr.code === '42703') {
          await pgClient.query("ALTER TABLE agents ADD COLUMN IF NOT EXISTS ai_instructions TEXT;");
          await pgClient.query(
            "UPDATE agents SET ai_instructions = $1 WHERE id = $2",
            [trimmedInstructions || null, agentId]
          );
        } else {
          throw colErr;
        }
      }

      return reply.code(200).send({
        success: true,
        message: "AI agent instructions updated successfully",
        ai_instructions: trimmedInstructions || "",
      });
    } catch (error) {
      console.error("Update AI instructions error:", error);
      return reply.code(500).send({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Delete AI agent instructions text
  fastify.post('/delete-ai-instructions', async (request, reply) => {
    try {
      const authenticatedUser = await verifyJWT(request, pgClient);
      const { agentId } = request.body as { agentId?: string };

      if (!agentId) {
        return reply.code(400).send({
          success: false,
          error: "agentId is required",
        });
      }

      // Check ownership/permissions
      const { rows: agentRows } = await pgClient.query(
        "SELECT id, agent_prefix FROM agents WHERE id = $1 AND (user_id = $2 OR created_by = $2)",
        [agentId, authenticatedUser.id]
      );

      if (agentRows.length === 0) {
        return reply.code(403).send({
          success: false,
          error: "Agent not found or access denied",
        });
      }

      try {
        await pgClient.query(
          "UPDATE agents SET ai_instructions = NULL WHERE id = $1",
          [agentId]
        );
      } catch (colErr: any) {
        // Fallback: add column if migration 043 hasn't run yet
        if (colErr.code === '42703') {
          await pgClient.query("ALTER TABLE agents ADD COLUMN IF NOT EXISTS ai_instructions TEXT;");
          await pgClient.query(
            "UPDATE agents SET ai_instructions = NULL WHERE id = $1",
            [agentId]
          );
        } else {
          throw colErr;
        }
      }

      return reply.code(200).send({
        success: true,
        message: "AI agent instructions removed successfully",
      });
    } catch (error) {
      console.error("Delete AI instructions error:", error);
      return reply.code(500).send({
        success: false,
        error: "Internal server error",
      });
    }
  });
}

