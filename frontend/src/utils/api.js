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

// Request interceptor: Stringify request body
api.interceptors.request.use(
  (config) => {
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

