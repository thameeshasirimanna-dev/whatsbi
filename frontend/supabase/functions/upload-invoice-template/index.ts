// DEPRECATED: Replaced by Node backend
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { agentId, fileName, fileBase64, fileType } = await req.json()

    if (!agentId || !fileName || !fileBase64 || !fileType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Decode base64 file
    const prefix = `data:${fileType};base64,`;
    const base64Data = fileBase64.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const filePath = `agents/${agentId}/${fileName}`

    // Upload to storage
    const { error: uploadError } = await supabaseClient.storage
      .from('agent-templates')
      .upload(filePath, bytes, {
        contentType: fileType,
        upsert: true,
      })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Upload failed: ' + uploadError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      )
    }

    // Extract user ID from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    try {
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      userId = decodedPayload.sub;
      if (!userId) {
        throw new Error('Invalid JWT: missing sub claim');
      }
    } catch (jwtError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT token: ' + jwtError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      );
    }

    // Update DB
    const { data, error: dbError } = await supabaseClient.rpc('update_agent_template_path', {
      p_agent_id: agentId,
      p_template_path: filePath,
      p_current_user_id: userId,
    })

    if (dbError) {
      // Rollback storage if DB fails
      await supabaseClient.storage.from('agent-templates').remove([filePath])
      return new Response(
        JSON.stringify({ error: 'DB update failed: ' + dbError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      )
    }

    return new Response(
      JSON.stringify({ success: true, path: filePath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})