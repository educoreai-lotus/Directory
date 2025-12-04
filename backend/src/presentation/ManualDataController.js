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

      // PHASE_3: Validate request body
      const { work_experience, skills, languages, education } = req.body;

      // At least one field must be provided
      if (!work_experience && !skills && !languages && !education) {
        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            error: 'At least one field (work_experience, skills, languages, or education) must be provided'
          }
        });
      }

      console.log('[ManualDataController] Processing manual data for employee:', id);
      console.log('[ManualDataController] Data provided:', {
        has_work_experience: !!work_experience,
        has_skills: !!skills,
        has_languages: !!languages,
        has_education: !!education
      });

      // PHASE_3: Process and save manual data
      const result = await this.saveManualDataUseCase.execute(id, {
        work_experience,
        skills,
        languages,
        education
      });

      return res.status(200).json({
        requester_service: 'directory_service',
        response: result
      });
    } catch (error) {
      console.error('[ManualDataController] Error saving manual data:', error);
      return res.status(500).json({
        requester_service: 'directory_service',
        response: {
          error: error.message || 'Failed to save manual data'
        }
      });
    }
  }
}

module.exports = ManualDataController;

