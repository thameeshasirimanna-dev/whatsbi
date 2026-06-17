import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";

interface BackendAuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token?: string;
  message?: string;
}

const FONT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  input::placeholder { color: rgba(255,255,255,0.3); }
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0px 1000px #0f2012 inset !important;
    -webkit-text-fill-color: #ffffff !important;
    caret-color: #4ade80;
    transition: background-color 5000s ease-in-out 0s;
  }
`;

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectToDashboard = useCallback(
    (role: string) => {
      if (role === "agent") {
        navigate("/agent/dashboard");
      } else {
        navigate("/admin/dashboard");
      }
    },
    [navigate]
  );

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: BackendAuthResponse = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      if (!data.user || !data.token) {
        setError('Authentication failed');
        setLoading(false);
        return;
      }

      const userRole = data.user.role;
      if (userRole === "admin" || userRole === "agent") {
        localStorage.setItem('auth_token', data.token);
        setToken(data.token);
        redirectToDashboard(userRole);
        return;
      }

      setError("Access denied. Valid role required.");
      setLoading(false);
      return;

    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    if (errorParam) {
      switch (errorParam) {
        case "no-session":
          setUrlError("Session expired. Please log in again.");
          break;
        case "unauthorized":
          setUrlError("Access denied. Valid role required.");
          break;
        case "user-not-found":
          setUrlError("User account not found. Please contact support.");
          break;
        case "admin-not-found":
          setUrlError("Admin account not found. Please contact administrator.");
          break;
        default:
          setUrlError("Authentication failed. Please try again.");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const existingToken = localStorage.getItem('auth_token');
    if (existingToken) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${existingToken}`,
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then((data: BackendAuthResponse) => {
          if (data.success && data.user) {
            const userRole = data.user.role;
            if (userRole === "admin" || userRole === "agent") {
              setToken(existingToken);
              redirectToDashboard(userRole);
            } else {
              localStorage.removeItem('auth_token');
              navigate("/login?error=unauthorized");
            }
          } else {
            localStorage.removeItem('auth_token');
            navigate("/login?error=no-session");
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          navigate("/login?error=no-session");
        });
    }
  }, [navigate, redirectToDashboard]);

  const hasError = !!(error || urlError);
  const isDisabled = loading || !email || !password;

  const getInputStyle = (focused: boolean, hasErr: boolean): React.CSSProperties => ({
    ...DM,
    width: '100%',
    background: hasErr ? 'rgba(244,63,94,0.05)' : 'rgba(255,255,255,0.04)',
    border: hasErr
      ? '1.5px solid #f43f5e'
      : focused
      ? '1.5px solid #22c55e'
      : '1.5px solid rgba(255,255,255,0.1)',
    boxShadow: hasErr
      ? '0 0 0 3px rgba(244,63,94,0.1)'
      : focused
      ? '0 0 0 3px rgba(34,197,94,0.1)'
      : 'none',
    borderRadius: '10px',
    padding: '11px 14px 11px 42px',
    fontSize: '0.875rem',
    color: '#fff',
    WebkitTextFillColor: '#fff',
    caretColor: '#4ade80',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
    boxSizing: 'border-box',
  });

  if (token) {
    return (
      <>
        <style>{FONT_CSS}</style>
        <div style={{
          ...DM,
          minHeight: '100vh',
          backgroundColor: '#0c1a0e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '2.5px solid rgba(255,255,255,0.1)',
              borderTopColor: '#4ade80',
              animation: 'spin 0.9s linear infinite',
              flexShrink: 0,
            }} />
            <span style={{
              ...SYNE,
              fontSize: '0.9375rem',
              fontWeight: 600,
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.22)',
              color: '#4ade80',
              padding: '8px 20px',
              borderRadius: '9999px',
            }}>
              Redirecting to dashboard...
            </span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{FONT_CSS}</style>
      <div style={{
        ...DM,
        minHeight: '100vh',
        backgroundColor: '#0c1a0e',
        backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(34,197,94,0.13) 0%, rgba(34,197,94,0.03) 50%, transparent 75%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Atmospheric orbs */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-80px',
          width: 320, height: 320,
          background: 'rgba(34,197,94,0.08)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', left: '-60px',
          width: 280, height: 280,
          background: 'rgba(5,150,105,0.06)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='%23ffffff'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }} />

        {/* Login card */}
        <div
          className="animate-modal"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 440,
            background: '#0f2012',
            border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.08), 0 0 40px rgba(34,197,94,0.06)',
            padding: 'clamp(28px, 5vw, 40px)',
          }}
        >

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
              boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
              </svg>
            </div>
            <div>
              <div style={{ ...SYNE, fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                WhatsBi
              </div>
              <div style={{ ...DM, fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                Sign in to your workspace
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Email field */}
            <div>
              <label htmlFor="email" style={{
                ...DM,
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 6,
              }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', color: 'rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M2 7l10 7 10-7"/>
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  disabled={loading}
                  required
                  style={getInputStyle(emailFocused, hasError)}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" style={{
                ...DM,
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 6,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', color: 'rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  disabled={loading}
                  required
                  style={{ ...getInputStyle(passwordFocused, hasError), paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: 'rgba(255,255,255,0.35)',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error banner */}
            {hasError && (
              <div style={{
                background: 'rgba(244,63,94,0.08)',
                border: '1px solid rgba(244,63,94,0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
                <span style={{ ...DM, fontSize: 13, fontWeight: 400, color: '#fda4af' }}>
                  {error || urlError}
                </span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isDisabled}
              style={{
                ...SYNE,
                width: '100%',
                padding: '13px 28px',
                borderRadius: 9999,
                border: 'none',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontSize: 15,
                fontWeight: 600,
                color: isDisabled ? 'rgba(255,255,255,0.3)' : '#fff',
                background: isDisabled
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                boxShadow: isDisabled ? 'none' : '0 4px 14px rgba(34,197,94,0.35)',
                transition: 'box-shadow 0.2s, transform 0.1s, background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(34,197,94,0.45)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(34,197,94,0.35)';
                }
              }}
              onMouseDown={(e) => {
                if (!isDisabled) {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                }
              }}
              onMouseUp={(e) => {
                if (!isDisabled) {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 18, height: 18,
                    borderRadius: '50%',
                    border: '2.5px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#4ade80',
                    animation: 'spin 0.9s linear infinite',
                    flexShrink: 0,
                  }} />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 20,
            marginTop: 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: '#22c55e',
                animation: 'pulse-dot 2s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <span style={{ ...DM, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                Secure access · Admin &amp; Agent portal
              </span>
            </div>
            <span style={{ ...DM, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              © 2025 WhatsBi
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
