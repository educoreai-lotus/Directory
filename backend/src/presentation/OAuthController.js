// Presentation Layer - OAuth Controller
// Handles OAuth flows for LinkedIn and GitHub

const ConnectLinkedInUseCase = require('../application/ConnectLinkedInUseCase');
const ConnectGitHubUseCase = require('../application/ConnectGitHubUseCase');
const EnrichProfileUseCase = require('../application/EnrichProfileUseCase');
const { authMiddleware } = require('../shared/authMiddleware');

class OAuthController {
  constructor() {
    this.connectLinkedInUseCase = new ConnectLinkedInUseCase();
    this.connectGitHubUseCase = new ConnectGitHubUseCase();
    this.enrichProfileUseCase = new EnrichProfileUseCase();
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
          error: 'Authentication required'
        });
      }

      console.log('[OAuthController] Getting LinkedIn auth URL for employee:', employeeId);
      const result = await this.connectLinkedInUseCase.getAuthorizationUrl(employeeId);
      console.log('[OAuthController] LinkedIn auth URL result:', result);
      console.log('[OAuthController] LinkedIn authorizationUrl:', result?.authorizationUrl);

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
      console.log('[OAuthController] LinkedIn connected successfully for employee:', result.employee.id);

      // Check if both OAuth connections are complete and trigger enrichment
      const employeeId = result.employee.id;
      const isReady = await this.enrichProfileUseCase.isReadyForEnrichment(employeeId);
      
      if (isReady) {
        console.log('[OAuthController] Both OAuth connections complete, triggering enrichment...');
        // Trigger enrichment in background (don't wait for it)
        this.enrichProfileUseCase.enrichProfile(employeeId)
          .then(enrichmentResult => {
            console.log('[OAuthController] ✅ Profile enrichment completed:', enrichmentResult);
          })
          .catch(error => {
            console.error('[OAuthController] ❌ Background enrichment failed:', error);
          });
      } else {
        console.log('[OAuthController] Waiting for GitHub connection before enrichment');
      }
      
      // Redirect back to enrich page
      // If both are connected, the frontend will auto-redirect to profile
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (isReady) {
        // Both connected - redirect to profile page (enrichment triggered in background)
        console.log('[OAuthController] Both OAuth connections complete, redirecting to profile');
        return res.redirect(`${frontendUrl}/employee/${employeeId}?enrichment=complete`);
      } else {
        // Only GitHub connected - go back to enrich page to connect LinkedIn
        console.log('[OAuthController] GitHub connected, redirecting back to enrich page');
        return res.redirect(`${frontendUrl}/enrich?github=connected`);
      }
    } catch (error) {
      console.error('[OAuthController] LinkedIn callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorMessage = error.message || 'Failed to connect LinkedIn';
      return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  /**
   * Get GitHub OAuth authorization URL
   * GET /api/v1/oauth/github/authorize
   * Requires authentication
   */
  async getGitHubAuthUrl(req, res, next) {
    try {
      // Get employee ID from authenticated user
      const employeeId = req.user?.id || req.user?.employeeId;
      
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
   * Public endpoint (called by GitHub)
   */
  async handleGitHubCallback(req, res, next) {
    try {
      const { code, state, error } = req.query;

      // Check for OAuth errors
      if (error) {
        console.error('[OAuthController] GitHub OAuth error:', error);
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/enrich?error=missing_code_or_state`);
      }

      // Handle callback
      const result = await this.connectGitHubUseCase.handleCallback(code, state);
      console.log('[OAuthController] GitHub connected successfully for employee:', result.employee.id);

      // Check if both OAuth connections are complete and trigger enrichment
      const employeeId = result.employee.id;
      const isReady = await this.enrichProfileUseCase.isReadyForEnrichment(employeeId);
      
      if (isReady) {
        console.log('[OAuthController] Both OAuth connections complete, triggering enrichment...');
        // Trigger enrichment in background (don't wait for it)
        this.enrichProfileUseCase.enrichProfile(employeeId)
          .then(enrichmentResult => {
            console.log('[OAuthController] ✅ Profile enrichment completed:', enrichmentResult);
          })
          .catch(error => {
            console.error('[OAuthController] ❌ Background enrichment failed:', error);
          });
      } else {
        console.log('[OAuthController] Waiting for LinkedIn connection before enrichment');
      }

      // Redirect back to enrich page
      // If both are connected, the frontend will auto-redirect to profile
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (isReady) {
        // Both connected - redirect to profile page
        return res.redirect(`${frontendUrl}/employee/${employeeId}?enrichment=complete`);
      } else {
        // Only GitHub connected - go back to enrich page to connect LinkedIn
        return res.redirect(`${frontendUrl}/enrich?github=connected`);
      }
    } catch (error) {
      console.error('[OAuthController] GitHub callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorMessage = error.message || 'Failed to connect GitHub';
      return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}`);
    }
  }
}

module.exports = OAuthController;

