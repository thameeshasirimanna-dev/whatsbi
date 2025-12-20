import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

serve(async (req) => {
  console.log('=== GET-AGENTS FUNCTION START ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  // CORS preflight handling
  if (req.method === "OPTIONS") {
    console.log('OPTIONS request - returning CORS preflight');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== "GET") {
    console.log('Non-GET method, returning 405');
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed"
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  try {
    // Get backend URL from environment, default to localhost for development
    const backendUrl = Deno.env.get("BACKEND_URL") || "http://localhost:8080";
    console.log('Using backend URL:', backendUrl);

    // Verify JWT and check admin permissions
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing authorization header'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const token = authHeader.substring(7);
    console.log('JWT token extracted, length:', token.length);

    // Forward the request to the backend
    const backendResponse = await fetch(`${backendUrl}/get-agents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const responseData = await backendResponse.json();

    console.log('Backend response status:', backendResponse.status);
    console.log('Backend response data:', responseData);

    return new Response(JSON.stringify(responseData), {
      status: backendResponse.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({
      success: false,
      message: "Server error: " + (err as Error).message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});