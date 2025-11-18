// Application Layer - Authenticate User Use Case
// Handles user authentication logic

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const AuthFactory = require('../infrastructure/auth/AuthFactory');
const bcrypt = require('bcrypt');

class AuthenticateUserUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.companyRepository = new CompanyRepository();
    this.authProvider = AuthFactory.create();
  }

  /**
   * Authenticate a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{success: boolean, token?: string, user?: object, error?: string}>}
   */
  async execute(email, password) {
    try {
      // Validate inputs
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Find employee by email
      const normalizedEmail = email.toLowerCase().trim();
      const employee = await this.employeeRepository.findByEmail(normalizedEmail);
      
      if (!employee) {
        console.log(`[AuthenticateUserUseCase] Employee not found for email: ${normalizedEmail}`);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
      
      console.log(`[AuthenticateUserUseCase] Found employee: ${employee.email} (ID: ${employee.id})`);

      // Check password
      // In dummy mode, we check against stored password_hash
      // In real auth mode, AuthProvider handles this
      const authMode = this.authProvider.getMode();
      
      if (authMode === 'dummy') {
        // In dummy mode, verify password using bcrypt
        if (!employee.password_hash) {
          // If no password hash, check if password matches a default or plain text
          // For testing: allow any password if no hash exists
          // In production, this should never happen
          console.warn(`[AuthenticateUserUseCase] Employee ${email} has no password hash - allowing login in dummy mode`);
        } else {
          // Verify password hash
          const passwordMatch = await bcrypt.compare(password, employee.password_hash);
          if (!passwordMatch) {
            console.log(`[AuthenticateUserUseCase] Password mismatch for email: ${normalizedEmail}`);
            return {
              success: false,
              error: 'Invalid email or password'
            };
          }
          console.log(`[AuthenticateUserUseCase] Password verified successfully for: ${normalizedEmail}`);
        }
      } else {
        // In auth-service mode, use AuthProvider to authenticate
        const authResult = await this.authProvider.authenticate(email, password);
        if (!authResult.success) {
          return authResult;
        }
        // AuthProvider returns token and user, but we need to merge with employee data
        return {
          success: true,
          token: authResult.token,
          user: {
            ...authResult.user,
            id: employee.id,
            employeeId: employee.employee_id,
            companyId: employee.company_id,
            fullName: employee.full_name,
            email: employee.email
          }
        };
      }

      // Get company to check if employee is HR
      const company = await this.companyRepository.findById(employee.company_id);
      const isHR = company && company.hr_contact_email && 
                   company.hr_contact_email.toLowerCase() === email.toLowerCase();

      // Check if profile is enriched (for routing logic)
      // profile_status: 'basic', 'enriched', 'approved', 'rejected'
      // Note: profile_status field will be added in future migration for HR approval workflow
      const profileStatus = employee.profile_status || 'basic';
      const isFirstLogin = profileStatus === 'basic';
      const isProfileApproved = profileStatus === 'approved' || profileStatus === 'basic'; // For now, allow basic profiles

      // Generate token using AuthProvider (in dummy mode, it will use DummyAuthProvider)
      // But we need to pass real employee data, so we'll generate token directly
      let token;
      if (authMode === 'dummy') {
        // Generate dummy token with employee info
        token = `dummy-token-${employee.id}-${employee.email}-${Date.now()}`;
      } else {
        // In real auth mode, token comes from AuthProvider
        // This case is handled above
        token = null; // Should not reach here
      }

      return {
        success: true,
        token: token,
        user: {
          id: employee.id,
          email: employee.email,
          employeeId: employee.employee_id,
          companyId: employee.company_id,
          fullName: employee.full_name,
          isHR: isHR,
          profileStatus: profileStatus,
          isFirstLogin: isFirstLogin,
          isProfileApproved: isProfileApproved
        }
      };
    } catch (error) {
      console.error('[AuthenticateUserUseCase] Error:', error);
      return {
        success: false,
        error: 'An error occurred during authentication. Please try again.'
      };
    }
  }
}

module.exports = AuthenticateUserUseCase;

