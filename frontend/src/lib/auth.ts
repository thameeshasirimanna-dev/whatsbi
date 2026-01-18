// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

// Get token from localStorage
export const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Set token in localStorage
export const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// Remove token from localStorage
export const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// Login function
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data: AuthResponse = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Invalid email or password'
      };
    }

    if (!data.user || !data.token) {
      return {
        success: false,
        message: 'Authentication failed'
      };
    }

    // Store token
    setToken(data.token);

    return data;
  } catch (err) {
    console.error('Login error:', err);
    return {
      success: false,
      message: 'An unexpected error occurred'
    };
  }
};

// Logout function
export const logout = (): void => {
  removeToken();
};

// Get current user
export const getCurrentUser = async (): Promise<AuthResponse> => {
  try {
    const token = getToken();
    if (!token) {
      return {
        success: false,
        message: 'No token found'
      };
    }

    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: AuthResponse = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Authentication failed'
      };
    }

    return data;
  } catch (err) {
    console.error('Get current user error:', err);
    return {
      success: false,
      message: 'An unexpected error occurred'
    };
  }
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const result = await getCurrentUser();
  return result.success && !!result.user;
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};