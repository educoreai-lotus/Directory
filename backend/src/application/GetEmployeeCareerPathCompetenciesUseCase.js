// Application Layer - Get Employee Career Path Competencies Use Case
// Retrieves career path competencies from database (stored when Skills Engine sends update via Coordinator)

const EmployeeCareerPathRepository = require('../infrastructure/EmployeeCareerPathRepository');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');

class GetEmployeeCareerPathCompetenciesUseCase {
  constructor() {
    this.careerPathRepository = new EmployeeCareerPathRepository();
    this.employeeRepository = new EmployeeRepository();
  }

  /**
   * Get employee career path competencies from database
   * @param {string} employeeId - Employee UUID
   * @param {string} companyId - Company UUID
   * @returns {Promise<Object>} { success: true, competencies: [...] }
   */
  async execute(employeeId, companyId) {
    try {
      // Verify employee exists and belongs to company
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      if (employee.company_id !== companyId) {
        throw new Error('Employee does not belong to this company');
      }

      // Check if profile is approved (career path competencies are only shown for approved profiles)
      if (employee.profile_status !== 'approved') {
        throw new Error('Profile must be approved to view career path competencies');
      }

      // Get career path competencies from database
      const careerPathData = await this.careerPathRepository.findByEmployeeId(employeeId);

      if (!careerPathData || !careerPathData.competencies) {
        return {
          success: true,
          competencies: []
        };
      }

      return {
        success: true,
        competencies: careerPathData.competencies || []
      };

    } catch (error) {
      console.error('[GetEmployeeCareerPathCompetenciesUseCase] Error:', error);
      throw error;
    }
  }
}

module.exports = GetEmployeeCareerPathCompetenciesUseCase;

