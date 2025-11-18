// Presentation Layer - Company Profile Controller
// Handles HTTP requests for company profile data

const GetCompanyProfileUseCase = require('../application/GetCompanyProfileUseCase');

class CompanyProfileController {
  constructor() {
    this.getCompanyProfileUseCase = new GetCompanyProfileUseCase();
  }

  /**
   * Get company profile
   * GET /api/v1/companies/:id/profile
   */
  async getProfile(req, res, next) {
    try {
      const { id: companyId } = req.params;

      console.log(`[CompanyProfileController] Fetching profile for company ${companyId}`);

      const profile = await this.getCompanyProfileUseCase.execute(companyId);

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

