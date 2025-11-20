// Infrastructure Layer - LinkedIn OAuth Client
// Handles LinkedIn OAuth 2.0 authentication flow

const axios = require('axios');
const config = require('../config');

class LinkedInOAuthClient {
  constructor() {
    this.clientId = config.linkedin?.clientId || process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = config.linkedin?.clientSecret || process.env.LINKEDIN_CLIENT_SECRET;
    // Get redirect URI - ensure no trailing slashes and exact match
    const redirectUri = config.linkedin?.redirectUri || process.env.LINKEDIN_REDIRECT_URI || 
                      `${config.directory.baseUrl}/api/v1/oauth/linkedin/callback`;
    // Remove any trailing slashes to ensure exact match with LinkedIn
    this.redirectUri = redirectUri.replace(/\/+$/, '');
    
    // LinkedIn OAuth endpoints
    this.authorizationUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    this.tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    
    // Required scopes for profile enrichment
    // Option 1: Legacy scopes (r_liteprofile + r_emailaddress) - may fail if products not approved
    // Option 2: OpenID Connect scopes (openid, profile, email) - recommended, more reliable
    // Check environment variable to determine which scopes to use
    // DEFAULT: OpenID Connect (more reliable, less likely to have scope errors)
    // Only use legacy if explicitly set to 'true'
    const useLegacyScopes = process.env.LINKEDIN_USE_LEGACY_SCOPES === 'true';
    
    if (useLegacyScopes) {
      // Legacy scopes (r_liteprofile + r_emailaddress)
      // r_liteprofile: Basic profile info (deprecated but still works)
      // r_emailaddress: Email address (requires "Email Address" product approval in LinkedIn Developer Portal)
      // ⚠️ WARNING: These scopes may fail with unauthorized_scope_error if products are not approved
      this.scopes = ['r_liteprofile', 'r_emailaddress'];
      this.useLegacyScopes = true;
      console.log('[LinkedInOAuthClient] ⚠️  Using legacy scopes: r_liteprofile, r_emailaddress');
      console.log('[LinkedInOAuthClient] ⚠️  WARNING: r_emailaddress requires "Email Address" product approval in LinkedIn Developer Portal');
      console.log('[LinkedInOAuthClient] ⚠️  If you see unauthorized_scope_error, check Products tab in LinkedIn Developer Portal');
      console.log('[LinkedInOAuthClient] ⚠️  See docs/LINKEDIN-DEVELOPER-PORTAL-CHECKLIST.md for setup instructions');
      console.log('[LinkedInOAuthClient] 💡 TIP: Remove LINKEDIN_USE_LEGACY_SCOPES env var or set to false to use OpenID Connect');
    } else {
      // OpenID Connect scopes (DEFAULT - more reliable, less likely to have scope errors)
      // These scopes work with "Sign In with LinkedIn using OpenID Connect" product
      this.scopes = ['openid', 'profile', 'email'];
      this.useLegacyScopes = false;
      console.log('[LinkedInOAuthClient] ✅ Using OpenID Connect scopes: openid, profile, email (DEFAULT)');
      console.log('[LinkedInOAuthClient] ℹ️  These scopes require "Sign In with LinkedIn using OpenID Connect" product');
      console.log('[LinkedInOAuthClient] ℹ️  If you need legacy scopes, set LINKEDIN_USE_LEGACY_SCOPES=true in Railway');
    }
    
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
      redirectUriLength: this.redirectUri.length,
      redirectUriEncoded: encodeURIComponent(this.redirectUri),
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

