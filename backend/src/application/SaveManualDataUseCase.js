// Application Layer - Save Manual Data Use Case
// Orchestrates manual profile form data validation and storage
// PHASE_3: This file is part of the extended enrichment flow

const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');

class SaveManualDataUseCase {
  constructor() {
    this.rawDataRepository = new EmployeeRawDataRepository();
    this.employeeRepository = new EmployeeRepository();
  }

  /**
   * Process and save manual profile data
   * @param {string} employeeId - Employee UUID
   * @param {Object} manualData - Manual form data (all optional)
   * @param {string} manualData.work_experience - Work experience text (optional)
   * @param {string} manualData.skills - Comma-separated skills (optional)
   * @param {string} manualData.education - Education text (optional)
   * @returns {Promise<Object>} Result with saved data
   */
  async execute(employeeId, manualData) {
    try {
      console.log('[SaveManualDataUseCase] Processing manual data for employee:', employeeId);

      // Verify employee exists
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Validate and structure data - all fields are optional
      const structuredData = {
        work_experience: '',
        skills: [],
        education: ''
      };

      // Parse work experience (keep as string)
      if (manualData.work_experience) {
        const workExp = String(manualData.work_experience).trim();
        if (workExp.length > 0) {
          structuredData.work_experience = workExp;
        }
      }

      // Parse skills (comma-separated) - convert to array
      if (manualData.skills) {
        const skillsStr = String(manualData.skills).trim();
        if (skillsStr.length > 0) {
          structuredData.skills = skillsStr
            .split(',')
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0);
        }
      }

      // Parse education (keep as string)
      if (manualData.education) {
        const educationStr = String(manualData.education).trim();
        if (educationStr.length > 0) {
          structuredData.education = educationStr;
        }
      }

      // CRITICAL: Validation depends on whether employee has valid enrichment sources
      // Check if employee has GitHub OR CV (valid sources)
      // LinkedIn is NOT considered a valid enrichment source
      const hasValidSource = await this.rawDataRepository.hasValidEnrichmentSource(employeeId);
      
      console.log('[SaveManualDataUseCase] Employee has valid enrichment source (GitHub/CV):', hasValidSource);

      // Validate that at least one field has data
      const hasData = 
        structuredData.work_experience.length > 0 ||
        structuredData.skills.length > 0 ||
        structuredData.education.length > 0;

      // Case 1: User HAS GitHub OR CV → Manual form is optional (can be empty)
      // Case 2: User has NO GitHub AND NO CV → Manual form is mandatory
      if (!hasData && !hasValidSource) {
        throw new Error('At least one field (work_experience, skills, or education) must be provided');
      }
      
      // If hasData is false but hasValidSource is true, this is a no-op (empty form is OK)
      if (!hasData && hasValidSource) {
        console.log('[SaveManualDataUseCase] Empty manual form but user has GitHub/CV - this is a valid no-op');
        // Return success with empty data (no-op)
        return {
          success: true,
          data: {
            id: null,
            source: 'manual',
            created_at: null,
            updated_at: null
          },
          message: 'No manual data provided; nothing to update (user has GitHub/CV)'
        };
      }

      console.log('[SaveManualDataUseCase] Structured data:', {
        work_experience_length: structuredData.work_experience.length,
        skills_count: structuredData.skills.length,
        education_length: structuredData.education.length
      });

      // Save to employee_raw_data table
      console.log('[SaveManualDataUseCase] Saving to employee_raw_data table...');
      const savedData = await this.rawDataRepository.createOrUpdate(
        employeeId,
        'manual',
        structuredData
      );

      console.log('[SaveManualDataUseCase] ✅ Manual data saved successfully');

      return {
        success: true,
        data: {
          id: savedData.id,
          source: savedData.source,
          created_at: savedData.created_at,
          updated_at: savedData.updated_at
        }
      };
    } catch (error) {
      console.error('[SaveManualDataUseCase] Error processing manual data:', error);
      throw error;
    }
  }
}

module.exports = SaveManualDataUseCase;

