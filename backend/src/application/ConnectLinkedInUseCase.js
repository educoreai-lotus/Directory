// Application Layer - Connect LinkedIn Use Case
// Handles LinkedIn OAuth connection and profile data fetching

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const LinkedInOAuthClient = require('../infrastructure/LinkedInOAuthClient');
const LinkedInAPIClient = require('../infrastructure/LinkedInAPIClient');

class ConnectLinkedInUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.oauthClient = new LinkedInOAuthClient();
    this.apiClient = new LinkedInAPIClient();
  }

  /**
   * Generate LinkedIn OAuth authorization URL
   * @param {string} employeeId - Employee ID
   * @returns {Promise<{authorizationUrl: string, state: string}>}
   */
  async getAuthorizationUrl(employeeId) {
    console.log('[ConnectLinkedInUseCase] Generating authorization URL for employee:', employeeId);
    
    // Generate state parameter with employee ID for CSRF protection
    const state = Buffer.from(JSON.stringify({
      employeeId,
      timestamp: Date.now()
    })).toString('base64');

    console.log('[ConnectLinkedInUseCase] Generated state:', state);
    
    const authorizationUrl = this.oauthClient.getAuthorizationUrl(state);
    console.log('[ConnectLinkedInUseCase] Generated authorizationUrl:', authorizationUrl);

    if (!authorizationUrl) {
      throw new Error('Failed to generate LinkedIn authorization URL');
    }

    return {
      authorizationUrl,
      state
    };
  }

  /**
   * Handle LinkedIn OAuth callback and fetch profile data
   * @param {string} code - Authorization code from LinkedIn
   * @param {string} state - State parameter (contains employee ID)
   * @returns {Promise<Object>} Updated employee with LinkedIn data
   */
  async handleCallback(code, state) {
    try {
      // Decode state to get employee ID
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      const employeeId = stateData.employeeId;

      if (!employeeId) {
        throw new Error('Invalid state parameter: employee ID not found');
      }

      // Verify employee exists
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Check if LinkedIn is already connected (one-time only)
      if (employee.linkedin_data && employee.linkedin_url) {
        throw new Error('LinkedIn is already connected. This is a one-time process.');
      }

      // Exchange authorization code for access token
      const tokenResponse = await this.oauthClient.exchangeCodeForToken(code);

      // Fetch LinkedIn profile data
      const profileData = await this.apiClient.getCompleteProfile(tokenResponse.access_token);

      // Build LinkedIn profile URL
      const linkedinUrl = profileData.id 
        ? `https://www.linkedin.com/in/${profileData.id}` 
        : `https://www.linkedin.com/profile/view?id=${profileData.id}`;

      // Store LinkedIn data in employee profile
      const updatedEmployee = await this.employeeRepository.updateLinkedInData(
        employeeId,
        linkedinUrl,
        {
          ...profileData,
          access_token: tokenResponse.access_token, // Store token for future API calls (if needed)
          token_expires_at: tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
            : null,
          refresh_token: tokenResponse.refresh_token || null,
          connected_at: new Date().toISOString()
        }
      );

      return {
        success: true,
        employee: {
          id: updatedEmployee.id,
          employee_id: updatedEmployee.employee_id,
          linkedin_url: updatedEmployee.linkedin_url,
          linkedin_connected: true
        }
      };
    } catch (error) {
      console.error('[ConnectLinkedInUseCase] Error:', error);
      throw error;
    }
  }
}

module.exports = ConnectLinkedInUseCase;

