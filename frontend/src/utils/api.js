// API utility functions
// Handles stringified JSON request/response format

import config from '../config';
import axios from 'axios';

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
    if (token) {
      // For dummy tokens, we'll send it as Bearer token
      // The backend authMiddleware will handle it
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Skip stringification for FormData (file uploads)
    if (config.data instanceof FormData) {
      return config;
    }
    
    if (config.data && typeof config.data === 'object') {
      // Ensure request body follows the required format
      const requestBody = {
        requester_service: config.data.requester_service || 'directory_service',
        payload: config.data.payload || config.data
      };
      config.data = JSON.stringify(requestBody);
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
    return Promise.reject(error);
  }
);

export default api;

