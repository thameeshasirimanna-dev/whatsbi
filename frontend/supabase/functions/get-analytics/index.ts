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
      // Supabase URL and service role key from environment variables
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Parse JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !authUser) {
      throw new Error('Not authenticated')
    }

    // Fetch agent data
    const { data: agentData, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, agent_prefix')
      .eq('user_id', authUser.id)
      .single()

    if (agentError || !agentData) {
      throw new Error('Agent not found')
    }

    const { id: agentId, agent_prefix: agentPrefix } = agentData

    const customersTable = `${agentPrefix}_customers`
    const ordersTable = `${agentPrefix}_orders`
    const appointmentsTable = `${agentPrefix}_appointments`

    // Note: Assuming invoices are in a global table with agent_id filter
    // If dynamic, adjust accordingly: const invoicesTable = `${agentPrefix}_invoices`

    // Total customers
    let totalCustomers = 0
    try {
      const { count } = await supabaseClient
        .from(customersTable)
        .select('*', { count: 'exact', head: true })
      totalCustomers = count || 0
    } catch (e) {
      console.warn(`Customers table ${customersTable} not found, defaulting to 0`)
    }

    // Total orders
    let totalOrders = 0
    try {
      const { count } = await supabaseClient
        .from(ordersTable)
        .select('*', { count: 'exact', head: true })
      totalOrders = count || 0
    } catch (e) {
      console.warn(`Orders table ${ordersTable} not found, defaulting to 0`)
    }

    // Total revenue from global invoices table
    let totalRevenue = 0
    try {
      const { data: invoices } = await supabaseClient
        .from('invoices')
        .select('total_amount')
        .eq('agent_id', agentId)
      totalRevenue = (invoices || []).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0)
    } catch (e) {
      console.warn('Invoices query failed, defaulting revenue to 0')
    }

    // Pending orders
    let pendingOrders = 0
    try {
      const { count } = await supabaseClient
        .from(ordersTable)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      pendingOrders = count || 0
    } catch (e) {
      console.warn('Pending orders query failed, defaulting to 0')
    }

    // Completed orders
    let completedOrders = 0
    try {
      const { count } = await supabaseClient
        .from(ordersTable)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
      completedOrders = count || 0
    } catch (e) {
      console.warn('Completed orders query failed, defaulting to 0')
    }

    // Total appointments
    let totalAppointments = 0
    try {
      const { count } = await supabaseClient
        .from(appointmentsTable)
        .select('*', { count: 'exact', head: true })
      totalAppointments = count || 0
    } catch (e) {
      console.warn(`Appointments table ${appointmentsTable} not found, defaulting to 0`)
    }

    // Upcoming appointments
    let upcomingAppointments = 0
    try {
      const now = new Date().toISOString()
      const { count } = await supabaseClient
        .from(appointmentsTable)
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', now)
        .eq('status', 'pending')
      upcomingAppointments = count || 0
    } catch (e) {
      console.warn('Upcoming appointments query failed, defaulting to 0')
    }

    // Fetch orders for aggregation (assuming small dataset)
    let monthlyOrders: { month: string; count: number }[] = []
    let orderStatuses: { status: string; count: number }[] = []
    try {
      const { data: ordersData } = await supabaseClient
        .from(ordersTable)
        .select('created_at, status')
      if (ordersData && ordersData.length > 0) {
        const now = new Date()
        const monthCounts = new Map<string, number>()
        const statusCounts = new Map<string, number>()

        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthKey = d.toISOString().slice(0, 7)
          monthCounts.set(monthKey, 0)
        }

        ordersData.forEach((order: any) => {
          if (order.created_at) {
            const date = new Date(order.created_at)
            const monthKey = date.toISOString().slice(0, 7)
            monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1)

            const status = order.status || 'unknown'
            statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
          }
        })

        // Fill missing months with 0
        monthlyOrders = Array.from(monthCounts.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, count]) => ({ month, count }))

        orderStatuses = Array.from(statusCounts.entries())
          .map(([status, count]) => ({ status, count }))
      }
    } catch (e) {
      console.warn('Orders aggregation failed, defaulting to empty')
    }

    // Fetch invoices for revenue aggregation
    let monthlyRevenue: { month: string; revenue: number }[] = []
    try {
      const { data: invoicesData } = await supabaseClient
        .from('invoices')
        .select('created_at, total_amount')
        .eq('agent_id', agentId)
      if (invoicesData && invoicesData.length > 0) {
        const now = new Date()
        const monthRevenue = new Map<string, number>()

        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthKey = d.toISOString().slice(0, 7)
          monthRevenue.set(monthKey, 0)
        }

        invoicesData.forEach((inv: any) => {
          if (inv.created_at && inv.total_amount) {
            const date = new Date(inv.created_at)
            const monthKey = date.toISOString().slice(0, 7)
            monthRevenue.set(monthKey, (monthRevenue.get(monthKey) || 0) + inv.total_amount)
          }
        })

        // Fill missing months with 0
        monthlyRevenue = Array.from(monthRevenue.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, revenue]) => ({ month, revenue }))
      }
    } catch (e) {
      console.warn('Invoices aggregation failed, defaulting to empty')
    }

    const analytics = {
      totalCustomers,
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      totalAppointments,
      upcomingAppointments,
      monthlyOrders,
      monthlyRevenue,
      orderStatuses,
    }

    return new Response(
      JSON.stringify({ success: true, analytics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('Error in get-analytics:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})