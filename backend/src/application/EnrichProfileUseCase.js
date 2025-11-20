// Application Layer - Enrich Profile Use Case
// Orchestrates profile enrichment after both LinkedIn and GitHub OAuth connections

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const GeminiAPIClient = require('../infrastructure/GeminiAPIClient');
const MockDataService = require('../infrastructure/MockDataService');
const EmployeeProfileApprovalRepository = require('../infrastructure/EmployeeProfileApprovalRepository');
const MicroserviceClient = require('../infrastructure/MicroserviceClient');

class EnrichProfileUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.geminiClient = new GeminiAPIClient();
    this.mockDataService = new MockDataService();
    this.approvalRepository = new EmployeeProfileApprovalRepository();
    this.microserviceClient = new MicroserviceClient();
  }

  /**
   * Enrich employee profile with AI-generated bio and project summaries
   * This is called automatically after both LinkedIn and GitHub are connected
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object>} Enriched profile data
   */
  async enrichProfile(employeeId) {
    try {
      console.log('[EnrichProfileUseCase] ========== STARTING ENRICHMENT ==========');
      console.log('[EnrichProfileUseCase] Employee ID:', employeeId);
      
      // Get employee data
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee) {
        console.error('[EnrichProfileUseCase] ❌ Employee not found:', employeeId);
        throw new Error('Employee not found');
      }

      console.log('[EnrichProfileUseCase] Employee found:', employee.email);
      console.log('[EnrichProfileUseCase] enrichment_completed:', employee.enrichment_completed);
      console.log('[EnrichProfileUseCase] linkedin_data exists:', !!employee.linkedin_data);
      console.log('[EnrichProfileUseCase] github_data exists:', !!employee.github_data);

      // Check if already enriched (one-time only)
      if (employee.enrichment_completed) {
        console.warn('[EnrichProfileUseCase] ⚠️  Profile already enriched - skipping');
        throw new Error('Profile has already been enriched. This is a one-time process.');
      }

      // Check if both LinkedIn and GitHub are connected
      if (!employee.linkedin_data || !employee.github_data) {
        console.error('[EnrichProfileUseCase] ❌ Missing OAuth data - LinkedIn:', !!employee.linkedin_data, 'GitHub:', !!employee.github_data);
        throw new Error('Both LinkedIn and GitHub must be connected before enrichment');
      }
      
      console.log('[EnrichProfileUseCase] ✅ All checks passed, proceeding with enrichment...');

      // Parse stored data
      const linkedinData = typeof employee.linkedin_data === 'string' 
        ? JSON.parse(employee.linkedin_data) 
        : employee.linkedin_data;
      
      const githubData = typeof employee.github_data === 'string'
        ? JSON.parse(employee.github_data)
        : employee.github_data;

      // Prepare basic employee info
      const employeeBasicInfo = {
        full_name: employee.full_name,
        current_role_in_company: employee.current_role_in_company,
        target_role_in_company: employee.target_role_in_company
      };

      // Generate bio using Gemini AI (with fallback to mock data)
      let bio;
      try {
        console.log('[EnrichProfileUseCase] Calling Gemini API to generate bio...');
        console.log('[EnrichProfileUseCase] Employee:', employeeBasicInfo.full_name);
        console.log('[EnrichProfileUseCase] LinkedIn data present:', !!linkedinData);
        console.log('[EnrichProfileUseCase] GitHub data present:', !!githubData);
        bio = await this.geminiClient.generateBio(linkedinData, githubData, employeeBasicInfo);
        console.log('[EnrichProfileUseCase] ✅ Bio generated successfully by Gemini:', bio.substring(0, 100) + '...');
      } catch (error) {
        console.error('[EnrichProfileUseCase] ❌ Gemini API failed:', error.message);
        console.error('[EnrichProfileUseCase] Error details:', error.response?.data || error.stack);
        console.warn('[EnrichProfileUseCase] ⚠️  Using mock bio as fallback');
        bio = this.mockDataService.getMockBio(employeeBasicInfo);
        console.warn('[EnrichProfileUseCase] ⚠️  MOCK BIO USED - This is generic and not personalized!');
      }

      // Generate project summaries using Gemini AI (with fallback to mock data)
      let projectSummaries = [];
      const repositories = githubData.repositories || [];
      
      if (repositories.length > 0) {
        try {
          console.log('[EnrichProfileUseCase] Calling Gemini API to generate project summaries...');
          console.log('[EnrichProfileUseCase] Number of repositories:', repositories.length);
          projectSummaries = await this.geminiClient.generateProjectSummaries(repositories);
          console.log(`[EnrichProfileUseCase] ✅ Generated ${projectSummaries.length} project summaries by Gemini`);
          if (projectSummaries.length > 0) {
            console.log('[EnrichProfileUseCase] Sample summary:', projectSummaries[0].summary?.substring(0, 100) + '...');
          }
        } catch (error) {
          console.error('[EnrichProfileUseCase] ❌ Gemini API failed for project summaries:', error.message);
          console.error('[EnrichProfileUseCase] Error details:', error.response?.data || error.stack);
          console.warn('[EnrichProfileUseCase] ⚠️  Using mock project summaries as fallback');
          projectSummaries = this.mockDataService.getMockProjectSummaries(repositories);
          console.warn('[EnrichProfileUseCase] ⚠️  MOCK SUMMARIES USED - These are generic and not personalized!');
        }
      } else {
        console.log('[EnrichProfileUseCase] No repositories found in GitHub data, skipping project summaries');
      }

      // Update employee profile with enriched data (sets profile_status to 'enriched')
      const updatedEmployee = await this.employeeRepository.updateEnrichment(
        employeeId,
        bio,
        projectSummaries
      );

      // Send skills data to Skills Engine for normalization (after enrichment)
      try {
        // Get employee roles to determine employee type
        const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
        const rolesResult = await this.employeeRepository.pool.query(rolesQuery, [employeeId]);
        const roles = rolesResult.rows.map(row => row.role_type);
        const isTrainer = roles.includes('TRAINER');
        const employeeType = isTrainer ? 'trainer' : 'regular_employee';

        // Prepare raw data for Skills Engine
        const rawData = {
          linkedin: linkedinData,
          github: githubData
        };

        console.log('[EnrichProfileUseCase] Sending skills data to Skills Engine...');
        const skillsResult = await this.microserviceClient.getEmployeeSkills(
          employee.employee_id,
          employee.company_id.toString(),
          employeeType,
          rawData
        );
        console.log('[EnrichProfileUseCase] ✅ Skills Engine processed data:', {
          competencies_count: skillsResult.competencies?.length || 0,
          relevance_score: skillsResult.relevance_score || 0
        });
      } catch (error) {
        // Skills Engine call is not critical - log and continue
        console.warn('[EnrichProfileUseCase] ⚠️  Skills Engine call failed (non-critical):', error.message);
      }

      // Create approval request for HR review
      console.log('[EnrichProfileUseCase] Creating approval request for employee:', employeeId, 'company:', employee.company_id);
      const approvalRequest = await this.approvalRepository.createApprovalRequest({
        employee_id: employeeId,
        company_id: employee.company_id,
        enriched_at: new Date()
      });

      console.log('[EnrichProfileUseCase] ✅ Approval request created:', {
        id: approvalRequest.id,
        employee_id: approvalRequest.employee_id,
        company_id: approvalRequest.company_id,
        status: approvalRequest.status,
        requested_at: approvalRequest.requested_at
      });

      return {
        success: true,
        employee: {
          id: updatedEmployee.id,
          employee_id: updatedEmployee.employee_id,
          bio: updatedEmployee.bio,
          enrichment_completed: updatedEmployee.enrichment_completed,
          enrichment_completed_at: updatedEmployee.enrichment_completed_at,
          profile_status: updatedEmployee.profile_status,
          project_summaries_count: projectSummaries.length
        },
        approval_request: {
          id: approvalRequest.id,
          status: approvalRequest.status,
          requested_at: approvalRequest.requested_at
        }
      };
    } catch (error) {
      console.error('[EnrichProfileUseCase] Error:', error);
      throw error;
    }
  }

  /**
   * Check if employee is ready for enrichment (both OAuth connections complete)
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<boolean>} True if ready for enrichment
   */
  async isReadyForEnrichment(employeeId) {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      return false;
    }

    return !!(employee.linkedin_data && employee.github_data && !employee.enrichment_completed);
  }
}

module.exports = EnrichProfileUseCase;

