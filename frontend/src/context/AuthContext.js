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
        const storedUser = authService.getCurrentUser();
        const token = authService.getToken();

        if (token && storedUser) {
          // Validate token with server
          const validation = await authService.validateToken();
          if (validation.valid) {
            setUser(validation.user);
            setIsAuthenticated(true);
          } else {
            // Token invalid, clear storage
            authService.logout();
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

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
          if (result.user.isFirstLogin || result.user.profileStatus === 'basic') {
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
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

