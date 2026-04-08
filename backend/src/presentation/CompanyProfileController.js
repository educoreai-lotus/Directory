// Presentation Layer - Company Profile Controller
// Handles HTTP requests for company profile data

const GetCompanyProfileUseCase = require('../application/GetCompanyProfileUseCase');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');

class CompanyProfileController {
  constructor() {
    this.getCompanyProfileUseCase = new GetCompanyProfileUseCase();
    this.employeeRepository = new EmployeeRepository();
    this.companyRepository = new CompanyRepository();
  }

  getRequesterDirectoryUserId(req) {
    return req.user?.directoryUserId || req.user?.id || null;
  }

  getRequesterCompanyId(req) {
    return req.user?.organizationId || req.user?.companyId || req.user?.company_id || null;
  }

  isSystemAdmin(req) {
    return req.user?.isSystemAdmin === true;
  }

  async isHrForCompany(req, companyId) {
    const requesterId = this.getRequesterDirectoryUserId(req);
    if (!requesterId) return false;
    const requesterEmployee = await this.employeeRepository.findById(requesterId);
    if (!requesterEmployee) return false;
    if (String(requesterEmployee.company_id) !== String(companyId)) return false;

    const profile = await this.companyRepository.findById(companyId);
    if (!profile || !profile.hr_contact_email) return false;
    return (
      String(profile.hr_contact_email).trim().toLowerCase() ===
      String(requesterEmployee.email || '').trim().toLowerCase()
    );
  }

  /**
   * Get company profile
   * GET /api/v1/companies/:id/profile
   */
  async getProfile(req, res, next) {
    try {
      const { id: companyId } = req.params;
      const admin = this.isSystemAdmin(req);
      const hrInCompany = await this.isHrForCompany(req, companyId);

      // Allow only: system admin OR HR of that company.
      if (!admin && !hrInCompany) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      console.log(`[CompanyProfileController] Fetching profile for company ${companyId}`);

      const profile = await this.getCompanyProfileUseCase.execute(companyId);

      // Debug logging
      console.log(`[CompanyProfileController] Company logo_url: ${profile.company?.logo_url || 'NOT SET'}`);

      res.status(200).json({
        company: profile.company,
        departments: profile.departments,
        teams: profile.teams,
        employees: profile.employees,
        hierarchy: profile.hierarchy,
        metrics: profile.metrics,
        pending_approvals: profile.pending_approvals || []
      });
    } catch (error) {
      console.error('[CompanyProfileController] Error fetching company profile:', error);
      if (error.message === 'Company not found') {
        return res.status(404).json({
          error: 'Company not found'
        });
      }
      res.status(500).json({
        error: error.message || 'An error occurred while fetching company profile'
      });
    }
  }
}

module.exports = CompanyProfileController;

