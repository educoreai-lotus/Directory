// Frontend Service - OAuth Service
// Handles OAuth API calls

import api from '../utils/api';

/**
 * Get LinkedIn OAuth authorization URL
 * @returns {Promise<{authorizationUrl: string, state: string}>}
 */
export const getLinkedInAuthUrl = async () => {
  try {
    const response = await api.get('/oauth/linkedin/authorize');
    
    if (response.data && response.data.response) {
      return response.data.response;
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.error('Get LinkedIn auth URL error:', error);
    throw error;
  }
};

/**
 * Get GitHub OAuth authorization URL
 * @returns {Promise<{authorizationUrl: string, state: string}>}
 */
export const getGitHubAuthUrl = async () => {
  try {
    const response = await api.get('/oauth/github/authorize');
    
    if (response.data && response.data.response) {
      return response.data.response;
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.error('Get GitHub auth URL error:', error);
    throw error;
  }
};

