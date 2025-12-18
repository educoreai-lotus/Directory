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
      console.log('[OAuthController] ========== LINKEDIN CALLBACK RECEIVED ==========');
      console.log('[OAuthController] Query params:', JSON.stringify(req.query));
      
      const { code, state, error } = req.query;

      // Check for OAuth errors
      if (error) {
        console.error('[OAuthController] LinkedIn OAuth error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        // Handle specific error types with better messages
        let errorMessage = error;
        if (error === 'unauthorized_scope_error') {
          errorMessage = 'LinkedIn app does not have required permissions. Please check LinkedIn Developer Portal settings. See docs/LINKEDIN-SCOPES-SETUP.md for instructions.';
          console.error('[OAuthController] ⚠️  Unauthorized scope error - LinkedIn app may need product approvals or scope configuration');
        } else if (error === 'access_denied') {
          errorMessage = 'LinkedIn connection was cancelled or denied. Please try again.';
        }
        
        // Redirect to frontend with error
        return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}`);
      }

      if (!code || !state) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/enrich?error=missing_code_or_state`);
      }

      // Handle callback
      const result = await this.connectLinkedInUseCase.handleCallback(code, state);
      console.log('[OAuthController] LinkedIn connected successfully for employee:', result.employee.id);

      // PHASE_3: Dual-write strategy - also save LinkedIn data to new employee_raw_data table
      // This is non-critical - if it fails, OAuth flow continues normally
      try {
        const EmployeeRepository = require('../infrastructure/EmployeeRepository');
        const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
        const employeeRepo = new EmployeeRepository();
        const rawDataRepo = new EmployeeRawDataRepository();
        
        // Get the saved LinkedIn data from the employee record
        const employee = await employeeRepo.findById(result.employee.id);
        if (employee && employee.linkedin_data) {
          const linkedinData = typeof employee.linkedin_data === 'string' 
            ? JSON.parse(employee.linkedin_data) 
            : employee.linkedin_data;
          
          await rawDataRepo.createOrUpdate(result.employee.id, 'linkedin', linkedinData);
          console.log('[OAuthController] ✅ PHASE_3: Saved LinkedIn data to employee_raw_data table');
        }
      } catch (error) {
        // PHASE_3: Non-critical - log warning but don't break OAuth flow
        console.warn('[OAuthController] ⚠️  PHASE_3: Failed to save LinkedIn data to new table (non-critical):', error.message);
        // Continue with existing OAuth flow
      }

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

      // CRITICAL: Do NOT trigger enrichment automatically in OAuth callback
      // Enrichment should ONLY happen when user clicks "Continue to Your Profile" button
      // Just redirect back to enrich page with connection status
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      if (hasLinkedIn && hasGitHub) {
        // Both connected - redirect to enrich page (user will click "Continue" to trigger enrichment)
        console.log('[OAuthController] Both OAuth connections complete. Redirecting to enrich page - user must click "Continue" to trigger enrichment');
        return res.redirect(`${frontendUrl}/enrich?linkedin=connected&github=connected&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
      } else {
        // Only LinkedIn connected - go back to enrich page to connect GitHub with token and user
        console.log('[OAuthController] LinkedIn connected, waiting for GitHub. Redirecting back to enrich page');
        return res.redirect(`${frontendUrl}/enrich?linkedin=connected&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
      }
    } catch (error) {
      console.error('[OAuthController] LinkedIn callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorMessage = error.message || 'Failed to connect LinkedIn';
      
      // CRITICAL: Even on error, we need to preserve the user session
      // Extract employee ID from state to build user object
      try {
        const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
        const employeeId = stateData.employeeId;
        
        if (employeeId) {
          // Get employee data to build user object (for session preservation)
          const EmployeeRepository = require('../infrastructure/EmployeeRepository');
          const CompanyRepository = require('../infrastructure/CompanyRepository');
          const employeeRepo = new EmployeeRepository();
          const companyRepo = new CompanyRepository();
          
          const employee = await employeeRepo.findById(employeeId);
          if (employee) {
            const company = await companyRepo.findById(employee.company_id);
            const isHR = company && company.hr_contact_email && 
                         company.hr_contact_email.toLowerCase() === employee.email.toLowerCase();
            
            const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
            const rolesResult = await employeeRepo.pool.query(rolesQuery, [employeeId]);
            const roles = rolesResult.rows.map(row => row.role_type);
            const isTrainer = roles.includes('TRAINER');
            const isDecisionMaker = roles.includes('DECISION_MAKER');
            
            const profileStatus = employee.profile_status || 'basic';
            const hasLinkedIn = !!employee.linkedin_data;
            const hasGitHub = !!employee.github_data;
            
            const userObject = {
              id: employee.id,
              email: employee.email,
              employeeId: employee.employee_id,
              companyId: employee.company_id,
              fullName: employee.full_name,
              profilePhotoUrl: employee.profile_photo_url || null,
              isHR: isHR,
              profileStatus: profileStatus,
              isFirstLogin: false,
              isProfileApproved: profileStatus === 'approved',
              hasLinkedIn: hasLinkedIn,
              hasGitHub: hasGitHub,
              bothOAuthConnected: hasLinkedIn && hasGitHub,
              isTrainer: isTrainer,
              isDecisionMaker: isDecisionMaker
            };
            
            const dummyToken = `dummy-token-${employee.id}-${employee.email}-${Date.now()}`;
            const userDataEncoded = Buffer.from(JSON.stringify(userObject)).toString('base64');
            
            // Redirect with error, but include token + user to preserve session
            console.log('[OAuthController] Error occurred, but preserving session with token + user');
            return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
          }
        }
      } catch (stateError) {
        console.error('[OAuthController] Failed to extract employee from state:', stateError);
      }
      
      // Fallback: redirect with error only (no token/user - will require re-login)
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
      console.log('[OAuthController] ========== GITHUB CALLBACK RECEIVED ==========');
      console.log('[OAuthController] Query params:', JSON.stringify(req.query));
      
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

      // PHASE_3: Dual-write strategy - also save GitHub data to new employee_raw_data table
      // This is non-critical - if it fails, OAuth flow continues normally
      try {
        const EmployeeRepository = require('../infrastructure/EmployeeRepository');
        const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
        const employeeRepo = new EmployeeRepository();
        const rawDataRepo = new EmployeeRawDataRepository();
        
        // Get the saved GitHub data from the employee record
        const employee = await employeeRepo.findById(result.employee.id);
        if (employee && employee.github_data) {
          const githubData = typeof employee.github_data === 'string' 
            ? JSON.parse(employee.github_data) 
            : employee.github_data;
          
          await rawDataRepo.createOrUpdate(result.employee.id, 'github', githubData);
          console.log('[OAuthController] ✅ PHASE_3: Saved GitHub data to employee_raw_data table');
        }
      } catch (error) {
        // PHASE_3: Non-critical - log warning but don't break OAuth flow
        console.warn('[OAuthController] ⚠️  PHASE_3: Failed to save GitHub data to new table (non-critical):', error.message);
        // Continue with existing OAuth flow
      }

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

      // CRITICAL: Do NOT trigger enrichment automatically in OAuth callback
      // Enrichment should ONLY happen when user clicks "Continue to Your Profile" button
      // Just redirect back to enrich page with connection status
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      if (hasLinkedIn && hasGitHub) {
        // Both connected - redirect to enrich page (user will click "Continue" to trigger enrichment)
        console.log('[OAuthController] Both OAuth connections complete. Redirecting to enrich page - user must click "Continue" to trigger enrichment');
        return res.redirect(`${frontendUrl}/enrich?linkedin=connected&github=connected&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
      } else {
        // Only GitHub connected - go back to enrich page to connect LinkedIn with token and user
        console.log('[OAuthController] GitHub connected, waiting for LinkedIn. Redirecting back to enrich page');
        return res.redirect(`${frontendUrl}/enrich?github=connected&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
      }
    } catch (error) {
      console.error('[OAuthController] GitHub callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorMessage = error.message || 'Failed to connect GitHub';
      
      // CRITICAL: Even on error, we need to preserve the user session
      // Extract employee ID from state to build user object
      try {
        const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
        const employeeId = stateData.employeeId;
        
        if (employeeId) {
          // Get employee data to build user object (for session preservation)
          const EmployeeRepository = require('../infrastructure/EmployeeRepository');
          const CompanyRepository = require('../infrastructure/CompanyRepository');
          const employeeRepo = new EmployeeRepository();
          const companyRepo = new CompanyRepository();
          
          const employee = await employeeRepo.findById(employeeId);
          if (employee) {
            const company = await companyRepo.findById(employee.company_id);
            const isHR = company && company.hr_contact_email && 
                         company.hr_contact_email.toLowerCase() === employee.email.toLowerCase();
            
            const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
            const rolesResult = await employeeRepo.pool.query(rolesQuery, [employeeId]);
            const roles = rolesResult.rows.map(row => row.role_type);
            const isTrainer = roles.includes('TRAINER');
            const isDecisionMaker = roles.includes('DECISION_MAKER');
            
            const profileStatus = employee.profile_status || 'basic';
            const hasLinkedIn = !!employee.linkedin_data;
            const hasGitHub = !!employee.github_data;
            
            const userObject = {
              id: employee.id,
              email: employee.email,
              employeeId: employee.employee_id,
              companyId: employee.company_id,
              fullName: employee.full_name,
              profilePhotoUrl: employee.profile_photo_url || null,
              isHR: isHR,
              profileStatus: profileStatus,
              isFirstLogin: false,
              isProfileApproved: profileStatus === 'approved',
              hasLinkedIn: hasLinkedIn,
              hasGitHub: hasGitHub,
              bothOAuthConnected: hasLinkedIn && hasGitHub,
              isTrainer: isTrainer,
              isDecisionMaker: isDecisionMaker
            };
            
            const dummyToken = `dummy-token-${employee.id}-${employee.email}-${Date.now()}`;
            const userDataEncoded = Buffer.from(JSON.stringify(userObject)).toString('base64');
            
            // Redirect with error, but include token + user to preserve session
            console.log('[OAuthController] Error occurred, but preserving session with token + user');
            return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}&token=${encodeURIComponent(dummyToken)}&user=${encodeURIComponent(userDataEncoded)}`);
          }
        }
      } catch (stateError) {
        console.error('[OAuthController] Failed to extract employee from state:', stateError);
      }
      
      // Fallback: redirect with error only (no token/user - will require re-login)
      return res.redirect(`${frontendUrl}/enrich?error=${encodeURIComponent(errorMessage)}`);
    }
  }
}

module.exports = OAuthController;

