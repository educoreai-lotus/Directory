// Presentation Layer - Company Verification Controller
// Handles HTTP requests for company verification

const VerifyCompanyUseCase = require('../application/VerifyCompanyUseCase');

class CompanyVerificationController {
  constructor() {
    this.verifyCompanyUseCase = new VerifyCompanyUseCase();
  }

  /**
   * Get company verification status
   * GET /api/v1/companies/:id/verification
   */
  async getStatus(req, res, next) {
    try {
      const { id } = req.params;
      const result = await this.verifyCompanyUseCase.getStatus(id);
      
      console.log(`[CompanyVerificationController] Returning status for company ${id}:`, result.verification_status);
      
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Company not found') {
        return res.status(404).json({
          error: error.message
        });
      }

      console.error('Get verification status error:', error);
      res.status(500).json({
        error: 'An error occurred while fetching verification status'
      });
    }
  }

  /**
   * Verify company domain
   * POST /api/v1/companies/:id/verify
   */
  async verify(req, res, next) {
    try {
      const { id } = req.params;
      const result = await this.verifyCompanyUseCase.verifyDomain(id);
      
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Company not found') {
        return res.status(404).json({
          error: error.message
        });
      }

      console.error('Verify company error:', error);
      res.status(500).json({
        error: 'An error occurred during company verification'
      });
    }
  }

  /**
   * Approve company (Directory Admin only)
   * POST /api/v1/companies/:id/approve
   */
  async approve(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id; // TODO: Get from auth middleware
      const result = await this.verifyCompanyUseCase.approveCompany(id, adminId);
      
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Company not found') {
        return res.status(404).json({
          error: error.message
        });
      }

      console.error('Approve company error:', error);
      res.status(500).json({
        error: 'An error occurred while approving company'
      });
    }
  }

  /**
   * Reject company (Directory Admin only)
   * POST /api/v1/companies/:id/reject
   */
  async reject(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id; // TODO: Get from auth middleware
      const { reason } = req.body;
      const result = await this.verifyCompanyUseCase.rejectCompany(id, adminId, reason);
      
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Company not found') {
        return res.status(404).json({
          error: error.message
        });
      }

      console.error('Reject company error:', error);
      res.status(500).json({
        error: 'An error occurred while rejecting company'
      });
    }
  }
}

module.exports = CompanyVerificationController;

