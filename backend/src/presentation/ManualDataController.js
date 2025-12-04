// Presentation Layer - Manual Data Controller
// Handles manual profile form submission endpoints
// PHASE_3: This file is part of the extended enrichment flow

const SaveManualDataUseCase = require('../application/SaveManualDataUseCase');

class ManualDataController {
  constructor() {
    this.saveManualDataUseCase = new SaveManualDataUseCase();
  }

  /**
   * Handle manual profile data submission
   * POST /api/v1/employees/:id/manual-data
   * Requires authentication
   */
  async saveManualData(req, res, next) {
    try {
      // PHASE_3: Get employee ID from params and verify authentication
      const { id } = req.params;
      const authenticatedEmployeeId = req.user?.id || req.user?.employeeId;
      const isHR = req.user?.isHR || false;

      // Verify employee ID matches authenticated user (unless HR)
      if (!isHR && authenticatedEmployeeId !== id) {
        return res.status(403).json({
          requester_service: 'directory_service',
          response: {
            error: 'You can only save manual data for your own profile'
          }
        });
      }

      // PHASE_3: Validate request body - only require: name, email, current_role, target_role
      const { name, email, current_role, target_role, bio, projects } = req.body;

      // Validate required fields
      if (!name || !email || !current_role || !target_role) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manual enrichment data',
          details: 'Missing required fields: name, email, current_role, and target_role are required'
        });
      }

      console.log('[ManualDataController] Processing manual data for employee:', id);
      console.log('[ManualDataController] Data provided:', {
        has_name: !!name,
        has_email: !!email,
        has_current_role: !!current_role,
        has_target_role: !!target_role,
        has_bio: !!bio,
        has_projects: !!projects
      });

      // PHASE_3: Process and save manual data
      const result = await this.saveManualDataUseCase.execute(id, {
        name,
        email,
        current_role,
        target_role,
        bio: bio || null,
        projects: projects || null
      });

      return res.status(200).json({
        requester_service: 'directory_service',
        response: result
      });
    } catch (error) {
      console.error('[ManualDataController] Error saving manual data:', error);
      // Return proper JSON error instead of throwing
      return res.status(400).json({
        success: false,
        message: 'Invalid manual enrichment data',
        details: error.message || 'Failed to save manual data'
      });
    }
  }
}

module.exports = ManualDataController;

