// Application Layer - Connect GitHub Use Case
// Handles GitHub OAuth connection and profile data fetching

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const GitHubOAuthClient = require('../infrastructure/GitHubOAuthClient');
const GitHubAPIClient = require('../infrastructure/GitHubAPIClient');

class ConnectGitHubUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.oauthClient = new GitHubOAuthClient();
    this.apiClient = new GitHubAPIClient();
  }

  /**
   * Generate GitHub OAuth authorization URL
   * @param {string} employeeId - Employee ID
   * @returns {Promise<{authorizationUrl: string, state: string}>}
   */
  async getAuthorizationUrl(employeeId) {
    // Generate state parameter with employee ID for CSRF protection
    const state = Buffer.from(JSON.stringify({
      employeeId,
      timestamp: Date.now()
    })).toString('base64');

    const authorizationUrl = this.oauthClient.getAuthorizationUrl(state);

    return {
      authorizationUrl,
      state
    };
  }

  /**
   * Handle GitHub OAuth callback and fetch profile data
   * @param {string} code - Authorization code from GitHub
   * @param {string} state - State parameter (contains employee ID)
   * @returns {Promise<Object>} Updated employee with GitHub data
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

      // Check if GitHub is already connected (one-time only)
      if (employee.github_data && employee.github_url) {
        throw new Error('GitHub is already connected. This is a one-time process.');
      }

      // Exchange authorization code for access token
      const tokenResponse = await this.oauthClient.exchangeCodeForToken(code);

      // Fetch GitHub profile data (including repositories)
      const profileData = await this.apiClient.getCompleteProfile(tokenResponse.access_token);

      // Build GitHub profile URL
      const githubUrl = profileData.login 
        ? `https://github.com/${profileData.login}` 
        : `https://github.com/user/${profileData.id}`;

      // Store GitHub data in employee profile
      const updatedEmployee = await this.employeeRepository.updateGitHubData(
        employeeId,
        githubUrl,
        {
          ...profileData,
          access_token: tokenResponse.access_token, // Store token for future API calls (if needed)
          token_type: tokenResponse.token_type || 'Bearer',
          scope: tokenResponse.scope,
          connected_at: new Date().toISOString()
        }
      );

      return {
        success: true,
        employee: {
          id: updatedEmployee.id,
          employee_id: updatedEmployee.employee_id,
          github_url: updatedEmployee.github_url,
          github_connected: true,
          repository_count: profileData.repositories?.length || 0
        }
      };
    } catch (error) {
      console.error('[ConnectGitHubUseCase] Error:', error);
      throw error;
    }
  }
}

module.exports = ConnectGitHubUseCase;

