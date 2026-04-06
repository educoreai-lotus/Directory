// Presentation Layer - Authentication Controller
// GET /auth/me only; Directory does not perform password login (nAuth issues tokens).

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const AdminRepository = require('../infrastructure/AdminRepository');

/**
 * Expand JWT context into the same user shape the frontend expects (profile, OAuth flags, roles).
 * @param {object} reqUser - req.user from authMiddleware (nAuth)
 * @returns {Promise<object>}
 */
async function buildMeUserPayload(reqUser) {
  const uid = reqUser.directoryUserId || reqUser.id;
  if (!uid) {
    return reqUser;
  }

  const employeeRepo = new EmployeeRepository();
  const companyRepo = new CompanyRepository();
  const adminRepo = new AdminRepository();

  const employee = await employeeRepo.findById(uid);
  if (employee) {
    const company = await companyRepo.findById(employee.company_id);
    const isHR =
      company &&
      company.hr_contact_email &&
      company.hr_contact_email.toLowerCase() === String(employee.email || '').toLowerCase();

    const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
    const rolesResult = await employeeRepo.pool.query(rolesQuery, [uid]);
    const roles = rolesResult.rows.map((row) => row.role_type);
    const isTrainer = roles.includes('TRAINER');
    const isDecisionMaker = roles.includes('DECISION_MAKER');

    const profileStatus = employee.profile_status || 'basic';
    const hasLinkedIn = !!employee.linkedin_data;
    const hasGitHub = !!employee.github_data;

    return {
      ...reqUser,
      id: employee.id,
      directoryUserId: employee.id,
      email: employee.email,
      employeeId: employee.employee_id,
      companyId: employee.company_id,
      organizationId: employee.company_id,
      company_id: employee.company_id,
      fullName: employee.full_name,
      profilePhotoUrl: employee.profile_photo_url || null,
      isHR,
      profileStatus,
      isFirstLogin: profileStatus === 'basic',
      isProfileApproved: profileStatus === 'approved',
      hasLinkedIn,
      hasGitHub,
      bothOAuthConnected: hasLinkedIn && hasGitHub,
      isTrainer,
      isDecisionMaker
    };
  }

  if (reqUser.isSystemAdmin === true) {
    const admin = await adminRepo.findById(uid);
    if (admin) {
      return {
        ...reqUser,
        id: admin.id,
        directoryUserId: admin.id,
        email: admin.email,
        fullName: admin.full_name,
        role: 'DIRECTORY_ADMIN',
        isAdmin: true,
        isSystemAdmin: true,
        companyId: null
      };
    }
  }

  return reqUser;
}

class AuthController {
  /**
   * Get current user info (validate token + hydrate profile for employees/admins)
   * GET /api/v1/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          requester_service: 'directory_service',
          response: {
            error: 'Authentication required'
          }
        });
      }

      const user = await buildMeUserPayload(req.user);

      return res.status(200).json({
        requester_service: 'directory_service',
        response: {
          user
        }
      });
    } catch (error) {
      console.error('[AuthController] Get current user error:', error);
      return res.status(500).json({
        requester_service: 'directory_service',
        response: {
          error: 'An error occurred. Please try again.'
        }
      });
    }
  }
}

module.exports = AuthController;
