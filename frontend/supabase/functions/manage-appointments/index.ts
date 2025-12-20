import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    console.log('Authenticated user id:', user.id)

    // Get agent information
    const { data: agentData, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, agent_prefix')
      .eq('user_id', user.id)
      .single()

    if (agentError || !agentData) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    const agentPrefix = agentData.agent_prefix
    console.log('Agent prefix:', agentPrefix)

    const method = req.method
    const url = new URL(req.url)

    let parsedBody = null;
    if (method === 'POST' || method === 'PUT') {
      try {
        parsedBody = await req.json();
      } catch (e) {
        console.error('JSON parse error:', e);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    }

    switch (method) {
      case 'GET': {
        // Get appointments
        const customerId = url.searchParams.get('customer_id') ? parseInt(url.searchParams.get('customer_id')!) : undefined
        const status = url.searchParams.get('status') || undefined
        const startDate = url.searchParams.get('start_date') || undefined
        const endDate = url.searchParams.get('end_date') || undefined
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        console.log('Appointments fetch params:', { customerId, status, startDate, endDate, limit, offset, agentPrefix })

        // Call the get_appointments RPC
        const { data: appointments, error: getError } = await supabaseClient.rpc('get_appointments', {
          p_agent_prefix: agentPrefix,
          p_customer_id: customerId,
          p_status: status,
          p_start_date: startDate ? new Date(startDate).toISOString() : null,
          p_end_date: endDate ? new Date(endDate).toISOString() : null,
          p_limit: limit,
          p_offset: offset
        })

        if (getError) {
          console.error('get_appointments RPC error:', JSON.stringify(getError))
          return new Response(
            JSON.stringify({ error: getError.message + ' - Details logged' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        return new Response(
          JSON.stringify({ appointments }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      case 'POST': {
        const body = parsedBody
        const { customer_id, title, appointment_date, duration_minutes, status, notes } = body || {}

        // Validate required fields
        if (!customer_id || typeof customer_id !== 'number' || customer_id < 1) {
          return new Response(
            JSON.stringify({ error: 'Customer ID is required and must be a positive integer' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        if (!title || typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 100) {
          return new Response(
            JSON.stringify({ error: 'Title is required and must be 1-100 characters' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        if (!appointment_date) {
          return new Response(
            JSON.stringify({ error: 'Appointment date is required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        const parsedDate = new Date(appointment_date);
        if (isNaN(parsedDate.getTime()) || parsedDate < new Date()) {
          return new Response(
            JSON.stringify({ error: 'Appointment date must be a valid future date' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        if (duration_minutes !== undefined && (typeof duration_minutes !== 'number' || duration_minutes <= 0 || duration_minutes > 1440)) {
          return new Response(
            JSON.stringify({ error: 'Duration must be between 1 and 1440 minutes' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        if (status && !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
          return new Response(
            JSON.stringify({ error: 'Invalid status' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        console.log('Calling create_appointment RPC with params:', {
          p_agent_prefix: agentPrefix,
          p_customer_id: customer_id,
          p_title: title.trim(),
          p_appointment_date: parsedDate.toISOString(),
          p_duration_minutes: duration_minutes || 30,
          p_status: status || 'pending',
          p_notes: notes || null
        })

        // Call the create_appointment function
        const { data: result, error: createError } = await supabaseClient.rpc('create_appointment', {
          p_agent_prefix: agentPrefix,
          p_customer_id: customer_id,
          p_title: title.trim(),
          p_appointment_date: parsedDate.toISOString(),
          p_duration_minutes: duration_minutes || 30,
          p_status: status || 'pending',
          p_notes: notes || null
        })

        if (createError) {
          console.error('create_appointment RPC error:', JSON.stringify(createError))
          return new Response(
            JSON.stringify({ error: createError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        // RPC returns array, get first element
        const createResult = result && result.length > 0 ? result[0] : null;
        if (!createResult) {
          return new Response(
            JSON.stringify({ error: 'Unexpected RPC response: no data returned' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        return new Response(
          JSON.stringify({ success: createResult.success, appointment_id: createResult.appointment_id, message: createResult.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: createResult.success ? 201 : 400
          }
        )
      }

      case 'PUT': {
        const body = parsedBody
        const { id, title, appointment_date, duration_minutes, status, notes } = body || {}

        if (!id || typeof id !== 'number' || id < 1) {
          return new Response(
            JSON.stringify({ error: 'Appointment ID is required and must be a positive integer' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        // Validate optional fields
        if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 100)) {
          return new Response(
            JSON.stringify({ error: 'Title must be 1-100 characters' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        if (appointment_date !== undefined) {
          const parsedDate = new Date(appointment_date);
          if (isNaN(parsedDate.getTime()) || parsedDate < new Date()) {
            return new Response(
              JSON.stringify({ error: 'Appointment date must be a valid future date' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            )
          }
        }

        if (duration_minutes !== undefined && (typeof duration_minutes !== 'number' || duration_minutes <= 0 || duration_minutes > 1440)) {
          return new Response(
            JSON.stringify({ error: 'Duration must be between 1 and 1440 minutes' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        if (status !== undefined && !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
          return new Response(
            JSON.stringify({ error: 'Invalid status' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        console.log('Calling update_appointment RPC with params:', {
          p_agent_prefix: agentPrefix,
          p_appointment_id: id,
          p_title: title ? title.trim() : null,
          p_appointment_date: appointment_date ? new Date(appointment_date).toISOString() : null,
          p_duration_minutes: duration_minutes !== undefined ? duration_minutes : null,
          p_status: status || null,
          p_notes: notes || null
        })

        // Call the update_appointment function
        const { data: result, error: updateError } = await supabaseClient.rpc('update_appointment', {
          p_agent_prefix: agentPrefix,
          p_appointment_id: id,
          p_title: title ? title.trim() : null,
          p_appointment_date: appointment_date ? new Date(appointment_date).toISOString() : null,
          p_duration_minutes: duration_minutes !== undefined ? duration_minutes : null,
          p_status: status || null,
          p_notes: notes || null
        })

        if (updateError) {
          console.error('update_appointment RPC error:', JSON.stringify(updateError))
          return new Response(
            JSON.stringify({ error: updateError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        // RPC returns array, get first element
        const updateResult = result && result.length > 0 ? result[0] : null;
        if (!updateResult) {
          return new Response(
            JSON.stringify({ error: 'Unexpected RPC response: no data returned' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        return new Response(
          JSON.stringify({ success: updateResult.success, message: updateResult.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: updateResult.success ? 200 : 400
          }
        )
      }

      case 'DELETE': {
        const id = url.searchParams.get('id')

        if (!id || typeof id !== 'string' || !id.match(/^\d+$/)) {
          return new Response(
            JSON.stringify({ error: 'Valid ID is required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }

        const appointmentId = parseInt(id)

        console.log('Calling delete_appointment RPC with params:', {
          p_agent_prefix: agentPrefix,
          p_appointment_id: appointmentId
        })

        // Call the delete_appointment function
        const { data: result, error: deleteError } = await supabaseClient.rpc('delete_appointment', {
          p_agent_prefix: agentPrefix,
          p_appointment_id: appointmentId
        })

        if (deleteError) {
          console.error('delete_appointment RPC error:', JSON.stringify(deleteError))
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        // RPC returns array, get first element
        const deleteResult = result && result.length > 0 ? result[0] : null;
        if (!deleteResult) {
          return new Response(
            JSON.stringify({ error: 'Unexpected RPC response: no data returned' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        return new Response(
          JSON.stringify({ success: deleteResult.success, message: deleteResult.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: deleteResult.success ? 200 : 400
          }
        )
      }

      default: {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405
          }
        )
      }
    }
  } catch (error) {
    console.error('Appointment management error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})