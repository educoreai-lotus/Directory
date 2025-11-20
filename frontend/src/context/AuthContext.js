// Frontend Context - Authentication Context
// Provides authentication state and methods throughout the app

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // CRITICAL: Check for OAuth callback FIRST, before any token operations
        // This prevents token from being cleared during OAuth redirects
        const urlParams = new URLSearchParams(window.location.search);
        const linkedinParam = urlParams.get('linkedin');
        const githubParam = urlParams.get('github');
        const errorParam = urlParams.get('error');
        const enrichedParam = urlParams.get('enriched');
        const tokenParam = urlParams.get('token');
        
        // OAuth callback is detected by:
        // 1. Success indicators (linkedin=connected, github=connected, enriched=true)
        // 2. OR error parameter (OAuth errors still come from OAuth callback)
        // 3. OR token parameter (OAuth callbacks include token in URL)
        // This ensures we preserve token/user even when OAuth returns an error
        const isOAuthCallback = linkedinParam === 'connected' || 
                                githubParam === 'connected' || 
                                enrichedParam === 'true' ||
                                !!errorParam ||  // OAuth errors are still OAuth callbacks
                                !!tokenParam;    // Token in URL indicates OAuth callback
        
        // Check if there's an error (for logging, but still treat as OAuth callback)
        const hasOAuthError = !!errorParam;
        
        console.log('[AuthContext] Initializing auth, isOAuthCallback:', isOAuthCallback, 'hasOAuthError:', hasOAuthError);

        const storedUser = authService.getCurrentUser();
        const token = authService.getToken();
        
        // Check for recent OAuth callback flag (even if URL params are cleared)
        const oauthTimestamp = localStorage.getItem('oauth_callback_timestamp');
        const isRecentOAuth = oauthTimestamp && (Date.now() - parseInt(oauthTimestamp, 10)) < 10000; // 10 seconds window

        console.log('[AuthContext] Token exists:', !!token, 'Stored user exists:', !!storedUser, 'isRecentOAuth:', isRecentOAuth);

        // If OAuth callback OR recent OAuth (within 10 seconds), ALWAYS preserve token and user, skip validation
        // OAuth callbacks include user data in URL, so we should have it in localStorage
        if (isOAuthCallback || isRecentOAuth) {
          console.log('[AuthContext] ⚠️ OAuth callback detected - preserving token and user without validation');
          
          // Check if user was just stored from OAuth callback (might be in URL params)
          const urlParams = new URLSearchParams(window.location.search);
          const userParam = urlParams.get('user');
          
          if (userParam) {
            // User data is in URL - decode and store it
            try {
              const userDataJson = atob(userParam);
              const userData = JSON.parse(userDataJson);
              localStorage.setItem('user', JSON.stringify(userData));
              console.log('[AuthContext] User data extracted from OAuth callback URL and stored');
              setUser(userData);
              setIsAuthenticated(true);
              setLoading(false);
              return;
            } catch (error) {
              console.error('[AuthContext] Failed to decode user data from URL:', error);
            }
          }
          
          // Use stored user from localStorage (should be there from OAuth callback)
          if (token && storedUser) {
            setUser(storedUser);
            setIsAuthenticated(true);
            setLoading(false);
            return;
          } else if (storedUser) {
            // Even if token is missing, preserve user during OAuth
            console.warn('[AuthContext] Token missing during OAuth callback, but preserving user');
            setUser(storedUser);
            setIsAuthenticated(true);
            setLoading(false);
            return;
          } else {
            console.warn('[AuthContext] No token or user found during OAuth callback - waiting for OAuth callback to store data');
            // Don't clear anything during OAuth - wait a bit for OAuth callback to store data
            setTimeout(() => {
              const retryStoredUser = authService.getCurrentUser();
              const retryToken = authService.getToken();
              if (retryToken && retryStoredUser) {
                console.log('[AuthContext] User data found after delay, setting user');
                setUser(retryStoredUser);
                setIsAuthenticated(true);
              } else {
                setUser(null);
                setIsAuthenticated(false);
              }
              setLoading(false);
            }, 500);
            return;
          }
        }

        // Normal flow (not OAuth callback) - validate token
        if (token && storedUser) {
          // If recent OAuth, skip validation and use stored user
          if (isRecentOAuth) {
            console.log('[AuthContext] Recent OAuth detected, skipping validation and using stored user');
            setUser(storedUser);
            setIsAuthenticated(true);
            // Clear the OAuth flag after using it
            localStorage.removeItem('oauth_callback_timestamp');
          } else {
            // Validate token with server
            const validation = await authService.validateToken();
            if (validation.valid) {
              setUser(validation.user || storedUser);
              setIsAuthenticated(true);
            } else {
              // Token invalid, clear storage
              console.log('[AuthContext] Token validation failed, clearing storage');
              authService.logout();
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('[AuthContext] Auth initialization error:', error);
        // During OAuth callback, try to preserve stored user
        const urlParams = new URLSearchParams(window.location.search);
        const linkedinParam = urlParams.get('linkedin');
        const githubParam = urlParams.get('github');
        const errorParam = urlParams.get('error');
        const enrichedParam = urlParams.get('enriched');
        const tokenParam = urlParams.get('token');
        
        const isOAuthCallback = linkedinParam === 'connected' || 
                                githubParam === 'connected' ||
                                !!errorParam ||  // OAuth errors are still OAuth callbacks
                                enrichedParam === 'true' ||
                                !!tokenParam;    // Token in URL indicates OAuth callback
        if (isOAuthCallback) {
          const storedUser = authService.getCurrentUser();
          const token = authService.getToken();
          if (storedUser || token) {
            console.warn('[AuthContext] Error during OAuth callback, but preserving stored user/token');
            setUser(storedUser);
            setIsAuthenticated(!!storedUser);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Refresh user data from server
   */
  const refreshUser = async () => {
    try {
      // Check if we're in an OAuth callback - preserve token during OAuth flow
      const urlParams = new URLSearchParams(window.location.search);
      const linkedinParam = urlParams.get('linkedin');
      const githubParam = urlParams.get('github');
      const errorParam = urlParams.get('error');
      const enrichedParam = urlParams.get('enriched');
      const tokenParam = urlParams.get('token');
      
      // OAuth callback is detected by any of these indicators
      const isOAuthCallback = linkedinParam === 'connected' || 
                              githubParam === 'connected' || 
                              !!errorParam ||  // OAuth errors are still OAuth callbacks
                              enrichedParam === 'true' ||
                              !!tokenParam;    // Token in URL indicates OAuth callback
      
      // Also check for recent OAuth callback flag
      const oauthTimestamp = localStorage.getItem('oauth_callback_timestamp');
      const isRecentOAuth = oauthTimestamp && (Date.now() - parseInt(oauthTimestamp, 10)) < 10000; // 10 seconds window
      
      // If recent OAuth, skip validation and use stored user
      if (isRecentOAuth && !isOAuthCallback) {
        const storedUser = authService.getCurrentUser();
        const token = authService.getToken();
        if (token && storedUser) {
          console.log('[AuthContext] Recent OAuth in refreshUser, using stored user without validation');
          setUser(storedUser);
          setIsAuthenticated(true);
          return storedUser;
        }
      }

      const validation = await authService.validateToken();
      if (validation.valid && validation.user) {
        setUser(validation.user);
        setIsAuthenticated(true);
        return validation.user;
      } else {
        // Token invalid - but preserve during OAuth callbacks or recent OAuth
        if (isOAuthCallback || isRecentOAuth) {
          // During OAuth, try to restore from localStorage instead of clearing
          const storedUser = authService.getCurrentUser();
          const token = authService.getToken();
          if (token && storedUser) {
            console.warn('[AuthContext] Token validation failed during OAuth, but preserving stored user');
            setUser(storedUser);
            setIsAuthenticated(true);
            return storedUser;
          }
        }
        
        // Only clear storage if not in OAuth callback or recent OAuth
        if (!isOAuthCallback && !isRecentOAuth) {
          authService.logout();
          setUser(null);
          setIsAuthenticated(false);
        }
        return null;
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      
      // During OAuth callback, try to preserve stored user
      const urlParams = new URLSearchParams(window.location.search);
      const isOAuthCallback = urlParams.get('linkedin') === 'connected' || 
                              urlParams.get('github') === 'connected';
      const oauthTimestamp = localStorage.getItem('oauth_callback_timestamp');
      const isRecentOAuth = oauthTimestamp && (Date.now() - parseInt(oauthTimestamp, 10)) < 10000;
      
      if (isOAuthCallback || isRecentOAuth) {
        const storedUser = authService.getCurrentUser();
        const token = authService.getToken();
        if (token && storedUser) {
          console.warn('[AuthContext] Error during refresh, but preserving stored user during OAuth');
          setUser(storedUser);
          setIsAuthenticated(true);
          return storedUser;
        }
      }
      
      return null;
    }
  };

  /**
   * Login user
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      const result = await authService.login(email, password);

      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);

        // Redirect based on user type and profile status
        if (result.user.isHR) {
          // HR sees Company Profile
          navigate(`/company/${result.user.companyId}`);
        } else {
          // Regular employee
          // If both LinkedIn and GitHub are already connected, go directly to profile
          if (result.user.bothOAuthConnected) {
            // Already connected - go to profile
            navigate(`/employee/${result.user.id}`);
          } else if (result.user.isFirstLogin || result.user.profileStatus === 'basic') {
            // First login - redirect to enrichment page
            navigate(`/enrich`);
          } else if (result.user.profileStatus === 'enriched' && !result.user.isProfileApproved) {
            // Enriched but not approved - show waiting message
            navigate(`/employee/${result.user.id}?status=waiting-approval`);
          } else {
            // Approved or returning user - show profile
            navigate(`/employee/${result.user.id}`);
          }
        }

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      navigate('/');
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

