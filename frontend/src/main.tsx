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
import StyleGuidePage from "./components/StyleGuidePage.tsx";
import AgentRoutes from "./components/agent/shared/AgentRoutes.tsx";
import AgentAuthGuard from "./components/agent/shared/AgentAuthGuard.tsx";
import { DialogProvider } from "./components/agent/shared/DialogProvider.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <DialogProvider>
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/style-guide" element={<StyleGuidePage />} />

        <Route
          path="/agent/*"
          element={
            <AgentAuthGuard>
              <AgentRoutes />
            </AgentAuthGuard>
          }
        />

        <Route
          path="*"
          element={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf8' }}>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, color: '#0c1a0e', marginBottom: 12 }}>404 — Page Not Found</h1>
                <a href="/" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#059669' }}>Go back to Home</a>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  </DialogProvider>
);
