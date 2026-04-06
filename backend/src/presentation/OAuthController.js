// Presentation Layer - OAuth Controller
// Handles OAuth flows for LinkedIn and GitHub (nAuth session on the client; no tokens in redirect URLs).

const ConnectLinkedInUseCase = require('../application/ConnectLinkedInUseCase');
const ConnectGitHubUseCase = require('../application/ConnectGitHubUseCase');

function frontendBase() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

class OAuthController {
  constructor() {
    this.connectLinkedInUseCase = new ConnectLinkedInUseCase();
    this.connectGitHubUseCase = new ConnectGitHubUseCase();
  }

  /**
   * Get LinkedIn OAuth authorization URL
   * GET /api/v1/oauth/linkedin/authorize
   * Requires authentication
   */
  async getLinkedInAuthUrl(req, res, next) {
    try {
      const employeeId = req.user?.id || req.user?.employeeId || req.user?.directoryUserId;

      if (!employeeId) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      console.log('[OAuthController] Getting LinkedIn auth URL for employee:', employeeId);
      const result = await this.connectLinkedInUseCase.getAuthorizationUrl(employeeId);

      if (!result || !result.authorizationUrl) {
        console.error('[OAuthController] Failed to generate authorization URL');
        return res.status(500).json({
          error: 'Failed to generate LinkedIn authorization URL'
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('[OAuthController] Error getting LinkedIn auth URL:', error);
      return res.status(500).json({
        error: 'Failed to generate LinkedIn authorization URL'
      });
    }
  }

  /**
   * Handle LinkedIn OAuth callback
   * GET /api/v1/oauth/linkedin/callback
   */
  async handleLinkedInCallback(req, res, next) {
    const base = frontendBase();
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('[OAuthController] LinkedIn OAuth error:', error);
        let errorMessage = error;
        if (error === 'unauthorized_scope_error') {
          errorMessage =
            'LinkedIn app does not have required permissions. Please check LinkedIn Developer Portal settings. See docs/LINKEDIN-SCOPES-SETUP.md for instructions.';
        } else if (error === 'access_denied') {
          errorMessage = 'LinkedIn connection was cancelled or denied. Please try again.';
        }
        return res.redirect(`${base}/enrich?error=${encodeURIComponent(errorMessage)}`);
      }

      if (!code || !state) {
        return res.redirect(`${base}/enrich?error=missing_code_or_state`);
      }

      const result = await this.connectLinkedInUseCase.handleCallback(code, state);
      console.log('[OAuthController] LinkedIn connected successfully for employee:', result.employee.id);

      const EmployeeRepository = require('../infrastructure/EmployeeRepository');
      const employeeRepo = new EmployeeRepository();
      const employee = await employeeRepo.findById(result.employee.id);
      if (!employee) {
        throw new Error('Employee not found after LinkedIn connection');
      }

      const hasLinkedIn = !!employee.linkedin_data;
      const hasGitHub = !!employee.github_data;

      if (hasLinkedIn && hasGitHub) {
        return res.redirect(`${base}/enrich?linkedin=connected&github=connected`);
      }
      return res.redirect(`${base}/enrich?linkedin=connected`);
    } catch (err) {
      console.error('[OAuthController] LinkedIn callback error:', err);
      const errorMessage = err.message || 'Failed to connect LinkedIn';
      return res.redirect(`${base}/enrich?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  /**
   * Get GitHub OAuth authorization URL
   * GET /api/v1/oauth/github/authorize
   */
  async getGitHubAuthUrl(req, res, next) {
    try {
      const employeeId = req.user?.id || req.user?.employeeId || req.user?.directoryUserId;

      if (!employeeId) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const result = await this.connectGitHubUseCase.getAuthorizationUrl(employeeId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[OAuthController] Error getting GitHub auth URL:', error);
      return res.status(500).json({
        error: 'Failed to generate GitHub authorization URL'
      });
    }
  }

  /**
   * Handle GitHub OAuth callback
   * GET /api/v1/oauth/github/callback
   */
  async handleGitHubCallback(req, res, next) {
    const base = frontendBase();
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('[OAuthController] GitHub OAuth error:', error);
        return res.redirect(`${base}/enrich?error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        return res.redirect(`${base}/enrich?error=missing_code_or_state`);
      }

      const result = await this.connectGitHubUseCase.handleCallback(code, state);
      console.log('[OAuthController] GitHub connected successfully for employee:', result.employee.id);

      const EmployeeRepository = require('../infrastructure/EmployeeRepository');
      const employeeRepo = new EmployeeRepository();
      const employee = await employeeRepo.findById(result.employee.id);
      if (!employee) {
        throw new Error('Employee not found after GitHub connection');
      }

      const hasLinkedIn = !!employee.linkedin_data;
      const hasGitHub = !!employee.github_data;

      if (hasLinkedIn && hasGitHub) {
        return res.redirect(`${base}/enrich?linkedin=connected&github=connected`);
      }
      return res.redirect(`${base}/enrich?github=connected`);
    } catch (err) {
      console.error('[OAuthController] GitHub callback error:', err);
      const errorMessage = err.message || 'Failed to connect GitHub';
      return res.redirect(`${base}/enrich?error=${encodeURIComponent(errorMessage)}`);
    }
  }
}

module.exports = OAuthController;
