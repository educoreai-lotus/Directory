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
      // This endpoint returns email if 'email' scope is granted
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const profileData = {
        id: response.data.sub,
        name: response.data.name,
        given_name: response.data.given_name,
        family_name: response.data.family_name,
        email: response.data.email || null, // Email from userinfo (if 'email' scope granted)
        picture: response.data.picture,
        locale: response.data.locale,
        email_verified: response.data.email_verified || false
      };

      // Log if email is present from userinfo endpoint
      if (profileData.email) {
        console.log('[LinkedInAPIClient] ✅ Email retrieved from OpenID Connect userinfo endpoint');
      } else {
        console.log('[LinkedInAPIClient] ⚠️  Email not in userinfo response (may need separate email endpoint)');
      }

      return profileData;
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
   * Fetch user profile using legacy LinkedIn API endpoint (r_liteprofile scope)
   * @param {string} accessToken - LinkedIn access token
   * @returns {Promise<Object>} User profile data
   */
  async getLegacyProfile(accessToken) {
    try {
      // Legacy endpoint with projection for basic profile fields
      // This requires r_liteprofile scope (deprecated but still works)
      const legacyProfileUrl = 'https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))';
      
      const response = await axios.get(legacyProfileUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const firstName = response.data.firstName?.localized 
        ? Object.values(response.data.firstName.localized)[0] 
        : response.data.firstName?.preferredLocale?.language 
        ? response.data.firstName.localized?.[response.data.firstName.preferredLocale.language]
        : response.data.firstName;
      
      const lastName = response.data.lastName?.localized 
        ? Object.values(response.data.lastName.localized)[0] 
        : response.data.lastName?.preferredLocale?.language 
        ? response.data.lastName.localized?.[response.data.lastName.preferredLocale.language]
        : response.data.lastName;

      // Extract profile picture URL
      let profilePicture = null;
      if (response.data.profilePicture?.displayImage) {
        const displayImage = response.data.profilePicture.displayImage;
        if (displayImage.elements && displayImage.elements.length > 0) {
          // Get the largest image
          const sortedImages = displayImage.elements.sort((a, b) => (b.width || 0) - (a.width || 0));
          profilePicture = sortedImages[0].identifiers?.[0]?.identifier || null;
        }
      }

      const profileData = {
        id: response.data.id,
        name: `${firstName || ''} ${lastName || ''}`.trim(),
        given_name: firstName,
        family_name: lastName,
        firstName: firstName,
        lastName: lastName,
        profilePicture: profilePicture,
        picture: profilePicture
      };

      console.log('[LinkedInAPIClient] ✅ Legacy profile fetched successfully');
      return profileData;
    } catch (error) {
      console.error('[LinkedInAPIClient] Error fetching legacy profile:', error.response?.data || error.message);
      throw new Error(`Failed to fetch LinkedIn profile: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Fetch user email address using legacy LinkedIn API v2 endpoint
   * NOTE: This endpoint requires the 'emailAddress' product to be approved in LinkedIn Developer Portal
   * If not approved, this will fail with 403. The email from OpenID Connect userinfo should be used instead.
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
        const email = emailElement['handle~']?.emailAddress || null;
        if (email) {
          console.log('[LinkedInAPIClient] ✅ Email retrieved from legacy email endpoint');
        }
        return email;
      }
      
      return null;
    } catch (error) {
      // This is expected if 'emailAddress' product is not approved in LinkedIn Developer Portal
      // The email should already be available from OpenID Connect userinfo endpoint if 'email' scope is granted
      if (error.response?.status === 403) {
        console.warn('[LinkedInAPIClient] ⚠️  Email endpoint requires "emailAddress" product approval in LinkedIn Developer Portal');
        console.warn('[LinkedInAPIClient] ⚠️  This is OK - email should be available from OpenID Connect userinfo endpoint');
      } else {
        console.warn('[LinkedInAPIClient] Could not fetch email from legacy endpoint:', error.response?.data || error.message);
      }
      return null; // Email is optional, don't fail if we can't get it
    }
  }

  /**
   * Fetch complete LinkedIn profile data (profile + email)
   * Supports both OpenID Connect and legacy scopes (r_liteprofile, r_emailaddress)
   * @param {string} accessToken - LinkedIn access token
   * @param {boolean} useLegacyScopes - Whether legacy scopes (r_liteprofile, r_emailaddress) were used
   * @returns {Promise<Object>} Complete profile data
   */
  async getCompleteProfile(accessToken, useLegacyScopes = false) {
    let profile;
    let email = null;

    if (useLegacyScopes) {
      // Use legacy endpoints for r_liteprofile and r_emailaddress scopes
      console.log('[LinkedInAPIClient] Using legacy endpoints (r_liteprofile, r_emailaddress)');
      
      // Fetch profile and email in parallel
      [profile, email] = await Promise.all([
        this.getLegacyProfile(accessToken),
        this.getUserEmail(accessToken)
      ]);
    } else {
      // Try OpenID Connect first (includes email if 'email' scope is granted)
      try {
        profile = await this.getUserProfile(accessToken);
        email = profile.email;
        
        // Only try legacy email endpoint if email is not already in profile
        if (!email) {
          console.log('[LinkedInAPIClient] Email not in userinfo, trying legacy email endpoint...');
          email = await this.getUserEmail(accessToken);
        } else {
          console.log('[LinkedInAPIClient] ✅ Email already available from userinfo, skipping legacy email endpoint');
        }
      } catch (error) {
        // If OpenID Connect fails, fallback to legacy endpoints
        console.warn('[LinkedInAPIClient] OpenID Connect failed, falling back to legacy endpoints');
        [profile, email] = await Promise.all([
          this.getLegacyProfile(accessToken),
          this.getUserEmail(accessToken)
        ]);
      }
    }

    // Ensure picture field is properly extracted
    const pictureUrl = profile.picture 
      || profile.profilePicture?.displayImage 
      || (typeof profile.profilePicture === 'string' ? profile.profilePicture : null)
      || profile.profilePicture?.url
      || null;

    const completeProfile = {
      ...profile,
      picture: pictureUrl, // Normalize to 'picture' field for consistent access
      email: email || null,
      fetched_at: new Date().toISOString()
    };

    if (completeProfile.email) {
      console.log('[LinkedInAPIClient] ✅ Complete profile fetched with email');
    } else {
      console.warn('[LinkedInAPIClient] ⚠️  Complete profile fetched but email is missing');
    }

    return completeProfile;
  }
}

module.exports = LinkedInAPIClient;

