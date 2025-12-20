import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient, Session } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

// Supabase types
interface SupabaseAuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: any;
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY);

const LoginPage: React.FC = () => {
  // Router hook
  const navigate = useNavigate();

  // State management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // Router navigation function
  const redirectToDashboard = useCallback((role: string) => {
    if (role === 'agent') {
      navigate('/agent/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error
    setError('');
    
    // Validation
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
      // Sign in with email and password
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      if (!data.user || !data.session) {
        setError('Authentication failed');
        setLoading(false);
        return;
      }

      // Fetch user profile to check role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();

      if (userError) {
        setError('Failed to verify user role');
        setLoading(false);
        return;
      }

      // Check user role from users table
      const userRole = userData?.role;
      if (userRole === "admin" || userRole === "agent") {
        // Valid role login - redirect to appropriate dashboard
        setSession(data.session);
        redirectToDashboard(userRole);
        return;
      }

      // If role is neither admin nor agent, access denied
      setError("Access denied. Valid role required.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
      
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check for URL error parameters and existing session
  useEffect(() => {
    // Check URL for error parameters
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'no-session':
          setUrlError('Session expired. Please log in again.');
          break;
        case 'unauthorized':
          setUrlError('Access denied. Valid role required.');
          break;
        case 'user-not-found':
          setUrlError('User account not found. Please contact support.');
          break;
        case 'admin-not-found':
          setUrlError('Admin account not found. Please contact administrator.');
          break;
        default:
          setUrlError('Authentication failed. Please try again.');
      }
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Verify admin role for existing session
        supabase
          .from('users')
          .select('role')
          .eq('email', session.user?.email || '')
          .single()
          .then(({ data: userData, error }) => {
            const userRole = userData?.role;
            if (error || !userData || (userRole !== 'admin' && userRole !== 'agent')) {
              supabase.auth.signOut();
              setSession(null);
              navigate('/login?error=unauthorized');
            } else {
              redirectToDashboard(userRole);
            }
          });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        setSession(session);
        if (event === 'SIGNED_IN' && session) {
          // Verify admin role on sign in
          supabase
            .from('users')
            .select('role')
            .eq('email', session.user?.email || '')
            .single()
            .then(({ data: userData, error }) => {
              const userRole = userData?.role;
              if (error || !userData || (userRole !== 'admin' && userRole !== 'agent')) {
                supabase.auth.signOut();
                setSession(null);
                setError('Access denied. Valid role required.');
                navigate('/login?error=unauthorized');
              } else {
                redirectToDashboard(userRole);
              }
            });
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          navigate('/login');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, supabase]);

  // If already authenticated, redirect
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 mb-4 animate-pulse">
            Redirecting to dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-300 rounded-full opacity-20 animate-bounce" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-cyan-300 rounded-full opacity-20 animate-bounce" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/4 left-3/4 w-1.5 h-1.5 bg-emerald-200 rounded-full opacity-20 animate-bounce" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-cyan-200 rounded-full opacity-10 animate-ping" style={{animationDelay: '0.5s'}}></div>
      </div>

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23e5fffa%22 fill-opacity=%220.1%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>

      {/* Main login container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-r from-emerald-400/10 to-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-r from-cyan-400/10 to-emerald-500/10 rounded-full blur-3xl"></div>

        {/* Glassmorphism login card */}
        <div className="backdrop-blur-xl bg-white/95 border border-white/30 shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden transform transition-all duration-500 hover:scale-[1.02] animate-pulse-slow">
          {/* Card inner glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-cyan-500/5 rounded-3xl"></div>
          
          {/* Header section */}
          <div className="text-center relative z-10 mb-6 sm:mb-8">
            {/* WhatsApp-inspired icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl mb-4 sm:mb-6 shadow-xl border border-white/20 mx-auto">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-emerald-700 bg-clip-text text-transparent mb-2 sm:mb-3">
              WhatsApp CRM Portal
            </h2>
            <p className="text-gray-600 font-medium text-sm sm:text-base">Secure access to WhatsApp CRM</p>
          </div>

          {/* Form */}
          <form className="space-y-4 sm:space-y-6 relative z-10" onSubmit={handleSubmit}>
            {/* Floating Label Email Input */}
            <div className="relative group">
              <input
                id="email"
                name="email"
                type="email"
                className={`peer w-full px-3 sm:px-4 py-4 sm:py-5 bg-white/70 backdrop-blur-sm border-2 border-gray-200/40 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-gray-900 placeholder-transparent pr-10 sm:pr-12 shadow-sm ${
                  error ? 'border-red-400 ring-red-400/20' : ''
                } ${email ? 'ring-1 ring-emerald-500/20' : ''}`}
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <label 
                htmlFor="email"
                className={`absolute left-3 sm:left-4 top-4 text-gray-500 transition-all duration-300 ease-in-out text-sm font-medium peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-focus:-top-2 sm:peer-focus:-top-3 peer-focus:text-xs peer-focus:text-emerald-600 peer-valid:-top-2 sm:peer-valid:-top-3 peer-valid:text-xs peer-valid:text-emerald-600 peer-disabled:opacity-50 ${
                  error ? 'text-red-500' : ''
                } ${email ? '-top-2 sm:-top-3 text-xs text-emerald-600' : ''}`}
              >
                Email Address
              </label>
              <div className={`absolute right-3 sm:right-4 top-4 transition-colors duration-200 ${error ? 'text-red-500' : email ? 'text-emerald-500' : 'text-gray-400'}`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Floating Label Password Input */}
            <div className="relative group">
              <input
                id="password"
                name="password"
                type="password"
                className={`peer w-full px-3 sm:px-4 py-4 sm:py-5 bg-white/70 backdrop-blur-sm border-2 border-gray-200/40 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 text-gray-900 placeholder-transparent pr-10 sm:pr-12 shadow-sm ${
                  error ? 'border-red-400 ring-red-400/20' : ''
                } ${password ? 'ring-1 ring-emerald-500/20' : ''}`}
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <label 
                htmlFor="password"
                className={`absolute left-3 sm:left-4 top-4 text-gray-500 transition-all duration-300 ease-in-out text-sm font-medium peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-focus:-top-2 sm:peer-focus:-top-3 peer-focus:text-xs peer-focus:text-emerald-600 peer-valid:-top-2 sm:peer-valid:-top-3 peer-valid:text-xs peer-valid:text-emerald-600 peer-disabled:opacity-50 ${
                  error ? 'text-red-500' : ''
                } ${password ? '-top-2 sm:-top-3 text-xs text-emerald-600' : ''}`}
              >
                Password
              </label>
              <div className={`absolute right-3 sm:right-4 top-4 transition-colors duration-200 ${error ? 'text-red-500' : password ? 'text-emerald-500' : 'text-gray-400'}`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            {/* Enhanced Error Message */}
            {(error || urlError) && (
              <div
                className="bg-gradient-to-r from-red-50/95 to-red-100/95 border border-red-200/50 backdrop-blur-sm rounded-2xl p-3 sm:p-4 relative shadow-lg overflow-hidden animate-bounce"
                role="alert"
              >
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-red-400 to-red-600 rounded-l-2xl"></div>
                <div className="relative flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2 sm:ml-3 flex-1">
                    <p className="text-sm text-red-800 font-medium">{error || urlError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Modern Submit Button */}
            <div className="relative group">
              <button
                type="submit"
                disabled={loading || !email || !password}
                className={`relative w-full flex justify-center items-center py-3 sm:py-4 px-6 font-semibold rounded-2xl transition-all duration-300 overflow-hidden ${
                  loading || !email || !password
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-cyan-600 text-white shadow-lg hover:shadow-emerald-500/25 hover:from-emerald-700 hover:to-cyan-700 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-500/30'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${loading || !email || !password ? 'opacity-0' : ''}`}></div>
                
                <span className="relative z-10 flex items-center">
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <svg className={`mr-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 ${email && password ? 'group-hover:translate-x-1' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      <span className="text-sm sm:text-base">Enter Portal</span>
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Modern footer */}
            <div className="text-center pt-4 sm:pt-6 border-t border-gray-200/20">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Secure Admin Access</p>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              </div>
              <p className="text-xs text-gray-500">Contact support for account creation</p>
            </div>
          </form>

          {/* Bottom gradient decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-1 sm:h-2 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 rounded-b-3xl"></div>
        </div>

        {/* Version info */}
        <div className="mt-4 sm:mt-6 text-center">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 sm:p-3 border border-white/30 shadow-sm">
            <p className="text-xs text-gray-600 font-medium">💚 WhatsApp CRM Admin Portal v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;