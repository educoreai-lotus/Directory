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
      // Handle envelope structure from parseRequest middleware or frontend API interceptor
      // parseRequest sets req.parsedBody, but we check req.body.payload first for compatibility
      const companyData = req.parsedBody || req.body.payload || req.body;
      
      // Debug logging (remove in production)
      console.log('Received company data:', JSON.stringify(companyData, null, 2));
      
      // Execute registration (atomic operation - all or nothing)
      const result = await this.registerCompanyUseCase.execute(companyData);
      
      // Only send success response if everything succeeded
      // Note: responseFormatter middleware will wrap this in the standard format
      res.status(201).json(result);
    } catch (error) {
      // Handle validation errors (400 Bad Request)
      if (error.message.includes('already exists') || 
          error.message.includes('already completed registration') ||
          error.message.includes('required') ||
          error.message.includes('Invalid') ||
          error.message.includes('format')) {
        console.error('Validation error:', error.message);
        // Note: responseFormatter middleware will wrap this in the standard format
        return res.status(400).json({
          error: error.message
        });
      }

      // Handle database/transaction errors (500 Internal Server Error)
      console.error('Company registration error:', error);
      
      // Check if it's a database constraint error
      if (error.code === '23505') { // Unique violation
        // Note: responseFormatter middleware will wrap this in the standard format
        return res.status(400).json({
          error: 'A company with this domain already exists. Please use a different domain or contact support if you believe this is an error.'
        });
      }
      
      // Note: responseFormatter middleware will wrap this in the standard format
      res.status(500).json({
        error: 'An error occurred during company registration. No data was saved. Please try again.'
      });
    }
  }
}

module.exports = CompanyRegistrationController;

