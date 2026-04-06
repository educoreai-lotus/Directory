// Presentation Layer - Enrichment Controller
// Handles profile enrichment endpoints

const EnrichProfileUseCase = require('../application/EnrichProfileUseCase');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');

class EnrichmentController {
  constructor() {
    this.enrichProfileUseCase = new EnrichProfileUseCase();
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

    const company = await this.companyRepository.findById(companyId);
    if (!company || !company.hr_contact_email) return false;
    return (
      String(company.hr_contact_email).trim().toLowerCase() ===
      String(requesterEmployee.email || '').trim().toLowerCase()
    );
  }

  async canAccessEmployee(req, targetEmployeeId) {
    const target = await this.employeeRepository.findById(targetEmployeeId);
    if (!target) {
      return { allowed: false, reason: 'not_found', target: null };
    }

    if (this.isSystemAdmin(req)) {
      return { allowed: true, reason: 'system_admin', target };
    }

    const requesterId = this.getRequesterDirectoryUserId(req);
    if (requesterId && String(requesterId) === String(targetEmployeeId)) {
      return { allowed: true, reason: 'self', target };
    }

    const requesterCompanyId = this.getRequesterCompanyId(req);
    if (!requesterCompanyId || String(requesterCompanyId) !== String(target.company_id)) {
      return { allowed: false, reason: 'forbidden', target };
    }

    const hr = await this.isHrForCompany(req, target.company_id);
    if (hr) {
      return { allowed: true, reason: 'hr', target };
    }

    return { allowed: false, reason: 'forbidden', target };
  }

  /**
   * Trigger profile enrichment manually
   * POST /api/v1/employees/:employeeId/enrich
   * Requires authentication
   */
  async enrichProfile(req, res, next) {
    console.log("[EnrichmentController] enrichProfile START", req.params.employeeId);
    console.log('[EnrichmentController] enrichProfile called');
    console.log('[EnrichmentController] Request params:', req.params);
    console.log('[EnrichmentController] Request body:', req.body);
    console.log('[EnrichmentController] Request user:', req.user ? { id: req.user.id, email: req.user.email, isSystemAdmin: req.user.isSystemAdmin } : 'null');
    
    try {
      const { employeeId } = req.params;
      console.log('[EnrichmentController] Processing enrichment for employee:', employeeId);
      
      const access = await this.canAccessEmployee(req, employeeId);
      if (!access.allowed) {
        if (access.reason === 'not_found') {
          return res.status(404).json({
            requester_service: 'directory_service',
            response: {
              error: 'Employee not found'
            }
          });
        }
        return res.status(403).json({
          requester_service: 'directory_service',
          response: {
            error: 'Access denied'
          }
        });
      }

      const result = await this.enrichProfileUseCase.enrichProfile(employeeId);

      return res.status(200).json({
        requester_service: 'directory_service',
        response: result
      });
    } catch (error) {
      // DIAGNOSTIC: Log FULL error details
      console.error('[EnrichmentController] ========== ENRICHMENT ERROR ==========');
      console.error('[EnrichmentController] Error message:', error.message);
      console.error('[EnrichmentController] Error name:', error.name);
      console.error('[EnrichmentController] Error stack:', error.stack);
      if (error.cause) {
        console.error('[EnrichmentController] Error cause:', error.cause);
      }
      console.error('[EnrichmentController] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Return 400 (Bad Request) for validation/insufficient data errors instead of 500
      const isValidationError = error.message?.includes('Insufficient data') ||
                                error.message?.includes('Employee not found') ||
                                error.message?.includes('already been enriched') ||
                                error.message?.includes('must be connected');
      
      const statusCode = isValidationError ? 400 : 500;
      
      return res.status(statusCode).json({
        requester_service: 'directory_service',
        response: {
          success: false,
          error: error.message || 'Failed to enrich profile'
        }
      });
    }
  }

  /**
   * Check if employee is ready for enrichment
   * GET /api/v1/employees/:employeeId/enrichment-status
   * Requires authentication
   */
  async getEnrichmentStatus(req, res, next) {
    try {
      const { employeeId } = req.params;
      const access = await this.canAccessEmployee(req, employeeId);
      if (!access.allowed) {
        if (access.reason === 'not_found') {
          return res.status(404).json({
            requester_service: 'directory_service',
            response: {
              error: 'Employee not found'
            }
          });
        }
        return res.status(403).json({
          requester_service: 'directory_service',
          response: {
            error: 'Access denied'
          }
        });
      }
      
      const isReady = await this.enrichProfileUseCase.isReadyForEnrichment(employeeId);

      return res.status(200).json({
        requester_service: 'directory_service',
        response: {
          employee_id: employeeId,
          ready_for_enrichment: isReady
        }
      });
    } catch (error) {
      console.error('[EnrichmentController] Error checking enrichment status:', error);
      return res.status(500).json({
        requester_service: 'directory_service',
        response: {
          error: error.message || 'Failed to check enrichment status'
        }
      });
    }
  }
}

module.exports = EnrichmentController;

