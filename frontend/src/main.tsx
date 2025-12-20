import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import LandingPage from "./components/LandingPage.tsx";
import LoginPage from "./components/LoginPage.tsx";
import AdminDashboard from "./components/AdminDashboard.tsx";
import AgentRoutes from "./components/agent/shared/AgentRoutes.tsx";
import AgentAuthGuard from "./components/agent/shared/AgentAuthGuard.tsx";
import "./index.css";

// Supabase client (same as in AdminLoginPage for consistency)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://itvaqysqzdmwhucllktz.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dmFxeXNxemRtd2h1Y2xsa3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODI1MDAsImV4cCI6MjA3MzE1ODUwMH0.5uYF5Xm1Og-QkgdQdT_BrejxlIFMm1xYrPn7pXqtEpQ";
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Make supabase client available globally for legacy components
declare global {
  interface Window {
    supabase: SupabaseClient;
  }
}
window.supabase = supabase;

ReactDOM.createRoot(document.getElementById("root")!).render(
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Protected Agent routes - require authentication */}
        <Route
          path="/agent/*"
          element={
            <AgentAuthGuard>
              <AgentRoutes />
            </AgentAuthGuard>
          }
        />


        {/* Catch-all route for 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  404 - Page Not Found
                </h1>
                <a href="/" className="text-indigo-600 hover:text-indigo-500">
                  Go back to Home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
);
