import React, { useState, useEffect } from 'react';
import { Navigate } from "react-router-dom";

interface AgentAuthGuardProps {
  children: React.ReactNode;
}

const AgentAuthGuard: React.FC<AgentAuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Validate token with backend
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        setIsAuthenticated(response.ok && data.success && !!data.user);
      } catch (error) {
        console.error('AgentAuthGuard: Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);


  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf8' }}>
        <style>{`@keyframes aag-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '3px solid #ebebeb', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'aag-spin 0.8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#71717a', margin: 0 }}>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AgentAuthGuard;