import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range',
    'Access-Control-Expose-Headers': 'Content-Length,Content-Range',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const agentId = url.searchParams.get('agentId')
    const token = url.searchParams.get('token')

    if (!agentId) {
      return new Response('Agent ID required', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Verify JWT token
    if (!token) {
      return new Response('Authorization token required', {
        status: 401,
        headers: corsHeaders
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response('Invalid or expired token', {
        status: 401,
        headers: corsHeaders
      })
    }

    // Verify agent ownership
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('agent_prefix, id')
      .eq('id', parseInt(agentId))
      .eq('user_id', user.id)
      .single();

    if (agentError || !agentData) {
      return new Response('Agent not found', {
        status: 404,
        headers: corsHeaders
      })
    }

    const messagesTable = `${agentData.agent_prefix}_messages`;

    // Get agent's customers from base table
    const { data: agentCustomers, error: customersError } = await supabase
      .from('agent_customers')
      .select('customer_id')
      .eq('agent_id', parseInt(agentId));

    if (customersError || !agentCustomers || agentCustomers.length === 0) {
      console.log('No customers found for agent, but continuing to monitor messages table');
    }

    const customerIds = agentCustomers?.map(ac => ac.customer_id) || [];

    // Set up database notification channel for dynamic messages table
    const channel = supabase
      .channel(`messages-stream-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: messagesTable,
          filter: customerIds.length > 0 ? `customer_id=in.(${customerIds.join(',')})` : '*'
        },
        async (payload) => {
          const newMessage = payload.new
          
          // Fetch full message details from dynamic table
          const { data: fullMessage, error: messageError } = await supabase
            .from(messagesTable)
            .select('*')
            .eq('id', newMessage.id)
            .single()

          if (messageError || !fullMessage) {
            console.error('Error fetching message from dynamic table:', messageError)
            return
          }

          // Fetch customer info from base customers table
          const { data: customer } = await supabase
            .from('customers')
            .select('name, phone')
            .eq('id', fullMessage.customer_id)
            .single()

          const messageData = {
            id: fullMessage.id,
            customer_id: fullMessage.customer_id,
            message_text: fullMessage.message_text,
            sender_type: fullMessage.sender_type,
            message_type: fullMessage.message_type,
            whatsapp_message_id: fullMessage.whatsapp_message_id,
            timestamp: fullMessage.timestamp,
            customer_name: customer?.name || 'Unknown',
            customer_phone: customer?.phone || 'Unknown'
          }

          // Send via SSE
          try {
            const encoder = new TextEncoder()
            const data = encoder.encode(`data: ${JSON.stringify(messageData)}\n\n`)
            await Deno.stdout.write(data)
          } catch (error) {
            console.error('Error sending SSE data:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log(`Stream subscription status for agent ${agentId}:`, status)
      })

    // Keep connection alive with heartbeat
    const encoder = new TextEncoder()
    const heartBeatInterval = setInterval(async () => {
      try {
        const heartBeat = encoder.encode(':\n\n')
        await Deno.stdout.write(heartBeat)
      } catch (error) {
        console.error('Heartbeat error:', error)
        clearInterval(heartBeatInterval)
      }
    }, 15000)

    // Set up SSE response
    const headers = new Headers(corsHeaders)
    headers.set('Content-Type', 'text/event-stream')
    headers.set('Cache-Control', 'no-cache')
    headers.set('Connection', 'keep-alive')
    headers.set('X-Accel-Buffering', 'no') // Disable nginx buffering if used

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        const initialData = encoder.encode(`data: ${JSON.stringify({ type: 'connected', agentId: parseInt(agentId) })}\n\n`)
        await Deno.stdout.write(initialData)

        // Cleanup on stream end
        return () => {
          clearInterval(heartBeatInterval)
          channel.unsubscribe()
          console.log(`Stream closed for agent ${agentId}`)
        }
      },
      cancel() {
        clearInterval(heartBeatInterval)
        channel.unsubscribe()
      }
    })

    return new Response(stream, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('SSE stream error:', error)
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})