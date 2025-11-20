// Frontend Service - Authentication Service
// Handles authentication API calls

import api from '../utils/api';

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, token?: string, user?: object, error?: string}>}
 */
export const login = async (email, password) => {
  try {
    // Note: api.post automatically wraps in envelope structure via interceptor
    const response = await api.post('/auth/login', {
      email,
      password
    });

    console.log('[authService] Login response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.response) {
      const result = response.data.response;
      console.log('[authService] Login result:', JSON.stringify(result, null, 2));
      console.log('[authService] result.success:', result.success);
      console.log('[authService] result.token:', result.token);
      console.log('[authService] result.user:', result.user);
      
      if (result.success && result.token) {
        // Store token in localStorage
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        console.log('[authService] Login successful, token stored');
        return {
          success: true,
          token: result.token,
          user: result.user
        };
      } else {
        console.log('[authService] Login failed - no success or token:', result);
        return {
          success: false,
          error: result.error || 'Login failed'
        };
      }
    }

    console.log('[authService] Unexpected response format:', response.data);
    return {
      success: false,
      error: 'Unexpected response format'
    };
  } catch (error) {
    console.error('[authService] Login error:', error);
    console.error('[authService] Error response:', error.response?.data);
    const errorMessage = error.response?.data?.response?.error || 
                        error.message || 
                        'An error occurred during login. Please try again.';
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Optionally call logout endpoint
    await api.post('/auth/logout', {
      requester_service: 'directory_service',
      payload: {}
    });
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    // Even if API call fails, clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    return { success: true };
  }
};

/**
 * Get current user from stored token
 * @returns {object|null} User object or null
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Get stored token
 * @returns {string|null} Token or null
 */
export const getToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Validate token with server
 * @returns {Promise<{valid: boolean, user?: object}>}
 */
export const validateToken = async () => {
  try {
    const token = getToken();
    if (!token) {
      return { valid: false };
    }

    const response = await api.get('/auth/me');

    // Handle both envelope and direct response formats
    const userData = response.data?.response?.user || response.data?.user;
    
    if (userData) {
      // Update stored user
      localStorage.setItem('user', JSON.stringify(userData));
      return {
        valid: true,
        user: userData
      };
    }

    return { valid: false };
  } catch (error) {
    console.error('Token validation error:', error);
    // Don't automatically logout on validation failure
    // Let the caller decide (especially during OAuth flows)
    return { valid: false, error: error.message };
  }
};

