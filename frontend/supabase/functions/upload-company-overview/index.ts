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

    const { agentId, fileBase64, fileType } = await req.json()

    if (!agentId || !fileBase64 || !fileType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
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

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('user_id', userId)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found or access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 },
      );
    }

    // Decode base64 file
    const prefix = `data:${fileType};base64,`;
    const base64Data = fileBase64.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const filePath = `${agentId}/document.txt`

    // Upload to storage
    const { error: uploadError } = await supabaseClient.storage
      .from('knowledge-documents')
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

    // Get public URL
    const { data: publicUrlData } = supabaseClient.storage
      .from('knowledge-documents')
      .getPublicUrl(filePath)

    // Fetch webhook URL from whatsapp_configuration
    const { data: webhookData, error: webhookError } = await supabaseClient
      .from('whatsapp_configuration')
      .select('webhook_url')
      .eq('user_id', userId)
      .single()

    if (webhookData && webhookData.webhook_url && !webhookError) {
      try {
        await fetch(webhookData.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: publicUrlData.publicUrl,
            type: 'upload_document'
          })
        })
      } catch (webhookError) {
        console.error('Failed to trigger webhook:', webhookError)
        // Don't fail the upload if webhook fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, path: filePath, url: publicUrlData.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})