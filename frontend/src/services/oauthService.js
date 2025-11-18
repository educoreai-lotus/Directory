// Frontend Service - OAuth Service
// Handles OAuth API calls

import api from '../utils/api';

/**
 * Get LinkedIn OAuth authorization URL
 * @returns {Promise<{authorizationUrl: string, state: string}>}
 */
export const getLinkedInAuthUrl = async () => {
  try {
    // Check if token exists before making request
    const token = localStorage.getItem('auth_token');
    console.log('[oauthService] Getting LinkedIn auth URL, token:', token ? 'present' : 'missing');
    
    const response = await api.get('/oauth/linkedin/authorize');
    
    if (response.data && response.data.response) {
      return response.data.response;
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.error('[oauthService] Get LinkedIn auth URL error:', error);
    console.error('[oauthService] Error response:', error.response?.data);
    throw error;
  }
};

/**
 * Get GitHub OAuth authorization URL
 * @returns {Promise<{authorizationUrl: string, state: string}>}
 */
export const getGitHubAuthUrl = async () => {
  try {
    // Check if token exists before making request
    const token = localStorage.getItem('auth_token');
    console.log('[oauthService] Getting GitHub auth URL, token:', token ? 'present' : 'missing');
    
    const response = await api.get('/oauth/github/authorize');
    
    if (response.data && response.data.response) {
      return response.data.response;
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.error('[oauthService] Get GitHub auth URL error:', error);
    console.error('[oauthService] Error response:', error.response?.data);
    throw error;
  }
};

