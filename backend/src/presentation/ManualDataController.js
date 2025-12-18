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
      // extractUnwrappedBody middleware ensures req.body contains unwrapped data
      const { work_experience, skills, education } = req.body || {};
      
      console.log('[ManualDataController] Body received:', {
        req_body_keys: Object.keys(req.body || {}),
        has_work_experience: !!work_experience,
        has_skills: !!skills,
        has_education: !!education
      });

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

      // Check if all fields are undefined/null (not provided at all)
      const noDataProvided =
        (work_experience === undefined || work_experience === null) &&
        (skills === undefined || skills === null) &&
        (education === undefined || education === null);

      // CRITICAL VALIDATION LOGIC:
      // Check if employee has valid enrichment sources (GitHub OR CV PDF)
      // LinkedIn is NOT considered a valid enrichment source
      const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
      const rawDataRepo = new EmployeeRawDataRepository();
      const hasValidSource = await rawDataRepo.hasValidEnrichmentSource(id);
      
      console.log('[ManualDataController] Employee has valid enrichment source (GitHub/CV):', hasValidSource);

      // Case 1: User HAS GitHub OR CV → Manual form is optional
      // Case 2: User has NO GitHub AND NO CV → Manual form is mandatory
      
      if (noDataProvided) {
        // All fields undefined/null - invalid request
        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            success: false,
            message: 'Invalid manual enrichment data',
            details: 'At least one field (work_experience, skills, or education) must be provided'
          }
        });
      }

      // IF allEmpty === true (all fields are empty strings)
      if (allEmpty) {
        if (hasValidSource) {
          // Case 1: User HAS GitHub OR CV → Manual form is optional → return 200 (NO-OP)
          console.log("[ManualDataController] Empty manual form but user has GitHub/CV - treating as no-op success");
          return res.status(200).json({
            requester_service: "directory_service",
            response: {
              success: true,
              message: "No manual data provided; nothing to update",
              data: {}
            }
          });
        } else {
          // Case 2: User has NO GitHub AND NO CV → Manual form is mandatory → return 400
          console.log("[ManualDataController] Empty manual form and no GitHub/CV - validation failed");
          return res.status(400).json({
            requester_service: 'directory_service',
            response: {
              success: false,
              message: 'Please fill at least one field',
              details: 'To enrich your profile without GitHub or CV, you must fill at least one field (work_experience, skills, or education)'
            }
          });
        }
      }

      // Otherwise → call the UseCase as before
      console.log("[ManualDataController] Manual data provided - calling UseCase to save");
      const result = await this.saveManualDataUseCase.execute(id, {
        work_experience: hasWork ? rawWork : null,
        skills: hasSkills ? rawSkills : null,
        education: hasEducation ? rawEducation : null
      });

      // Return success with proper envelope format
      return res.status(200).json({
        requester_service: 'directory_service',
        response: {
          success: true,
          message: 'Manual data saved',
          data: result || {}
        }
      });
    } catch (error) {
      console.error('[ManualDataController] Error saving manual data:', error);
      // Return proper JSON error instead of throwing
      return res.status(400).json({
        requester_service: 'directory_service',
        response: {
          success: false,
          message: 'Invalid manual enrichment data',
          details: error.message || 'Failed to save manual data'
        }
      });
    }
  }
}

module.exports = ManualDataController;

