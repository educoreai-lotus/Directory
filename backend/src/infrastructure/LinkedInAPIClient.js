// Infrastructure Layer - LinkedIn API Client
// Fetches profile data from LinkedIn API

const axios = require('axios');

class LinkedInAPIClient {
  constructor() {
    // LinkedIn API v2 endpoints
    this.baseUrl = 'https://api.linkedin.com/v2';
    
    // Profile fields we need for enrichment
    // Using OpenID Connect userinfo endpoint for basic info
    this.userInfoUrl = 'https://api.linkedin.com/v2/userinfo';
    
    // Legacy profile endpoint (if needed)
    this.profileUrl = 'https://api.linkedin.com/v2/me';
    
    // Email endpoint
    this.emailUrl = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';
  }

  /**
   * Fetch user profile information using OpenID Connect
   * @param {string} accessToken - LinkedIn access token
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(accessToken) {
    try {
      // Use OpenID Connect userinfo endpoint (recommended)
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        id: response.data.sub,
        name: response.data.name,
        given_name: response.data.given_name,
        family_name: response.data.family_name,
        email: response.data.email,
        picture: response.data.picture,
        locale: response.data.locale,
        email_verified: response.data.email_verified
      };
    } catch (error) {
      console.error('[LinkedInAPIClient] Error fetching user profile:', error.response?.data || error.message);
      
      // Fallback to legacy endpoint if OpenID Connect fails
      if (error.response?.status === 404 || error.response?.status === 403) {
        console.warn('[LinkedInAPIClient] OpenID Connect endpoint failed, trying legacy endpoint');
        return await this.getLegacyProfile(accessToken);
      }
      
      throw new Error(`Failed to fetch LinkedIn profile: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Fetch user profile using legacy LinkedIn API endpoint
   * @param {string} accessToken - LinkedIn access token
   * @returns {Promise<Object>} User profile data
   */
  async getLegacyProfile(accessToken) {
    try {
      const response = await axios.get(this.profileUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        id: response.data.id,
        firstName: response.data.firstName?.localized?.en_US || response.data.firstName,
        lastName: response.data.lastName?.localized?.en_US || response.data.lastName,
        profilePicture: response.data.profilePicture?.displayImage || null
      };
    } catch (error) {
      console.error('[LinkedInAPIClient] Error fetching legacy profile:', error.response?.data || error.message);
      throw new Error(`Failed to fetch LinkedIn profile: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Fetch user email address
   * @param {string} accessToken - LinkedIn access token
   * @returns {Promise<string|null>} Email address or null
   */
  async getUserEmail(accessToken) {
    try {
      const response = await axios.get(this.emailUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      // Extract email from response
      if (response.data?.elements && response.data.elements.length > 0) {
        const emailElement = response.data.elements[0];
        return emailElement['handle~']?.emailAddress || null;
      }
      
      return null;
    } catch (error) {
      console.warn('[LinkedInAPIClient] Could not fetch email:', error.response?.data || error.message);
      return null; // Email is optional, don't fail if we can't get it
    }
  }

  /**
   * Fetch complete LinkedIn profile data (profile + email)
   * @param {string} accessToken - LinkedIn access token
   * @returns {Promise<Object>} Complete profile data
   */
  async getCompleteProfile(accessToken) {
    const [profile, email] = await Promise.all([
      this.getUserProfile(accessToken),
      this.getUserEmail(accessToken)
    ]);

    // Ensure picture field is properly extracted
    const pictureUrl = profile.picture 
      || profile.profilePicture?.displayImage 
      || (typeof profile.profilePicture === 'string' ? profile.profilePicture : null)
      || profile.profilePicture?.url
      || null;

    return {
      ...profile,
      picture: pictureUrl, // Normalize to 'picture' field for consistent access
      email: email || profile.email || null,
      fetched_at: new Date().toISOString()
    };
  }
}

module.exports = LinkedInAPIClient;

