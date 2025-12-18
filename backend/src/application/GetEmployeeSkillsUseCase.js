// Application Layer - Get Employee Skills Use Case
// Fetches normalized skills from Skills Engine for an employee

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const MicroserviceClient = require('../infrastructure/MicroserviceClient');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const EmployeeSkillsRepository = require('../infrastructure/EmployeeSkillsRepository');

class GetEmployeeSkillsUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.microserviceClient = new MicroserviceClient();
    this.companyRepository = new CompanyRepository();
    this.skillsRepository = new EmployeeSkillsRepository();
  }

  /**
   * Get employee skills from Skills Engine
   * @param {string} employeeId - Employee UUID
   * @param {string} companyId - Company UUID
   * @returns {Promise<Object>} Skills data with competencies and relevance_score
   */
  async execute(employeeId, companyId) {
    try {
      // Get employee data
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Check if employee belongs to the company (compare as strings for UUID)
      if (String(employee.company_id) !== String(companyId)) {
        throw new Error('Employee does not belong to this company');
      }

      // Check if profile is approved (only approved employees can see skills)
      if (employee.profile_status !== 'approved') {
        throw new Error('Employee profile must be approved to view skills');
      }

      // FIRST: Try to get skills from database (stored when profile was approved)
      const storedSkills = await this.skillsRepository.findByEmployeeId(employeeId);
      
      if (storedSkills && storedSkills.competencies) {
        console.log('[GetEmployeeSkillsUseCase] ✅ Found stored skills in database, returning cached data');
        return {
          success: true,
          skills: {
            user_id: storedSkills.employee_id,
            competencies: storedSkills.competencies,
            relevance_score: storedSkills.relevance_score || 0,
            gap: storedSkills.gap || null
          }
        };
      }

      // FALLBACK: If no stored skills found, call Skills Engine (shouldn't happen normally)
      console.warn('[GetEmployeeSkillsUseCase] ⚠️ No stored skills found, calling Skills Engine as fallback');
      console.warn('[GetEmployeeSkillsUseCase] This should only happen if skills were not stored during approval');

      // Determine employee type from roles
      const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
      const rolesResult = await this.employeeRepository.pool.query(rolesQuery, [employeeId]);
      const roles = rolesResult.rows.map(row => row.role_type);
      const isTrainer = roles.includes('TRAINER');
      const employeeType = isTrainer ? 'trainer' : 'regular_employee';

      // Fetch company to include company_name in payload
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Get raw data (LinkedIn and GitHub)
      const linkedinData = employee.linkedin_data 
        ? (typeof employee.linkedin_data === 'string' ? JSON.parse(employee.linkedin_data) : employee.linkedin_data)
        : {};
      
      const githubData = employee.github_data
        ? (typeof employee.github_data === 'string' ? JSON.parse(employee.github_data) : employee.github_data)
        : {};

      // Prepare raw_data for Skills Engine
      const rawData = {
        github: githubData,
        linkedin: linkedinData
      };

      // Call Skills Engine to get normalized skills with updated payload fields
      const skillsData = await this.microserviceClient.getEmployeeSkills({
        userId: employee.id, // UUID
        userName: employee.full_name,
        companyId: employee.company_id.toString(),
        companyName: company.company_name,
        roleType: employeeType,
        pathCareer: employee.target_role_in_company || null,
        preferredLanguage: employee.preferred_language || 'en',
        rawData
      });

      // Store the response in database for future requests
      if (skillsData && (skillsData.competencies || skillsData.relevance_score !== undefined)) {
        try {
          await this.skillsRepository.saveOrUpdate(employeeId, skillsData);
          console.log('[GetEmployeeSkillsUseCase] ✅ Skills data stored in database for future requests');
        } catch (storageError) {
          console.warn('[GetEmployeeSkillsUseCase] ⚠️ Failed to store skills data (non-blocking):', storageError.message);
        }
      }

      return {
        success: true,
        skills: skillsData
      };
    } catch (error) {
      console.error('[GetEmployeeSkillsUseCase] Error:', error);
      throw error;
    }
  }
}

module.exports = GetEmployeeSkillsUseCase;

