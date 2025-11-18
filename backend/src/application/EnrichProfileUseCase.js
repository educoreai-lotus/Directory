// Application Layer - Enrich Profile Use Case
// Orchestrates profile enrichment after both LinkedIn and GitHub OAuth connections

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const GeminiAPIClient = require('../infrastructure/GeminiAPIClient');
const MockDataService = require('../infrastructure/MockDataService');
const EmployeeProfileApprovalRepository = require('../infrastructure/EmployeeProfileApprovalRepository');

class EnrichProfileUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.geminiClient = new GeminiAPIClient();
    this.mockDataService = new MockDataService();
    this.approvalRepository = new EmployeeProfileApprovalRepository();
  }

  /**
   * Enrich employee profile with AI-generated bio and project summaries
   * This is called automatically after both LinkedIn and GitHub are connected
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object>} Enriched profile data
   */
  async enrichProfile(employeeId) {
    try {
      // Get employee data
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Check if already enriched (one-time only)
      if (employee.enrichment_completed) {
        throw new Error('Profile has already been enriched. This is a one-time process.');
      }

      // Check if both LinkedIn and GitHub are connected
      if (!employee.linkedin_data || !employee.github_data) {
        throw new Error('Both LinkedIn and GitHub must be connected before enrichment');
      }

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
        bio = await this.geminiClient.generateBio(linkedinData, githubData, employeeBasicInfo);
        console.log('[EnrichProfileUseCase] ✅ Bio generated successfully');
      } catch (error) {
        console.warn('[EnrichProfileUseCase] ⚠️  Gemini API failed, using mock bio:', error.message);
        bio = this.mockDataService.getMockBio(employeeBasicInfo);
      }

      // Generate project summaries using Gemini AI (with fallback to mock data)
      let projectSummaries = [];
      const repositories = githubData.repositories || [];
      
      if (repositories.length > 0) {
        try {
          projectSummaries = await this.geminiClient.generateProjectSummaries(repositories);
          console.log(`[EnrichProfileUseCase] ✅ Generated ${projectSummaries.length} project summaries`);
        } catch (error) {
          console.warn('[EnrichProfileUseCase] ⚠️  Gemini API failed, using mock project summaries:', error.message);
          projectSummaries = this.mockDataService.getMockProjectSummaries(repositories);
        }
      }

      // Update employee profile with enriched data (sets profile_status to 'enriched')
      const updatedEmployee = await this.employeeRepository.updateEnrichment(
        employeeId,
        bio,
        projectSummaries
      );

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

