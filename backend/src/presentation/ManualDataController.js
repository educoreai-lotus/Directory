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

      // Normalize body fields to strings
      const rawWork = typeof work_experience === 'string' ? work_experience : '';
      const rawSkills = typeof skills === 'string' ? skills : '';
      const rawEducation = typeof education === 'string' ? education : '';

      // Compute trimmed checks
      const hasWork = rawWork.trim().length > 0;
      const hasSkills = rawSkills.trim().length > 0;
      const hasEducation = rawEducation.trim().length > 0;
      const allEmpty = !hasWork && !hasSkills && !hasEducation;

      console.log('[ManualDataController] Processing manual data for employee:', id);
      console.log('[ManualDataController] Field status:', {
        has_work_experience: hasWork,
        has_skills: hasSkills,
        has_education: hasEducation,
        all_empty: allEmpty
      });

      // IF allEmpty === true → return 200 success (NO-OP)
      if (allEmpty) {
        console.log("[ManualDataController] No manual data provided - treating as no-op success");
        return res.status(200).json({
          requester_service: "directory_service",
          response: {
            success: true,
            updated: false,
            message: "No manual data provided; nothing to update"
          }
        });
      }

      // Otherwise → call the UseCase as before
      console.log("[ManualDataController] Manual data provided - calling UseCase to save");
      const result = await this.saveManualDataUseCase.execute(id, {
        work_experience: hasWork ? rawWork : null,
        skills: hasSkills ? rawSkills : null,
        education: hasEducation ? rawEducation : null
      });

      // Return success with updated: true
      // Ensure success: true is always set, even if result has a different success value
      return res.status(200).json({
        requester_service: "directory_service",
        response: {
          ...result,
          success: true,
          updated: true
        }
      });
    } catch (error) {
      console.error('[ManualDataController] Error saving manual data:', error);
      // Return proper JSON error instead of throwing
      return res.status(400).json({
        requester_service: "directory_service",
        response: {
          success: false,
          error: "Failed to save manual data",
          details: error.message || "Failed to save manual data"
        }
      });
    }
  }
}

module.exports = ManualDataController;

