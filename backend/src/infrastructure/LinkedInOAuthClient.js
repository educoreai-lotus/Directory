// Infrastructure Layer - LinkedIn OAuth Client
// Handles LinkedIn OAuth 2.0 authentication flow

const axios = require('axios');
const config = require('../config');

class LinkedInOAuthClient {
  constructor() {
    this.clientId = config.linkedin?.clientId || process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = config.linkedin?.clientSecret || process.env.LINKEDIN_CLIENT_SECRET;
    this.redirectUri = config.linkedin?.redirectUri || process.env.LINKEDIN_REDIRECT_URI || 
                      `${config.directory.baseUrl}/api/v1/oauth/linkedin/callback`;
    
    // LinkedIn OAuth endpoints
    this.authorizationUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    this.tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    
    // Required scopes for profile enrichment
    // r_liteprofile: Basic profile info (deprecated, use r_basicprofile or openid)
    // r_emailaddress: Email address
    // openid profile email: OpenID Connect scopes (recommended)
    this.scopes = ['openid', 'profile', 'email'];
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('[LinkedInOAuthClient] ⚠️  LinkedIn OAuth credentials not configured.');
      console.warn('[LinkedInOAuthClient] To enable LinkedIn OAuth, set the following environment variables in Railway:');
      console.warn('[LinkedInOAuthClient]   - LINKEDIN_CLIENT_ID');
      console.warn('[LinkedInOAuthClient]   - LINKEDIN_CLIENT_SECRET');
      console.warn('[LinkedInOAuthClient] See /docs/LinkedIn-OAuth-Setup.md for setup instructions.');
    } else {
      console.log('[LinkedInOAuthClient] ✅ LinkedIn OAuth credentials configured');
    }
  }

  /**
   * Generate LinkedIn OAuth authorization URL
   * @param {string} state - State parameter for CSRF protection (should include employee_id)
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(state) {
    if (!this.clientId) {
      throw new Error('LinkedIn Client ID not configured');
    }

    if (!this.redirectUri) {
      throw new Error('LinkedIn Redirect URI not configured');
    }

    console.log('[LinkedInOAuthClient] Generating URL with:', {
      clientId: this.clientId ? 'present' : 'missing',
      redirectUri: this.redirectUri,
      state: state ? 'present' : 'missing',
      scopes: this.scopes
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      scope: this.scopes.join(' ')
    });

    const url = `${this.authorizationUrl}?${params.toString()}`;
    console.log('[LinkedInOAuthClient] Generated URL:', url);
    
    return url;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from LinkedIn callback
   * @returns {Promise<Object>} Token response with access_token, expires_in, etc.
   */
  async exchangeCodeForToken(code) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('LinkedIn OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        refresh_token: response.data.refresh_token || null,
        token_type: response.data.token_type || 'Bearer'
      };
    } catch (error) {
      console.error('[LinkedInOAuthClient] Token exchange error:', error.response?.data || error.message);
      throw new Error(`Failed to exchange authorization code for token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token response
   */
  async refreshToken(refreshToken) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('LinkedIn OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        refresh_token: response.data.refresh_token || refreshToken,
        token_type: response.data.token_type || 'Bearer'
      };
    } catch (error) {
      console.error('[LinkedInOAuthClient] Token refresh error:', error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.response?.data?.error_description || error.message}`);
    }
  }
}

module.exports = LinkedInOAuthClient;

