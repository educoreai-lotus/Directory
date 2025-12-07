// API utility functions
// Handles stringified JSON request/response format

import config from '../config';
import axios from 'axios';

console.log("[DEBUG] Loaded API Base URL =", config.apiBaseUrl);

const api = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Add auth token and stringify request body
api.interceptors.request.use(
  (config) => {
    // Add Authorization header if token exists
    const token = localStorage.getItem('auth_token');
    console.log('[api] Request interceptor - URL:', config.url);
    console.log('[api] Request interceptor - Token in localStorage:', token ? `${token.substring(0, 30)}...` : 'null');
    
    if (token) {
      // For dummy tokens, we'll send it as Bearer token
      // The backend authMiddleware will handle it
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[api] Request interceptor - Authorization header added:', `Bearer ${token.substring(0, 20)}...`);
    } else {
      console.warn('[api] Request interceptor - No token found in localStorage for URL:', config.url);
    }
    
    // Skip stringification for FormData (file uploads)
    // Also remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      return config;
    }
    
    // Skip envelope structure for auth endpoints (login, logout, me)
    // These endpoints don't use the microservice envelope format
    const authEndpoints = ['/auth/login', '/auth/logout', '/auth/me'];
    const isAuthEndpoint = authEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (isAuthEndpoint) {
      // For auth endpoints, send data directly without envelope
      if (config.data && typeof config.data === 'object') {
        config.data = JSON.stringify(config.data);
      }
      return config;
    }
    
    if (config.data && typeof config.data === 'object') {
      // Ensure request body follows the required format for other endpoints
      const requestBody = {
        requester_service: config.data.requester_service || 'directory_service',
        payload: config.data.payload || config.data
      };
      config.data = requestBody;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Parse stringified response
api.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string') {
      try {
        response.data = JSON.parse(response.data);
      } catch (e) {
        console.error('Failed to parse response:', e);
      }
    }
    return response;
  },
  (error) => {
    if (error.response && typeof error.response.data === 'string') {
      try {
        error.response.data = JSON.parse(error.response.data);
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
    }
    
    // Log 401 errors for debugging
    if (error.response?.status === 401) {
      const token = localStorage.getItem('auth_token');
      console.error('[api] 401 Unauthorized error for URL:', error.config?.url);
      console.error('[api] Token in localStorage:', token ? 'present' : 'missing');
      console.error('[api] Error response:', error.response?.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;

