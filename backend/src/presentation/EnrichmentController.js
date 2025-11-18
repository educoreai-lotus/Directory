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
    try {
      const { employeeId } = req.params;
      
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
      console.error('[EnrichmentController] Error enriching profile:', error);
      return res.status(500).json({
        requester_service: 'directory_service',
        response: {
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

