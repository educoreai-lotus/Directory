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
   * @param {Object} manualData - Manual form data
   * @param {string} manualData.work_experience - Work experience text
   * @param {string} manualData.skills - Comma-separated skills
   * @param {string} manualData.languages - Comma-separated languages
   * @param {string} manualData.education - Education text
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

      // Validate and structure data
      const structuredData = {
        work_experience: [],
        skills: [],
        education: [],
        languages: []
      };

      // Parse work experience (split by newlines or keep as single entry)
      if (manualData.work_experience) {
        const workExp = String(manualData.work_experience).trim();
        if (workExp.length > 0) {
          // Split by newlines if multiple entries, otherwise single entry
          structuredData.work_experience = workExp.includes('\n')
            ? workExp.split('\n').map(line => line.trim()).filter(line => line.length > 0)
            : [workExp];
        }
      }

      // Parse skills (comma-separated)
      if (manualData.skills) {
        const skillsStr = String(manualData.skills).trim();
        if (skillsStr.length > 0) {
          structuredData.skills = skillsStr
            .split(',')
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0);
        }
      }

      // Parse languages (comma-separated)
      if (manualData.languages) {
        const languagesStr = String(manualData.languages).trim();
        if (languagesStr.length > 0) {
          structuredData.languages = languagesStr
            .split(',')
            .map(lang => lang.trim())
            .filter(lang => lang.length > 0);
        }
      }

      // Parse education (split by newlines or keep as single entry)
      if (manualData.education) {
        const educationStr = String(manualData.education).trim();
        if (educationStr.length > 0) {
          // Split by newlines if multiple entries, otherwise single entry
          structuredData.education = educationStr.includes('\n')
            ? educationStr.split('\n').map(line => line.trim()).filter(line => line.length > 0)
            : [educationStr];
        }
      }

      // Validate that at least one field has data
      const hasData = 
        structuredData.work_experience.length > 0 ||
        structuredData.skills.length > 0 ||
        structuredData.education.length > 0 ||
        structuredData.languages.length > 0;

      if (!hasData) {
        throw new Error('At least one field (work_experience, skills, education, or languages) must be provided');
      }

      console.log('[SaveManualDataUseCase] Structured data:', {
        work_experience_count: structuredData.work_experience.length,
        skills_count: structuredData.skills.length,
        education_count: structuredData.education.length,
        languages_count: structuredData.languages.length
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
          work_experience_count: structuredData.work_experience.length,
          skills_count: structuredData.skills.length,
          education_count: structuredData.education.length,
          languages_count: structuredData.languages.length,
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

