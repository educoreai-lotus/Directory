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
    
    console.log('[oauthService] LinkedIn response:', JSON.stringify(response.data, null, 2));
    
    // Backend returns {authorizationUrl, state} directly, not nested in response
    if (response.data && response.data.authorizationUrl) {
      console.log('[oauthService] LinkedIn authorizationUrl:', response.data.authorizationUrl);
      return response.data;
    }
    
    // Fallback: check if nested in response (for backwards compatibility)
    if (response.data && response.data.response && response.data.response.authorizationUrl) {
      console.log('[oauthService] LinkedIn authorizationUrl (nested):', response.data.response.authorizationUrl);
      return response.data.response;
    }
    
    throw new Error('Authorization URL not found in response');
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
    
    console.log('[oauthService] GitHub response:', JSON.stringify(response.data, null, 2));
    
    // Backend returns {authorizationUrl, state} directly, not nested in response
    if (response.data && response.data.authorizationUrl) {
      console.log('[oauthService] GitHub authorizationUrl:', response.data.authorizationUrl);
      return response.data;
    }
    
    // Fallback: check if nested in response (for backwards compatibility)
    if (response.data && response.data.response && response.data.response.authorizationUrl) {
      console.log('[oauthService] GitHub authorizationUrl (nested):', response.data.response.authorizationUrl);
      return response.data.response;
    }
    
    throw new Error('Authorization URL not found in response');
  } catch (error) {
    console.error('[oauthService] Get GitHub auth URL error:', error);
    console.error('[oauthService] Error response:', error.response?.data);
    throw error;
  }
};

