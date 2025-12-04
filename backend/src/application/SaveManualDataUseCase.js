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
   * @param {string} manualData.name - Employee name (required)
   * @param {string} manualData.email - Employee email (required)
   * @param {string} manualData.current_role - Current role (required)
   * @param {string} manualData.target_role - Target role (required)
   * @param {string} manualData.bio - Bio (optional)
   * @param {string} manualData.projects - Projects (optional)
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

      // Validate required fields
      if (!manualData.name || !manualData.email || !manualData.current_role || !manualData.target_role) {
        throw new Error('Missing required fields: name, email, current_role, and target_role are required');
      }

      // Structure data - only include fields that are provided
      const structuredData = {
        name: String(manualData.name).trim(),
        email: String(manualData.email).trim(),
        current_role: String(manualData.current_role).trim(),
        target_role: String(manualData.target_role).trim()
      };

      // Add optional fields if provided
      if (manualData.bio && String(manualData.bio).trim().length > 0) {
        structuredData.bio = String(manualData.bio).trim();
      }

      if (manualData.projects && String(manualData.projects).trim().length > 0) {
        // Parse projects (split by newlines if multiple)
        const projectsStr = String(manualData.projects).trim();
        structuredData.projects = projectsStr.includes('\n')
          ? projectsStr.split('\n').map(line => line.trim()).filter(line => line.length > 0)
          : [projectsStr];
      }

      console.log('[SaveManualDataUseCase] Structured data:', {
        has_name: !!structuredData.name,
        has_email: !!structuredData.email,
        has_current_role: !!structuredData.current_role,
        has_target_role: !!structuredData.target_role,
        has_bio: !!structuredData.bio,
        has_projects: !!structuredData.projects
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

