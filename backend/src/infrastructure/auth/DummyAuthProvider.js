// Dummy Authentication Provider
// FOR TESTING ONLY - NOT SECURE - DO NOT USE IN PRODUCTION
// This provider allows testing Directory functionality without real authentication

const AuthProvider = require('./AuthProvider');
const config = require('../../config');
const EmployeeRepository = require('../EmployeeRepository');
const CompanyRepository = require('../CompanyRepository');

/**
 * Dummy Authentication Provider
 * 
 * ⚠️ WARNING: This is for local testing only!
 * - No real authentication
 * - No real JWT validation
 * - Returns fake user sessions
 * - NOT SECURE - DO NOT USE IN PRODUCTION
 */
class DummyAuthProvider extends AuthProvider {
  constructor() {
    super();
    this.testUsers = config.auth.dummy.testUsers;
    this.employeeRepository = new EmployeeRepository();
    this.companyRepository = new CompanyRepository();
  }

  /**
   * Authenticate a user (dummy - always succeeds if email exists in test users)
   * @param {string} email - User email
   * @param {string} password - User password (ignored in dummy mode)
   * @returns {Promise<{success: boolean, token?: string, user?: object, error?: string}>}
   */
  async authenticate(email, password) {
    // In dummy mode, we just check if email exists in test users
    // Password is ignored
    const user = this.testUsers[email.toLowerCase()];
    
    if (!user) {
      return {
        success: false,
        error: 'Invalid email. Use one of the test emails: ' + Object.keys(this.testUsers).join(', ')
      };
    }

    // Generate a dummy token (just a simple string, not a real JWT)
    const dummyToken = `dummy-token-${email}-${Date.now()}`;

    return {
      success: true,
      token: dummyToken,
      user: {
        email: email.toLowerCase(),
        employeeId: user.employeeId,
        companyId: user.companyId,
        isHR: user.isHR,
        fullName: user.fullName
      }
    };
  }

  /**
   * Validate a token (dummy - always succeeds if token format is correct)
   * @param {string} token - Dummy token
   * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
   */
  async validateToken(token) {
    // In dummy mode, we just check if token starts with "dummy-token-"
    // This is NOT secure - just for testing
    if (!token || !token.startsWith('dummy-token-')) {
      return {
        valid: false,
        error: 'Invalid token format'
      };
    }

    // Token format: dummy-token-{employeeId}-{email}-{timestamp}
    // Or: dummy-token-{email}-{timestamp} (old format for test users)
    const parts = token.split('-');
    if (parts.length < 3) {
      return {
        valid: false,
        error: 'Invalid token format'
      };
    }

    // Check if token has employee ID (new format) or just email (old format)
    // New format: dummy-token-{uuid}-{email}-{timestamp}
    // Old format: dummy-token-{email}-{timestamp}
    
    // Try to parse as new format first (has UUID)
    // UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
    // Or we can check if parts[2] looks like a UUID (contains multiple dashes when joined)
    
    // For now, we'll use a simpler approach:
    // If token has more than 4 parts (dummy-token-{id}-{email}-{timestamp}), it's new format
    // Otherwise, it's old format (dummy-token-{email}-{timestamp})
    
    if (parts.length >= 5) {
      // New format: dummy-token-{employeeId}-{email}-{timestamp}
      // Extract email (everything between employeeId and timestamp)
      // Last part is timestamp, so email is parts[3] to parts[length-2]
      const emailParts = parts.slice(3, -1);
      const email = emailParts.join('-');
      
      // Check test users first
      const testUser = this.testUsers[email.toLowerCase()];
      if (testUser) {
        return {
          valid: true,
          user: {
            email: email.toLowerCase(),
            employeeId: testUser.employeeId,
            companyId: testUser.companyId,
            isHR: testUser.isHR,
            fullName: testUser.fullName
          }
        };
      }
      
      // If not in test users, extract employee ID from token and look up from database
      // Token format: dummy-token-{employeeId}-{email}-{timestamp}
      // parts[2] should be the employee ID (UUID)
      const employeeId = parts[2];
      
      try {
        // Look up employee from database
        const employee = await this.employeeRepository.findById(employeeId);
        
        if (!employee) {
          // Fallback: try to find by email
          const employeeByEmail = await this.employeeRepository.findByEmail(email.toLowerCase());
          if (employeeByEmail) {
            // Get company to check HR status
            const company = await this.companyRepository.findById(employeeByEmail.company_id);
            const isHR = company && company.hr_contact_email && 
                         company.hr_contact_email.toLowerCase() === email.toLowerCase();
            
            return {
              valid: true,
              user: {
                id: employeeByEmail.id,
                email: employeeByEmail.email,
                employeeId: employeeByEmail.employee_id,
                companyId: employeeByEmail.company_id,
                fullName: employeeByEmail.full_name,
                isHR: isHR
              }
            };
          }
          
          return {
            valid: false,
            error: 'Employee not found'
          };
        }
        
        // Get company to check HR status
        const company = await this.companyRepository.findById(employee.company_id);
        const isHR = company && company.hr_contact_email && 
                     company.hr_contact_email.toLowerCase() === email.toLowerCase();
        
        return {
          valid: true,
          user: {
            id: employee.id,
            email: employee.email,
            employeeId: employee.employee_id,
            companyId: employee.company_id,
            fullName: employee.full_name,
            isHR: isHR
          }
        };
      } catch (error) {
        console.error('[DummyAuthProvider] Error looking up employee:', error);
        // Still return valid with email only as fallback
        return {
          valid: true,
          user: {
            email: email.toLowerCase()
          }
        };
      }
    } else {
      // Old format: dummy-token-{email}-{timestamp}
      const email = parts.slice(2, -1).join('-');
      const user = this.testUsers[email.toLowerCase()];

      if (!user) {
        return {
          valid: false,
          error: 'User not found in test users'
        };
      }

      return {
        valid: true,
        user: {
          email: email.toLowerCase(),
          employeeId: user.employeeId,
          companyId: user.companyId,
          isHR: user.isHR,
          fullName: user.fullName
        }
      };
    }
  }

  /**
   * Extract token from request headers (dummy mode)
   * @param {object} headers - Request headers
   * @returns {string|null} - Extracted token or null
   */
  extractTokenFromHeaders(headers) {
    // In dummy mode, check for Authorization header or custom header
    const authHeader = headers.authorization || headers.Authorization;
    
    if (authHeader) {
      // Remove "Bearer " prefix if present
      return authHeader.replace(/^Bearer\s+/i, '').trim();
    }

    // Also check for custom header (for testing)
    const customHeader = headers['x-dummy-token'] || headers['X-Dummy-Token'];
    if (customHeader) {
      return customHeader;
    }

    return null;
  }
}

module.exports = DummyAuthProvider;

