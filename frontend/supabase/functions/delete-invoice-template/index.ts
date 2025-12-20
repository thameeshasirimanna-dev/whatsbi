// DEPRECATED: Replaced by Node backend
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { agentId, filePath } = await req.json()

    if (!agentId || !filePath) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Delete from storage
    const { error: deleteError } = await supabaseClient.storage
      .from('agent-templates')
      .remove([filePath])

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Delete failed: ' + deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      )
    }

    // Update DB
    const { data, error: dbError } = await supabaseClient.rpc('update_agent_template_path', {
      p_agent_id: agentId,
      p_template_path: null,
      p_current_user_id: req.headers.get('Authorization')?.replace('Bearer ', ''),
    })

    if (dbError) {
      return new Response(
        JSON.stringify({ error: 'DB update failed: ' + dbError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})