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

      // Helper function to transform Skills Engine response to component format
      // Always applies transformation to ensure levels are propagated to skills
      const transformSkillsResponse = (skillsData) => {
        if (!skillsData) return null;
        
        // If competencies is already in the expected format, still transform to propagate levels
        if (Array.isArray(skillsData.competencies)) {
          // Transform Skills Engine format to component format
          // This ensures levels are propagated from competencies to skills
          const transformNode = (node, parentLevel = null) => {
            // Use node's level if available, otherwise use parent's level
            const nodeLevel = node.level && String(node.level).toLowerCase() !== 'undefined' 
              ? node.level 
              : (parentLevel && String(parentLevel).toLowerCase() !== 'undefined' ? parentLevel : null);
            
            const transformed = {
              name: node.competencyName || node.name || 'Unknown',
              id: node.competencyId || node.id,
              coverage: node.coverage,
              level: nodeLevel,
              verified: node.verified
            };
            
            // Transform children if they exist (pass level down)
            if (node.children && Array.isArray(node.children) && node.children.length > 0) {
              transformed.nested_competencies = node.children.map(child => transformNode(child, nodeLevel));
            } else if (node.nested_competencies && Array.isArray(node.nested_competencies)) {
              transformed.nested_competencies = node.nested_competencies.map(child => transformNode(child, nodeLevel));
            }
            
            // Transform skills if they exist (propagate competency level to skills)
            if (node.skills && Array.isArray(node.skills)) {
              transformed.skills = node.skills.map(skill => ({
                name: skill.name || skill.skillName || 'Unknown',
                level: skill.level && String(skill.level).toLowerCase() !== 'undefined' 
                  ? skill.level 
                  : (nodeLevel && String(nodeLevel).toLowerCase() !== 'undefined' ? nodeLevel : undefined),
                verified: skill.verified === true || skill.verified === 'verified' || String(skill.verified).toLowerCase() === 'true'
              }));
            }
            
            return transformed;
          };
          
          return {
            ...skillsData,
            competencies: skillsData.competencies.map(transformNode)
          };
        }
        
        return skillsData;
      };

      // FIRST: Try to get skills from database (stored when profile was approved)
      const storedSkills = await this.skillsRepository.findByEmployeeId(employeeId);
      
      if (storedSkills && storedSkills.competencies) {
        console.log('[GetEmployeeSkillsUseCase] ✅ Found stored skills in database, returning cached data');
        console.log('[GetEmployeeSkillsUseCase] Stored skills summary:', JSON.stringify({
          employee_id: storedSkills.employee_id,
          competencies_count: storedSkills.competencies?.length || 0,
          relevance_score: storedSkills.relevance_score || 0,
          has_gap: !!storedSkills.gap,
          processed_at: storedSkills.processed_at,
          updated_at: storedSkills.updated_at
        }, null, 2));
        
        const transformed = transformSkillsResponse({
          user_id: storedSkills.employee_id,
          competencies: storedSkills.competencies,
          relevance_score: storedSkills.relevance_score || 0,
          gap: storedSkills.gap || null
        });
        
        return {
          success: true,
          skills: transformed
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

      console.log('[GetEmployeeSkillsUseCase] ✅ Skills Engine response received (fallback):');
      console.log('[GetEmployeeSkillsUseCase] Response:', JSON.stringify({
        user_id: skillsData?.user_id,
        competencies_count: skillsData?.competencies?.length || 0,
        relevance_score: skillsData?.relevance_score,
        has_gap: !!skillsData?.gap,
        full_response: skillsData
      }, null, 2));

      // Transform response to component format
      const transformed = transformSkillsResponse(skillsData);

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
        skills: transformed || skillsData
      };
    } catch (error) {
      console.error('[GetEmployeeSkillsUseCase] Error:', error);
      throw error;
    }
  }
}

module.exports = GetEmployeeSkillsUseCase;

