// API utility functions
// Handles stringified JSON request/response format

import config from '../config';
import axios from 'axios';

console.log("[DEBUG] Loaded API Base URL =", config.apiBaseUrl);

const api = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 180000 // 3 minutes timeout - allows Skills Engine to process data
});

// Request interceptor: Add auth token and wrap request body
api.interceptors.request.use(
  (config) => {
    // Log initial state
    console.log('[api] Request interceptor START - URL:', config.url);
    console.log('[api] Request interceptor - Method:', config.method);
    console.log('[api] Request interceptor - config.data BEFORE modifications:', config.data);
    console.log('[api] Request interceptor - typeof config.data:', typeof config.data);
    
    // Log the final resolved URL (baseURL + relative URL)
    const finalResolvedURL = (config.baseURL || api.defaults.baseURL || '') + (config.url || '');
    console.log('[api] Final resolved URL =', finalResolvedURL);
    console.log('[api] config.baseURL =', config.baseURL);
    console.log('[api] api.defaults.baseURL =', api.defaults.baseURL);
    console.log('[api] config.url =', config.url);
    
    // Add Authorization header if token exists
    // In dummy mode, inject dummy token if missing
    let token = localStorage.getItem('auth_token');
    const isDummyMode = process.env.REACT_APP_AUTH_MODE === 'dummy' || !process.env.REACT_APP_AUTH_MODE;
    
    if (isDummyMode && !token) {
      // In dummy mode, if no token exists, create and store a dummy token
      token = 'dummy-token';
      localStorage.setItem('auth_token', token);
      console.log('[api] Request interceptor - Dummy mode: Created and stored dummy token');
    }
    
    console.log('[api] Request interceptor - Token in localStorage:', token ? `${token.substring(0, 30)}...` : 'null');
    
    if (token) {
      // For dummy tokens, we'll send it as Bearer token
      // The backend authMiddleware will handle it
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[api] Request interceptor - Authorization header added:', `Bearer ${token.substring(0, 20)}...`);
    } else {
      console.warn('[api] Request interceptor - No token found in localStorage for URL:', config.url);
    }
    
    // RULE 5: Skip stringification for FormData (file uploads)
    // Also remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log("[api] FINAL outgoing config (FormData):", {
        url: config.url,
        method: config.method,
        body: '[FormData]',
        headers: config.headers
      });
      return config;
    }
    
    // RULE 5: Skip envelope structure for auth endpoints (login, logout, me)
    // These endpoints don't use the microservice envelope format
    const authEndpoints = ['/auth/login', '/auth/logout', '/auth/me'];
    const isAuthEndpoint = authEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (isAuthEndpoint) {
      // For auth endpoints, send data directly without envelope
      if (config.data && typeof config.data === 'object') {
        config.data = JSON.stringify(config.data);
      }
      console.log("[api] FINAL outgoing config (auth endpoint):", {
        url: config.url,
        method: config.method,
        body: config.data,
        headers: config.headers
      });
      return config;
    }
    
    // RULE A: Never replace config.data with undefined
    // If config.data is undefined/null, do NOT wrap it and do NOT return early
    // Allow axios to send undefined bodies for GET requests
    // For POST requests, we should have data, but we won't block the request
    
    let envelopeWrappingApplied = false;
    
    // RULE B: Wrap the body ONLY IF:
    // - the request is NOT an auth endpoint (already handled above)
    // - the request is NOT FormData (already handled above)
    // - config.data is a plain object
    // - config.data does NOT already contain requester_service or payload
    // SPECIAL CASE: Certain endpoints should NOT be wrapped (e.g., internal Directory endpoints)
    const skipEnvelopeEndpoints = [
      '/enrollments/career-path' // Frontend should send plain JSON to Directory backend for enrollment
    ];
    const shouldSkipEnvelope = skipEnvelopeEndpoints.some(endpoint => config.url?.includes(endpoint));

    if (
      config.data !== undefined &&
      config.data !== null &&
      typeof config.data === 'object' &&
      !Array.isArray(config.data) &&
      !(config.data instanceof FormData) &&
      !config.data.requester_service &&
      !config.data.payload &&
      !shouldSkipEnvelope
    ) {
      console.log('[api] Applying envelope wrapping to config.data');
      config.data = {
        requester_service: "directory-service",
        payload: config.data
      };
      envelopeWrappingApplied = true;
    } else {
      console.log('[api] Skipping envelope wrapping:', {
        isUndefined: config.data === undefined,
        isNull: config.data === null,
        type: typeof config.data,
        isArray: Array.isArray(config.data),
        hasRequesterService: config.data?.requester_service,
        hasPayload: config.data?.payload,
        shouldSkipEnvelope
      });
    }
    
    // RULE D: After all interceptor logic, log final config
    // Calculate final resolved URL again (in case baseURL was modified, though it shouldn't be)
    const finalURLAfterInterceptor = (config.baseURL || api.defaults.baseURL || '') + (config.url || '');
    console.log("[api] FINAL outgoing config:", {
      url: config.url,
      baseURL: config.baseURL || api.defaults.baseURL,
      finalResolvedURL: finalURLAfterInterceptor,
      method: config.method,
      body: config.data,
      headers: config.headers,
      envelopeWrappingApplied: envelopeWrappingApplied
    });
    
    // Verify baseURL was not modified
    if (config.baseURL && config.baseURL !== api.defaults.baseURL) {
      console.warn('[api] WARNING: config.baseURL was modified in interceptor!', {
        original: api.defaults.baseURL,
        modified: config.baseURL
      });
    }
    
    return config;
  },
  (error) => {
    console.error('[api] Request interceptor error:', error);
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

