// Presentation Layer - Company Registration Controller
// Handles HTTP requests for company registration

const RegisterCompanyUseCase = require('../application/RegisterCompanyUseCase');

class CompanyRegistrationController {
  constructor() {
    this.registerCompanyUseCase = new RegisterCompanyUseCase();
  }

  /**
   * Register a new company
   * POST /api/v1/companies/register
   */
  async register(req, res, next) {
    try {
      const companyData = req.body;
      
      // Debug logging (remove in production)
      console.log('Received company data:', JSON.stringify(companyData, null, 2));
      
      const result = await this.registerCompanyUseCase.execute(companyData);
      
      res.status(201).json(result);
    } catch (error) {
      // Handle known errors
      if (error.message.includes('already exists') || 
          error.message.includes('required') ||
          error.message.includes('Invalid')) {
        console.error('Validation error:', error.message);
        return res.status(400).json({
          error: error.message
        });
      }

      // Handle unknown errors
      console.error('Company registration error:', error);
      res.status(500).json({
        error: 'An error occurred during company registration'
      });
    }
  }
}

module.exports = CompanyRegistrationController;

