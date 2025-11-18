// Presentation Layer - OAuth Controller
// Handles OAuth flows for LinkedIn and GitHub

const ConnectLinkedInUseCase = require('../application/ConnectLinkedInUseCase');
const { authMiddleware } = require('../shared/authMiddleware');

class OAuthController {
  constructor() {
    this.connectLinkedInUseCase = new ConnectLinkedInUseCase();
  }

  /**
   * Get LinkedIn OAuth authorization URL
   * GET /api/v1/oauth/linkedin/authorize
   * Requires authentication
   */
  async getLinkedInAuthUrl(req, res, next) {
    try {
      // Get employee ID from authenticated user
      const employeeId = req.user?.id || req.user?.employeeId;
      
      if (!employeeId) {
        return res.status(401).json({
          requester_service: 'directory_service',
          response: {
            error: 'Authentication required'
          }
        });
      }

      const result = await this.connectLinkedInUseCase.getAuthorizationUrl(employeeId);

      return res.status(200).json({
        requester_service: 'directory_service',
        response: result
      });
    } catch (error) {
      console.error('[OAuthController] Error getting LinkedIn auth URL:', error);
      return res.status(500).json({
        requester_service: 'directory_service',
        response: {
          error: 'Failed to generate LinkedIn authorization URL'
        }
      });
    }
  }

  /**
   * Handle LinkedIn OAuth callback
   * GET /api/v1/oauth/linkedin/callback
   * Public endpoint (called by LinkedIn)
   */
  async handleLinkedInCallback(req, res, next) {
    try {
      const { code, state, error } = req.query;

      // Check for OAuth errors
      if (error) {
        console.error('[OAuthController] LinkedIn OAuth error:', error);
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/enrich?error=missing_code_or_state`);
      }

      // Handle callback
      const result = await this.connectLinkedInUseCase.handleCallback(code, state);

      // Redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/enrich?linkedin=connected&employeeId=${result.employee.id}`);
    } catch (error) {
      console.error('[OAuthController] LinkedIn callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorMessage = error.message || 'Failed to connect LinkedIn';
      return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}`);
    }
  }
}

module.exports = OAuthController;

