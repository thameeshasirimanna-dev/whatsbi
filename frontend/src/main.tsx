import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LandingPage from "./components/LandingPage.tsx";
import LoginPage from "./components/LoginPage.tsx";
import AdminDashboard from "./components/AdminDashboard.tsx";
import AgentRoutes from "./components/agent/shared/AgentRoutes.tsx";
import AgentAuthGuard from "./components/agent/shared/AgentAuthGuard.tsx";
import "./index.css";

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
