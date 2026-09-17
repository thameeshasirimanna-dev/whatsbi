import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Check,
  ArrowUp,
} from 'lucide-react';
import { LoginShowcasePanel } from './auth';

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

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const redirectToDashboard = useCallback(
    (role: string) => {
      if (role === 'agent') {
        navigate('/agent/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    },
    [navigate]
  );

  const isValidEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
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
      if (userRole === 'admin' || userRole === 'agent') {
        localStorage.setItem('auth_token', data.token);
        setToken(data.token);
        redirectToDashboard(userRole);
        return;
      }

      setError('Access denied. Valid agent account required.');
      setLoading(false);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'no-session':
          setUrlError('Session expired. Please sign in again.');
          break;
        case 'unauthorized':
          setUrlError('Access denied. Valid credentials required.');
          break;
        case 'user-not-found':
          setUrlError('Agent account not found. Please contact support.');
          break;
        case 'admin-not-found':
          setUrlError('Account not found. Please contact your administrator.');
          break;
        default:
          setUrlError('Authentication failed. Please try again.');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const existingToken = localStorage.getItem('auth_token');
    if (existingToken) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${existingToken}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((data: BackendAuthResponse) => {
          if (data.success && data.user) {
            const userRole = data.user.role;
            if (userRole === 'admin' || userRole === 'agent') {
              setToken(existingToken);
              redirectToDashboard(userRole);
            } else {
              localStorage.removeItem('auth_token');
              navigate('/login?error=unauthorized');
            }
          } else {
            localStorage.removeItem('auth_token');
            navigate('/login?error=no-session');
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          navigate('/login?error=no-session');
        });
    }
  }, [navigate, redirectToDashboard]);

  const activeError = error || urlError;
  const isDisabled = loading || !email || !password;

  if (token) {
    return (
      <div className="min-h-screen bg-[#F4F7F4] flex items-center justify-center p-4 font-sans text-[#16281D]">
        <div className="flex items-center gap-3 bg-white border border-[#E5E7EB] px-6 py-3.5 rounded-full shadow-[0_12px_36px_rgba(20,40,24,0.08)] animate-fade-in">
          <Loader2 size={18} className="animate-spin text-[#16281D]" />
          <span className="text-xs font-bold text-[#16281D] tracking-wide">
            Redirecting to your workspace…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F4F7F4] text-[#16281D] font-sans flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden select-none">
      {/* Background Architectural Dot Matrix */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#16281D 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Application Navigation Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#16281D] text-[#9FE870] font-extrabold text-sm flex items-center justify-center shadow-sm">
            W
          </div>
          <span className="text-base font-extrabold tracking-tight text-[#16281D]">
            WhatsBi
          </span>
        </div>

        <a
          href="mailto:support@whatsbi.com"
          className="text-xs font-semibold text-[#4B5563] hover:text-[#16281D] transition-colors"
        >
          Need assistance?
        </a>
      </header>

      {/* Centerpiece Modern Split-Card Enclosure */}
      <main className="w-full max-w-5xl mx-auto my-auto py-6 relative z-10">
        <div className="w-full bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(20,40,24,0.07),0_0_0_1px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col lg:flex-row animate-fade-in">
          {/* Left Panel: Deep Forest Live Operational Showcase */}
          <LoginShowcasePanel />

          {/* Right Panel: Clean, High-Contrast Light Form Experience */}
          <div className="w-full lg:w-7/12 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            {/* Form Typographic Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#16281D] tracking-tight leading-tight m-0">
                Sign in to your workspace
              </h1>
              <p className="text-xs sm:text-[13px] text-[#4B5563] font-medium mt-1.5 leading-relaxed m-0">
                Enter your credentials to access your WhatsApp business inbox
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1.5"
                >
                  Work Email
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-[#6B7280] pointer-events-none flex items-center">
                    <Mail size={16} strokeWidth={2} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full h-11 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3.5 pl-10 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none transition-all duration-150 focus:border-[#16281D] focus:ring-2 focus:ring-[#16281D]/10 focus:bg-white"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block"
                  >
                    Password
                  </label>
                  {capsLockActive && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#D97706] animate-fade-in">
                      <ArrowUp size={12} strokeWidth={2.5} /> Caps Lock on
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-[#6B7280] pointer-events-none flex items-center">
                    <Lock size={16} strokeWidth={2} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full h-11 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3.5 pl-10 pr-10 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none transition-all duration-150 focus:border-[#16281D] focus:ring-2 focus:ring-[#16281D]/10 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-3 text-[#6B7280] hover:text-[#111827] p-1 cursor-pointer bg-transparent border-0 transition-colors flex items-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Help Row */}
              <div className="flex items-center justify-between py-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                  <div
                    className={`w-4 h-4 rounded-[4px] border transition-all flex items-center justify-center ${
                      rememberMe
                        ? 'bg-[#16281D] border-[#16281D]'
                        : 'border-[#D1D5DB] bg-white group-hover:border-[#9CA3AF]'
                    }`}
                  >
                    {rememberMe && <Check size={11} strokeWidth={3} className="text-[#9FE870]" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-xs font-medium text-[#4B5563] group-hover:text-[#111827] transition-colors">
                    Remember this device for 30 days
                  </span>
                </label>
              </div>

              {/* Error Notice */}
              {activeError && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 flex items-center gap-2.5 text-xs font-semibold text-[#DC2626] animate-fade-in">
                  <AlertCircle size={16} className="shrink-0 text-[#DC2626]" />
                  <span className="leading-snug">{activeError}</span>
                </div>
              )}

              {/* Primary Call to Action Button */}
              <button
                type="submit"
                disabled={isDisabled}
                className="group w-full h-11 sm:h-12 rounded-full font-bold text-sm bg-[#9FE870] text-[#16281D] hover:bg-[#8EE05B] active:scale-[0.99] transition-all duration-150 shadow-[0_4px_16px_rgba(159,232,112,0.3)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.4)] cursor-pointer border-0 flex items-center justify-center gap-2 mt-2 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-[#16281D]" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Continue to workspace</span>
                    <ArrowRight
                      size={16}
                      strokeWidth={2.4}
                      className="transition-transform duration-150 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Footer Trust Bar */}
            <div className="border-t border-[#E5E7EB] pt-5 mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
                <ShieldCheck size={14} className="text-[#10B981] shrink-0" />
                <span>Protected Workspace Session</span>
              </div>
              <span className="text-[10px] text-[#9CA3AF]">
                © {new Date().getFullYear()} WhatsBi Technologies
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Bottom Help Bar */}
      <footer className="w-full max-w-5xl mx-auto py-2 flex items-center justify-between text-xs text-[#6B7280] relative z-10">
        <span>WhatsBi Business Messaging Platform</span>
        <div className="flex items-center gap-4">
          <a
            href="mailto:support@whatsbi.com"
            className="hover:text-[#111827] transition-colors underline-offset-4 hover:underline"
          >
            Contact Support
          </a>
          <span>•</span>
          <span className="font-semibold text-[#16281D]">Agent Workspace</span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;


