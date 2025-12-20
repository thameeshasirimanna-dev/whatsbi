// DEPRECATED: Replaced by Node backend
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization',
    'Access-Control-Expose-Headers': 'Content-Length,Content-Range',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Authorization header required', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response('Invalid or expired token', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    const url = new URL(req.url)
    const agentId = url.searchParams.get('agentId')

    if (!agentId) {
      return new Response('Agent ID required', { 
        status: 400, 
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
      return new Response('Agent not found or access denied', {
        status: 403,
        headers: corsHeaders
      })
    }

    const messagesTable = `${agentData.agent_prefix}_messages`;

    // Get agent's customers from dynamic table
    const dynamicCustomersTable = `${agentData.agent_prefix}_customers`;
    console.log(`Looking for customers in table: ${dynamicCustomersTable}`);
    
    const { data: agentCustomers, error: customersError } = await supabase
      .from(dynamicCustomersTable)
      .select('id')
      .eq('agent_id', parseInt(agentId));

    if (customersError) {
      console.error('Error fetching customers:', customersError);
    } else if (!agentCustomers || agentCustomers.length === 0) {
      console.log(`No customers found in ${dynamicCustomersTable} for agent ${agentId}`);
    } else {
      console.log(`Found ${agentCustomers.length} customers:`, agentCustomers.map(c => c.id));
    }

    const customerIds = agentCustomers?.map(ac => ac.id) || [];
    
    // Log the filter that will be used
    const filter = customerIds.length > 0 ? `customer_id=in.(${customerIds.join(',')})` : '*';
    console.log(`Using filter for messages: ${filter}`);

    // Set up database notification channel for dynamic messages table
    console.log(`Setting up subscription on table: ${messagesTable}`);
    const filterStr = customerIds.length > 0 ? `customer_id=in.(${customerIds.join(',')})` : '*';
    console.log(`Subscription filter: ${filterStr}`);
    
    const channel = supabase
      .channel(`messages-stream-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: messagesTable,
          filter: filterStr
        },
        async (payload) => {
          console.log('CHANGE EVENT RECEIVED:', JSON.stringify(payload, null, 2));
          
          const newMessage = payload.new
          console.log('New message payload:', newMessage);
          
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
          
          console.log('Full message details:', fullMessage);

          // Fetch customer info from dynamic customers table
          const { data: customer } = await supabase
            .from(dynamicCustomersTable)
            .select('name, phone')
            .eq('id', fullMessage.customer_id)
            .single()

          const messageData = {
            id: fullMessage.id,
            customer_id: fullMessage.customer_id,
            message: fullMessage.message, // Use 'message' to match frontend expectation
            sender_type: fullMessage.direction === 'inbound' ? 'customer' : 'agent', // Map from actual column
            timestamp: fullMessage.timestamp
          };

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
        console.log(`Subscription status for agent ${agentId} on ${messagesTable}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to messages table');
        } else if (status === 'CLOSED') {
          console.log('❌ Subscription closed unexpectedly');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Subscription channel error');
        }
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