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
    
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
    // When split by '-', UUID becomes 5 parts: [xxxxxxxx, xxxx, xxxx, xxxx, xxxxxxxxxxxx]
    // So in token: dummy-token-{uuid-part1}-{uuid-part2}-{uuid-part3}-{uuid-part4}-{uuid-part5}-{email}-{timestamp}
    // parts[0] = "dummy", parts[1] = "token", parts[2-6] = UUID parts, parts[7] = email, parts[8] = timestamp
    
    // Find the email part (contains '@')
    let emailIndex = -1;
    for (let i = 2; i < parts.length; i++) {
      if (parts[i].includes('@')) {
        emailIndex = i;
        break;
      }
    }
    
    if (emailIndex > 2) {
      // New format: dummy-token-{uuid}-{email}-{timestamp}
      // UUID is parts[2] to parts[emailIndex-1] (joined with '-')
      // Email is parts[emailIndex]
      // Timestamp is parts[emailIndex+1] (last part)
      
      const uuidParts = parts.slice(2, emailIndex);
      const employeeId = uuidParts.join('-');
      const email = parts[emailIndex];
      
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
      
      try {
        console.log('[DummyAuthProvider] Extracted employeeId:', employeeId);
        console.log('[DummyAuthProvider] Extracted email:', email);
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(employeeId)) {
          console.log('[DummyAuthProvider] Invalid UUID format, trying email lookup...');
          // If UUID is invalid, try email lookup
          const employeeByEmail = await this.employeeRepository.findByEmail(email.toLowerCase());
          if (employeeByEmail) {
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
            error: 'Invalid token format or employee not found'
          };
        }
        
        // Look up employee from database by ID
        let employee = null;
        try {
          employee = await this.employeeRepository.findById(employeeId);
        } catch (dbError) {
          console.error('[DummyAuthProvider] Database error looking up by ID:', dbError.message);
          // If database error, try email lookup as fallback
          console.log('[DummyAuthProvider] Trying email lookup as fallback...');
          const employeeByEmail = await this.employeeRepository.findByEmail(email.toLowerCase());
          if (employeeByEmail) {
            employee = employeeByEmail;
          }
        }
        
        if (!employee) {
          console.log('[DummyAuthProvider] Employee not found by ID, trying email...');
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
          
          console.error('[DummyAuthProvider] Employee not found by ID or email');
          return {
            valid: false,
            error: 'Employee not found'
          };
        }
        
        // Get company to check HR status
        let company = null;
        try {
          company = await this.companyRepository.findById(employee.company_id);
        } catch (dbError) {
          console.error('[DummyAuthProvider] Error looking up company:', dbError.message);
          // Continue without company info - isHR will be false
        }
        
        const isHR = company && company.hr_contact_email && 
                     company.hr_contact_email.toLowerCase() === email.toLowerCase();
        
        // Ensure we have all required fields
        if (!employee.id) {
          console.error('[DummyAuthProvider] Employee record missing ID field');
          return {
            valid: false,
            error: 'Invalid employee record'
          };
        }
        
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
        // Don't return valid token if we can't get full user info
        // OAuth endpoints require req.user.id
        return {
          valid: false,
          error: 'Failed to validate token: ' + (error.message || 'Unknown error')
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
    
    console.log('[DummyAuthProvider] Headers received:', Object.keys(headers));
    console.log('[DummyAuthProvider] Authorization header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'missing');
    
    if (authHeader) {
      // Remove "Bearer " prefix if present
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      console.log('[DummyAuthProvider] Extracted token:', token ? `${token.substring(0, 30)}...` : 'null');
      return token;
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

