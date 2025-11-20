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
        // Check if we're coming from OAuth callback - preserve token during OAuth flow
        const urlParams = new URLSearchParams(window.location.search);
        const isOAuthCallback = urlParams.get('linkedin') === 'connected' || 
                                urlParams.get('github') === 'connected' || 
                                urlParams.get('error') ||
                                urlParams.get('enriched') === 'true';

        const storedUser = authService.getCurrentUser();
        const token = authService.getToken();

        if (token && storedUser) {
          // If OAuth callback, use stored user immediately without validation
          // This prevents token loss during OAuth redirects
          if (isOAuthCallback) {
            console.log('[AuthContext] OAuth callback detected, using stored user without validation');
            setUser(storedUser);
            setIsAuthenticated(true);
            setLoading(false);
            return;
          }

          // Validate token with server (only if not OAuth callback)
          const validation = await authService.validateToken();
          if (validation.valid) {
            setUser(validation.user || storedUser);
            setIsAuthenticated(true);
          } else {
            // Token invalid, clear storage (but not during OAuth flow)
            if (!isOAuthCallback) {
              authService.logout();
              setUser(null);
              setIsAuthenticated(false);
            } else {
              // During OAuth, keep the stored user even if validation fails
              console.warn('[AuthContext] Token validation failed during OAuth, but preserving session');
              setUser(storedUser);
              setIsAuthenticated(true);
            }
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // During OAuth callback, try to preserve stored user
        const urlParams = new URLSearchParams(window.location.search);
        const isOAuthCallback = urlParams.get('linkedin') === 'connected' || 
                                urlParams.get('github') === 'connected';
        if (isOAuthCallback) {
          const storedUser = authService.getCurrentUser();
          if (storedUser) {
            console.warn('[AuthContext] Error during OAuth callback, but preserving stored user');
            setUser(storedUser);
            setIsAuthenticated(true);
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
      const validation = await authService.validateToken();
      if (validation.valid && validation.user) {
        setUser(validation.user);
        setIsAuthenticated(true);
        return validation.user;
      } else {
        // Token invalid, clear storage
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
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

