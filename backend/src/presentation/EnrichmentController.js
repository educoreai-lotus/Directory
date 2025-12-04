// Presentation Layer - Enrichment Controller
// Handles profile enrichment endpoints

const EnrichProfileUseCase = require('../application/EnrichProfileUseCase');
const { authMiddleware } = require('../shared/authMiddleware');

class EnrichmentController {
  constructor() {
    this.enrichProfileUseCase = new EnrichProfileUseCase();
  }

  /**
   * Trigger profile enrichment manually
   * POST /api/v1/employees/:employeeId/enrich
   * Requires authentication
   */
  async enrichProfile(req, res, next) {
    console.log('[EnrichmentController] enrichProfile called');
    console.log('[EnrichmentController] Request params:', req.params);
    console.log('[EnrichmentController] Request body:', req.body);
    console.log('[EnrichmentController] Request user:', req.user ? { id: req.user.id, email: req.user.email, isHR: req.user.isHR } : 'null');
    
    try {
      const { employeeId } = req.params;
      console.log('[EnrichmentController] Processing enrichment for employee:', employeeId);
      
      // Verify employee ID matches authenticated user (unless HR)
      const authenticatedEmployeeId = req.user?.id || req.user?.employeeId;
      const isHR = req.user?.isHR || false;
      
      if (!isHR && authenticatedEmployeeId !== employeeId) {
        return res.status(403).json({
          requester_service: 'directory_service',
          response: {
            error: 'You can only enrich your own profile'
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

