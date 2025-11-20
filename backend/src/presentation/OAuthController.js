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

      // Get full employee data to build user object
      const EmployeeRepository = require('../infrastructure/EmployeeRepository');
      const CompanyRepository = require('../infrastructure/CompanyRepository');
      const employeeRepo = new EmployeeRepository();
      const companyRepo = new CompanyRepository();
      
      const employeeId = result.employee.id;
      const employee = await employeeRepo.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found after LinkedIn connection');
      }

      // Get company to check HR status
      const company = await companyRepo.findById(employee.company_id);
      const isHR = company && company.hr_contact_email && 
                   company.hr_contact_email.toLowerCase() === employee.email.toLowerCase();

      // Get employee roles
      const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
      const rolesResult = await employeeRepo.pool.query(rolesQuery, [employeeId]);
      const roles = rolesResult.rows.map(row => row.role_type);
      const isTrainer = roles.includes('TRAINER');
      const isDecisionMaker = roles.includes('DECISION_MAKER');

      // Build user object (same format as AuthenticateUserUseCase)
      const profileStatus = employee.profile_status || 'basic';
      const isProfileApproved = profileStatus === 'approved';
      const hasLinkedIn = !!employee.linkedin_data;
      const hasGitHub = !!employee.github_data;
      const bothConnected = hasLinkedIn && hasGitHub;

      const userObject = {
        id: employee.id,
        email: employee.email,
        employeeId: employee.employee_id,
        companyId: employee.company_id,
        fullName: employee.full_name,
        profilePhotoUrl: employee.profile_photo_url || null,
        isHR: isHR,
        profileStatus: profileStatus,
        isFirstLogin: false, // Not first login if OAuth is happening
        isProfileApproved: isProfileApproved,
        hasLinkedIn: hasLinkedIn,
        hasGitHub: hasGitHub,
        bothOAuthConnected: bothConnected,
        isTrainer: isTrainer,
        isDecisionMaker: isDecisionMaker
      };

      // Generate dummy token for the employee (same format as login)
      const dummyToken = `dummy-token-${employee.id}-${employee.email}-${Date.now()}`;
      console.log('[OAuthController] Generated dummy token for employee:', employee.id);

      // Encode user object as base64 JSON for URL
      const userDataEncoded = Buffer.from(JSON.stringify(userObject)).toString('base64');

      // Check if both OAuth connections are complete
      const isReady = await this.enrichProfileUseCase.isReadyForEnrichment(employeeId);
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      if (isReady) {
        // Both connected - trigger enrichment synchronously (wait for it to complete)
        console.log('[OAuthController] Both OAuth connections complete, triggering enrichment...');
        try {
          const enrichmentResult = await this.enrichProfileUseCase.enrichProfile(employeeId);
          console.log('[OAuthController] ✅ Profile enrichment completed:', enrichmentResult);
          
          // Update user object after enrichment
          userObject.profileStatus = 'enriched';
          const updatedUserDataEncoded = Buffer.from(JSON.stringify(userObject)).toString('base64');
          
          // After enrichment completes, redirect to enrich page with both connected status, token, and user
          return res.redirect(`${frontendUrl}/enrich?linkedin=connected&github=connected&enriched=true&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(updatedUserDataEncoded)}`);
        } catch (error) {
          console.error('[OAuthController] ❌ Enrichment failed:', error);
          // Still redirect to enrich page, but with error, token, and user
          return res.redirect(`${frontendUrl}/enrich?linkedin=connected&github=connected&error=${encodeURIComponent(error.message)}&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
        }
      } else {
        // Only LinkedIn connected - go back to enrich page to connect GitHub with token and user
        console.log('[OAuthController] LinkedIn connected, waiting for GitHub. Redirecting back to enrich page');
        return res.redirect(`${frontendUrl}/enrich?linkedin=connected&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
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

      // Get full employee data to build user object
      const EmployeeRepository = require('../infrastructure/EmployeeRepository');
      const CompanyRepository = require('../infrastructure/CompanyRepository');
      const employeeRepo = new EmployeeRepository();
      const companyRepo = new CompanyRepository();
      
      const employeeId = result.employee.id;
      const employee = await employeeRepo.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found after GitHub connection');
      }

      // Get company to check HR status
      const company = await companyRepo.findById(employee.company_id);
      const isHR = company && company.hr_contact_email && 
                   company.hr_contact_email.toLowerCase() === employee.email.toLowerCase();

      // Get employee roles
      const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
      const rolesResult = await employeeRepo.pool.query(rolesQuery, [employeeId]);
      const roles = rolesResult.rows.map(row => row.role_type);
      const isTrainer = roles.includes('TRAINER');
      const isDecisionMaker = roles.includes('DECISION_MAKER');

      // Build user object (same format as AuthenticateUserUseCase)
      const profileStatus = employee.profile_status || 'basic';
      const isProfileApproved = profileStatus === 'approved';
      const hasLinkedIn = !!employee.linkedin_data;
      const hasGitHub = !!employee.github_data;
      const bothConnected = hasLinkedIn && hasGitHub;

      const userObject = {
        id: employee.id,
        email: employee.email,
        employeeId: employee.employee_id,
        companyId: employee.company_id,
        fullName: employee.full_name,
        profilePhotoUrl: employee.profile_photo_url || null,
        isHR: isHR,
        profileStatus: profileStatus,
        isFirstLogin: false, // Not first login if OAuth is happening
        isProfileApproved: isProfileApproved,
        hasLinkedIn: hasLinkedIn,
        hasGitHub: hasGitHub,
        bothOAuthConnected: bothConnected,
        isTrainer: isTrainer,
        isDecisionMaker: isDecisionMaker
      };

      // Generate dummy token for the employee (same format as login)
      const dummyToken = `dummy-token-${employee.id}-${employee.email}-${Date.now()}`;
      console.log('[OAuthController] Generated dummy token for employee:', employee.id);

      // Encode user object as base64 JSON for URL
      const userDataEncoded = Buffer.from(JSON.stringify(userObject)).toString('base64');

      // Check if both OAuth connections are complete
      const isReady = await this.enrichProfileUseCase.isReadyForEnrichment(employeeId);
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      if (isReady) {
        // Both connected - trigger enrichment synchronously (wait for it to complete)
        console.log('[OAuthController] Both OAuth connections complete, triggering enrichment...');
        try {
          const enrichmentResult = await this.enrichProfileUseCase.enrichProfile(employeeId);
          console.log('[OAuthController] ✅ Profile enrichment completed:', enrichmentResult);
          
          // Update user object after enrichment
          userObject.profileStatus = 'enriched';
          const updatedUserDataEncoded = Buffer.from(JSON.stringify(userObject)).toString('base64');
          
          // After enrichment completes, redirect to enrich page with both connected status, token, and user
          return res.redirect(`${frontendUrl}/enrich?linkedin=connected&github=connected&enriched=true&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(updatedUserDataEncoded)}`);
        } catch (error) {
          console.error('[OAuthController] ❌ Enrichment failed:', error);
          // Still redirect to enrich page, but with error, token, and user
          return res.redirect(`${frontendUrl}/enrich?linkedin=connected&github=connected&error=${encodeURIComponent(error.message)}&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
        }
      } else {
        // Only GitHub connected - go back to enrich page to connect LinkedIn with token and user
        console.log('[OAuthController] GitHub connected, waiting for LinkedIn. Redirecting back to enrich page');
        return res.redirect(`${frontendUrl}/enrich?github=connected&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
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

