// Application Layer - Enrich Profile Use Case
// Orchestrates profile enrichment after both LinkedIn and GitHub OAuth connections

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const OpenAIAPIClient = require('../infrastructure/OpenAIAPIClient');
const EmployeeProfileApprovalRepository = require('../infrastructure/EmployeeProfileApprovalRepository');
const MicroserviceClient = require('../infrastructure/MicroserviceClient');
const CompanyRepository = require('../infrastructure/CompanyRepository');

class EnrichProfileUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.openAIClient = new OpenAIAPIClient();
    this.approvalRepository = new EmployeeProfileApprovalRepository();
    this.microserviceClient = new MicroserviceClient();
    this.companyRepository = new CompanyRepository();
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

      // Get company name
      const company = await this.companyRepository.findById(employee.company_id);
      const companyName = company?.company_name || 'the company';

      // Prepare basic employee info
      const employeeBasicInfo = {
        full_name: employee.full_name,
        current_role_in_company: employee.current_role_in_company,
        target_role_in_company: employee.target_role_in_company,
        company_name: companyName
      };

      // Generate bio using OpenAI AI (NO FALLBACK - must succeed)
      console.log('[EnrichProfileUseCase] ========== GENERATING BIO ==========');
      console.log('[EnrichProfileUseCase] Calling OpenAI API to generate bio...');
      console.log('[EnrichProfileUseCase] Employee:', employeeBasicInfo.full_name);
      console.log('[EnrichProfileUseCase] LinkedIn data present:', !!linkedinData);
      console.log('[EnrichProfileUseCase] GitHub data present:', !!githubData);
      if (linkedinData) {
        console.log('[EnrichProfileUseCase] LinkedIn data keys:', Object.keys(linkedinData).join(', '));
      }
      if (githubData) {
        console.log('[EnrichProfileUseCase] GitHub data keys:', Object.keys(githubData).join(', '));
        console.log('[EnrichProfileUseCase] GitHub repositories count:', githubData.repositories?.length || 0);
      }
      
      let bio;
      try {
        bio = await this.openAIClient.generateBio(linkedinData, githubData, employeeBasicInfo);
        console.log('[EnrichProfileUseCase] ✅ Bio generated successfully by OpenAI');
        console.log('[EnrichProfileUseCase] Bio length:', bio.length, 'characters');
        console.log('[EnrichProfileUseCase] Bio preview:', bio.substring(0, 200));
      } catch (error) {
        console.error('[EnrichProfileUseCase] ❌❌❌ OPENAI ENRICHMENT FAILED - BIO GENERATION ❌❌❌');
        console.error('[EnrichProfileUseCase] Error message:', error.message);
        console.error('[EnrichProfileUseCase] Error stack:', error.stack);
        if (error.response) {
          console.error('[EnrichProfileUseCase] Error response status:', error.response.status);
          console.error('[EnrichProfileUseCase] Error response data:', JSON.stringify(error.response.data, null, 2));
        }
        throw new Error('OpenAI enrichment failed: Bio generation failed. ' + error.message);
      }

      // Generate project summaries using OpenAI AI (NO FALLBACK - must succeed if repos exist)
      let projectSummaries = [];
      const repositories = githubData.repositories || [];
      
      if (repositories.length > 0) {
        console.log('[EnrichProfileUseCase] ========== GENERATING PROJECT SUMMARIES ==========');
        console.log('[EnrichProfileUseCase] Calling OpenAI API to generate project summaries...');
        console.log('[EnrichProfileUseCase] Number of repositories:', repositories.length);
        try {
          projectSummaries = await this.openAIClient.generateProjectSummaries(repositories);
          console.log(`[EnrichProfileUseCase] ✅ Generated ${projectSummaries.length} project summaries by OpenAI`);
          if (projectSummaries.length > 0) {
            console.log('[EnrichProfileUseCase] Sample summary:', projectSummaries[0].summary?.substring(0, 200));
          }
        } catch (error) {
          console.error('[EnrichProfileUseCase] ❌❌❌ OPENAI ENRICHMENT FAILED - PROJECT SUMMARIES GENERATION ❌❌❌');
          console.error('[EnrichProfileUseCase] Error message:', error.message);
          console.error('[EnrichProfileUseCase] Error stack:', error.stack);
          if (error.response) {
            console.error('[EnrichProfileUseCase] Error response status:', error.response.status);
            console.error('[EnrichProfileUseCase] Error response data:', JSON.stringify(error.response.data, null, 2));
          }
          throw new Error('OpenAI enrichment failed: Project summaries generation failed. ' + error.message);
        }
      } else {
        console.log('[EnrichProfileUseCase] No repositories found in GitHub data, skipping project summaries');
      }

      // Generate value proposition using OpenAI AI (NO FALLBACK - must succeed)
      console.log('[EnrichProfileUseCase] ========== GENERATING VALUE PROPOSITION ==========');
      console.log('[EnrichProfileUseCase] Calling OpenAI API to generate value proposition...');
      console.log('[EnrichProfileUseCase] Current role:', employeeBasicInfo.current_role_in_company);
      console.log('[EnrichProfileUseCase] Target role:', employeeBasicInfo.target_role_in_company);
      
      let valueProposition;
      try {
        valueProposition = await this.openAIClient.generateValueProposition(employeeBasicInfo);
        console.log('[EnrichProfileUseCase] ✅ Value proposition generated successfully by OpenAI');
        console.log('[EnrichProfileUseCase] Value proposition length:', valueProposition.length, 'characters');
        console.log('[EnrichProfileUseCase] Value proposition preview:', valueProposition);
      } catch (error) {
        console.error('[EnrichProfileUseCase] ❌❌❌ OPENAI ENRICHMENT FAILED - VALUE PROPOSITION GENERATION ❌❌❌');
        console.error('[EnrichProfileUseCase] Error message:', error.message);
        console.error('[EnrichProfileUseCase] Error stack:', error.stack);
        if (error.response) {
          console.error('[EnrichProfileUseCase] Error response status:', error.response.status);
          console.error('[EnrichProfileUseCase] Error response data:', JSON.stringify(error.response.data, null, 2));
        }
        throw new Error('OpenAI enrichment failed: Value proposition generation failed. ' + error.message);
      }

      // All OpenAI calls succeeded - mark enrichment as completed
      console.log('[EnrichProfileUseCase] ✅✅✅ ALL OPENAI ENRICHMENT SUCCEEDED ✅✅✅');
      console.log('[EnrichProfileUseCase] Bio generated: YES');
      console.log('[EnrichProfileUseCase] Project summaries generated:', projectSummaries.length);
      console.log('[EnrichProfileUseCase] Value proposition generated: YES');

      // Update employee profile with enriched data
      // Set enrichment_completed = TRUE since all OpenAI calls succeeded
      const updatedEmployee = await this.employeeRepository.updateEnrichment(
        employeeId,
        bio,
        projectSummaries,
        valueProposition,
        true // All Gemini calls succeeded
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
    console.log('[EnrichProfileUseCase] Checking if ready for enrichment...');
    console.log('[EnrichProfileUseCase] Employee ID:', employeeId);
    
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      console.log('[EnrichProfileUseCase] ❌ Employee not found');
      return false;
    }

    const hasLinkedIn = !!employee.linkedin_data;
    const hasGitHub = !!employee.github_data;
    const notCompleted = !employee.enrichment_completed;
    
    console.log('[EnrichProfileUseCase] Employee:', employee.email);
    console.log('[EnrichProfileUseCase] Has LinkedIn data:', hasLinkedIn);
    console.log('[EnrichProfileUseCase] Has GitHub data:', hasGitHub);
    console.log('[EnrichProfileUseCase] Enrichment not completed:', notCompleted);
    
    const isReady = !!(hasLinkedIn && hasGitHub && notCompleted);
    console.log('[EnrichProfileUseCase] Ready for enrichment:', isReady);
    
    return isReady;
  }
}

module.exports = EnrichProfileUseCase;

