// Authentication context — nAuth + Coordinator + Directory JWT (/auth/me) only.

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAccessToken, getAccessToken, clearAccessToken } from '../auth/accessTokenStore';
import { redirectToNAuthLogin } from '../utils/nauthRedirect';

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const json = atob(b64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

async function fetchMeUser() {
  const meResp = await api.get('/auth/me');
  return meResp?.data?.response?.user || meResp?.data?.user || null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  const runPostLoginRouting = useCallback(
    (meUser) => {
      if (!meUser) return;
      const path = window.location.pathname;
      if (path !== '/' && path !== '/login') {
        return;
      }
      const activeToken = getAccessToken();
      const claims = decodeJwtPayload(activeToken) || {};
      const directoryUserId = meUser.directoryUserId || meUser.id;
      const organizationId =
        meUser.organizationId || meUser.companyId || meUser.company_id;
      const primaryRole = String(
        claims.primaryRole ??
          claims.primary_role ??
          meUser.primaryRole ??
          meUser.primary_role ??
          ''
      ).toUpperCase();
      const isSystemAdmin =
        claims.isSystemAdmin === true ||
        claims.is_system_admin === true ||
        meUser.isSystemAdmin === true ||
        meUser.is_system_admin === true ||
        primaryRole === 'DIRECTORY_ADMIN';
      const isHR =
        meUser.isHR === true || claims.isHR === true || claims.is_hr === true;
      const hasValidOrganizationId =
        organizationId != null &&
        String(organizationId).trim() !== '' &&
        String(organizationId) !== 'undefined';

      let target = null;
      if (isSystemAdmin) {
        target = '/admin/dashboard';
      } else if (isHR && hasValidOrganizationId) {
        target = `/company/${organizationId}`;
      } else if (directoryUserId) {
        target = `/employee/${directoryUserId}`;
      }

      if (target && target !== path) {
        navigate(target, { replace: true });
      }
    },
    [navigate]
  );

  useEffect(() => {
    const initAuth = async () => {
      if (process.env.REACT_APP_AUTH_MODE !== 'nauth') {
        console.error(
          '[AuthContext] REACT_APP_AUTH_MODE must be "nauth" for this build.'
        );
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const nAuthFrontendUrl = process.env.REACT_APP_NAUTH_FRONTEND_URL;
      const coordinatorBaseUrl =
        process.env.REACT_APP_COORDINATOR_BASE_URL ||
        process.env.REACT_APP_COORDINATOR_URL ||
        'https://coordinator-production-6004.up.railway.app';
      const coordinatorEndpoint =
        process.env.REACT_APP_COORDINATOR_ENDPOINT || '/request';

      try {
        const hash = window.location.hash || '';
        const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
        const tokenFromHash = hashParams.get('access_token') || '';
        const existingToken = getAccessToken();
        let tokenForValidation = '';

        if (tokenFromHash) {
          setAccessToken(tokenFromHash);
          tokenForValidation = tokenFromHash;
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        } else if (existingToken) {
          tokenForValidation = existingToken;
        } else {
          clearAccessToken();
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          if (nAuthFrontendUrl) {
            window.location.href = `${nAuthFrontendUrl.replace(/\/$/, '')}/login`;
          }
          return;
        }

        let coordinatorResp;
        let coordinatorData = {};
        try {
          coordinatorResp = await fetch(`${coordinatorBaseUrl}${coordinatorEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requester_service: 'Directory',
              payload: {
                action:
                  'Route this request to nAuth service only for access token validation and session continuity decision.',
                access_token: tokenForValidation
              },
              response: {
                valid: false,
                reason: '',
                auth_state: '',
                directory_user_id: '',
                organization_id: '',
                new_access_token: ''
              }
            })
          });

          if (!coordinatorResp.ok) {
            throw new Error('Coordinator validation failed');
          }
          coordinatorData = await coordinatorResp.json().catch(() => ({}));
        } catch {
          clearAccessToken();
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          if (nAuthFrontendUrl) {
            window.location.href = `${nAuthFrontendUrl.replace(/\/$/, '')}/login`;
          }
          return;
        }

        const coordinatorResponse = coordinatorData?.response || {};
        if (coordinatorResponse.valid !== true) {
          clearAccessToken();
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          if (nAuthFrontendUrl) {
            window.location.href = `${nAuthFrontendUrl.replace(/\/$/, '')}/login`;
          }
          return;
        }

        if (coordinatorResponse.new_access_token) {
          setAccessToken(coordinatorResponse.new_access_token);
        }

        const meUser = await fetchMeUser();
        setUser(meUser);
        setIsAuthenticated(!!meUser);
        setLoading(false);
        runPostLoginRouting(meUser);
      } catch (e) {
        console.error('[AuthContext] initAuth error:', e);
        clearAccessToken();
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    };

    initAuth();
  }, [runPostLoginRouting]);

  const refreshUser = useCallback(async () => {
    try {
      if (!getAccessToken()) {
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }
      const meUser = await fetchMeUser();
      setUser(meUser);
      setIsAuthenticated(!!meUser);
      return meUser;
    } catch (e) {
      console.error('[AuthContext] refreshUser error:', e);
      return null;
    }
  }, []);

  const login = async () => {
    redirectToNAuthLogin();
    return { success: false, error: 'Use nAuth to sign in.' };
  };

  const logout = async (options = {}) => {
    clearAccessToken();
    setUser(null);
    setIsAuthenticated(false);
    if (options?.redirect !== false) {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
