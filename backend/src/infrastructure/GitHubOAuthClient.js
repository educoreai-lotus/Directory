// Infrastructure Layer - GitHub OAuth Client
// Handles GitHub OAuth 2.0 authentication flow

const axios = require('axios');
const config = require('../config');

class GitHubOAuthClient {
  constructor() {
    this.clientId = config.github?.clientId || process.env.GITHUB_CLIENT_ID;
    this.clientSecret = config.github?.clientSecret || process.env.GITHUB_CLIENT_SECRET;
    this.redirectUri = config.github?.redirectUri || process.env.GITHUB_REDIRECT_URI || 
                      `${config.directory.baseUrl}/api/v1/oauth/github/callback`;
    
    // GitHub OAuth endpoints
    this.authorizationUrl = 'https://github.com/login/oauth/authorize';
    this.tokenUrl = 'https://github.com/login/oauth/access_token';
    
    // Required scopes for profile enrichment
    // user:email - Read user email addresses
    // read:user - Read user profile data
    // repo - Read repository data (optional, for public repos)
    this.scopes = ['user:email', 'read:user', 'repo'];
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('[GitHubOAuthClient] ⚠️  GitHub OAuth credentials not configured.');
      console.warn('[GitHubOAuthClient] To enable GitHub OAuth, set the following environment variables in Railway:');
      console.warn('[GitHubOAuthClient]   - GITHUB_CLIENT_ID');
      console.warn('[GitHubOAuthClient]   - GITHUB_CLIENT_SECRET');
      console.warn('[GitHubOAuthClient] See /docs/GitHub-OAuth-Setup.md for setup instructions.');
    } else {
      console.log('[GitHubOAuthClient] ✅ GitHub OAuth credentials configured');
    }
  }

  /**
   * Generate GitHub OAuth authorization URL
   * @param {string} state - State parameter for CSRF protection (should include employee_id)
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(state) {
    if (!this.clientId) {
      throw new Error('GitHub Client ID not configured');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      scope: this.scopes.join(' ')
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from GitHub callback
   * @returns {Promise<Object>} Token response with access_token, scope, token_type
   */
  async exchangeCodeForToken(code) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUri
        },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.error) {
        throw new Error(`GitHub OAuth error: ${response.data.error_description || response.data.error}`);
      }

      return {
        access_token: response.data.access_token,
        scope: response.data.scope,
        token_type: response.data.token_type || 'Bearer'
      };
    } catch (error) {
      console.error('[GitHubOAuthClient] Token exchange error:', error.response?.data || error.message);
      throw new Error(`Failed to exchange authorization code for token: ${error.response?.data?.error_description || error.message}`);
    }
  }
}

module.exports = GitHubOAuthClient;

