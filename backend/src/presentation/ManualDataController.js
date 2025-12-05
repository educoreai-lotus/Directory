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

      // PHASE_3: Validate request body - all fields are optional
      const { work_experience, skills, education } = req.body;

      // NEW SAFE VALIDATION:
      // Empty strings ("") must count as "provided", because frontend always sends them.
      // Only undefined or null should count as "not provided".
      const noDataProvided =
        (work_experience === undefined || work_experience === null) &&
        (skills === undefined || skills === null) &&
        (education === undefined || education === null);

      if (noDataProvided) {
        return res.status(400).json({
          requester_service: "directory_service",
          response: {
            success: false,
            error: "Invalid manual enrichment data",
            details: "At least one field (work_experience, skills, or education) must be provided"
          }
        });
      }

      console.log('[ManualDataController] Processing manual data for employee:', id);
      console.log('[ManualDataController] Data provided:', {
        has_work_experience: !!work_experience,
        has_skills: !!skills,
        has_education: !!education
      });

      // PHASE_3: Process and save manual data
      const result = await this.saveManualDataUseCase.execute(id, {
        work_experience: work_experience || null,
        skills: skills || null,
        education: education || null
      });

      return res.status(200).json({
        requester_service: 'directory_service',
        response: result
      });
    } catch (error) {
      console.error('[ManualDataController] Error saving manual data:', error);
      // Return proper JSON error instead of throwing
      return res.status(400).json({
        requester_service: "directory_service",
        response: {
          success: false,
          error: "Invalid manual enrichment data",
          details: error.message || "Failed to save manual data"
        }
      });
    }
  }
}

module.exports = ManualDataController;

