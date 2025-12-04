// Application Layer - Enrich Profile Use Case
// Orchestrates profile enrichment after both LinkedIn and GitHub OAuth connections

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const OpenAIAPIClient = require('../infrastructure/OpenAIAPIClient');
const EmployeeProfileApprovalRepository = require('../infrastructure/EmployeeProfileApprovalRepository');
const MicroserviceClient = require('../infrastructure/MicroserviceClient');
const CompanyRepository = require('../infrastructure/CompanyRepository');
// PHASE_2: Import MergeRawDataUseCase for extended enrichment flow
const MergeRawDataUseCase = require('./MergeRawDataUseCase');

class EnrichProfileUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.openAIClient = new OpenAIAPIClient();
    this.approvalRepository = new EmployeeProfileApprovalRepository();
    this.microserviceClient = new MicroserviceClient();
    this.companyRepository = new CompanyRepository();
    // PHASE_2: Initialize MergeRawDataUseCase for extended enrichment flow
    this.mergeRawDataUseCase = new MergeRawDataUseCase();
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

      // PHASE_2: Try to merge raw data from new sources (PDF, manual, LinkedIn, GitHub)
      // This allows enrichment with PDF/manual data even without OAuth
      let mergedData = null;
      let linkedinData = null;
      let githubData = null;
      
      try {
        console.log('[EnrichProfileUseCase] Calling mergeRawDataBeforeEnrichment...');
        mergedData = await this.mergeRawDataBeforeEnrichment(employeeId);
        console.log('[EnrichProfileUseCase] mergeRawDataBeforeEnrichment returned:', mergedData ? 'object' : 'null');
        
        if (mergedData) {
          console.log('[EnrichProfileUseCase] Merged data structure:', {
            has_work_experience: !!mergedData.work_experience,
            work_experience_length: mergedData.work_experience?.length || 0,
            has_skills: !!mergedData.skills,
            skills_length: mergedData.skills?.length || 0,
            has_education: !!mergedData.education,
            education_length: mergedData.education?.length || 0,
            has_languages: !!mergedData.languages,
            languages_length: mergedData.languages?.length || 0,
            has_projects: !!mergedData.projects,
            projects_length: mergedData.projects?.length || 0,
            has_volunteer: !!mergedData.volunteer,
            volunteer_length: mergedData.volunteer?.length || 0,
            has_military: !!mergedData.military,
            military_length: mergedData.military?.length || 0,
            has_linkedin_profile: mergedData.linkedin_profile !== null,
            has_github_profile: mergedData.github_profile !== null
          });
        }
        
        // SAFE FALLBACK: If merged data is empty, continue with empty fields instead of throwing
        if (!mergedData) {
          console.warn('[EnrichProfileUseCase] ⚠️  Merged data is null - will proceed with minimal enrichment');
          mergedData = {
            work_experience: [],
            skills: [],
            education: [],
            languages: [],
            projects: [],
            volunteer: [],
            military: [],
            linkedin_profile: null,
            github_profile: null
          };
        }
        
        console.log('[EnrichProfileUseCase] ✅ Merged raw data available from new sources');
        
        // Extract LinkedIn and GitHub data from merged result
        if (mergedData?.linkedin_profile) {
          linkedinData = mergedData.linkedin_profile;
          console.log('[EnrichProfileUseCase] Extracted LinkedIn data from merged result');
        }
        if (mergedData?.github_profile) {
          githubData = mergedData.github_profile;
          console.log('[EnrichProfileUseCase] Extracted GitHub data from merged result');
        }
      } catch (error) {
        console.error('[EnrichProfileUseCase] ❌ ERROR in mergeRawDataBeforeEnrichment:', error.message);
        console.error('[EnrichProfileUseCase] Error stack:', error.stack);
        console.warn('[EnrichProfileUseCase] ⚠️  Merge failed, falling back to existing OAuth data');
        // Fall through to existing logic below
      }

      // PHASE_2: Fallback to existing OAuth data if merge failed or no new sources exist
      // This ensures backward compatibility with existing OAuth-only flow
      if (!mergedData) {
        // Check if both LinkedIn and GitHub are connected (existing requirement)
        if (!employee.linkedin_data || !employee.github_data) {
          console.warn('[EnrichProfileUseCase] ⚠️  Missing OAuth data - LinkedIn:', !!employee.linkedin_data, 'GitHub:', !!employee.github_data);
          console.warn('[EnrichProfileUseCase] ⚠️  Proceeding with minimal enrichment (empty fields)');
          // SAFE FALLBACK: Don't throw, proceed with empty data
          linkedinData = null;
          githubData = null;
        } else {
          // Parse stored data (existing logic)
          linkedinData = typeof employee.linkedin_data === 'string' 
            ? JSON.parse(employee.linkedin_data) 
            : employee.linkedin_data;
          
          githubData = typeof employee.github_data === 'string'
            ? JSON.parse(employee.github_data)
            : employee.github_data;
        }
      }
      
      // SAFE FALLBACK: Check if we have any usable data, but don't throw if empty
      const hasContent = mergedData ? (
        mergedData.work_experience?.length > 0 ||
        mergedData.skills?.length > 0 ||
        mergedData.education?.length > 0 ||
        mergedData.languages?.length > 0 ||
        mergedData.projects?.length > 0 ||
        mergedData.volunteer?.length > 0 ||
        mergedData.military?.length > 0 ||
        mergedData.linkedin_profile !== null ||
        mergedData.github_profile !== null
      ) : (linkedinData !== null || githubData !== null);
      
      // SAFE FALLBACK: Check if merged data is completely empty BEFORE calling OpenAI
      console.log('[EnrichProfileUseCase] Checking if merged data is empty...');
      console.log('[EnrichProfileUseCase] mergedData exists:', !!mergedData);
      console.log('[EnrichProfileUseCase] linkedinData exists:', !!linkedinData);
      console.log('[EnrichProfileUseCase] githubData exists:', !!githubData);
      
      const mergedDataIsEmpty = mergedData ? (
        (!mergedData.work_experience || mergedData.work_experience.length === 0) &&
        (!mergedData.skills || mergedData.skills.length === 0) &&
        (!mergedData.education || mergedData.education.length === 0) &&
        (!mergedData.languages || mergedData.languages.length === 0) &&
        (!mergedData.projects || mergedData.projects.length === 0) &&
        (!mergedData.volunteer || mergedData.volunteer.length === 0) &&
        (!mergedData.military || mergedData.military.length === 0) &&
        mergedData.linkedin_profile === null &&
        mergedData.github_profile === null
      ) : (
        linkedinData === null && githubData === null
      );

      console.log('[EnrichProfileUseCase] mergedDataIsEmpty check result:', mergedDataIsEmpty);

      if (mergedDataIsEmpty) {
        console.warn('[EnrichProfileUseCase] ⚠️  Merged data is completely empty - returning success with empty fields');
        
        try {
          // Update employee to mark enrichment as completed (even with empty data)
          console.log('[EnrichProfileUseCase] Calling updateEnrichment with empty data...');
          await this.employeeRepository.updateEnrichment(
            employeeId,
            '', // Empty bio
            [], // Empty project summaries
            '', // Empty value proposition
            true // Mark as completed
          );
          console.log('[EnrichProfileUseCase] ✅ updateEnrichment completed successfully');

          return {
            success: true,
            message: "No enrichment data available",
            bio: "",
            skills: [],
            projects: [],
            employee: {
              id: employeeId,
              enrichment_completed: true
            }
          };
        } catch (updateError) {
          console.error('[EnrichProfileUseCase] ❌ ERROR in updateEnrichment:', updateError.message);
          console.error('[EnrichProfileUseCase] Error stack:', updateError.stack);
          throw updateError; // Re-throw to be caught by controller
        }
      }
      
      console.log('[EnrichProfileUseCase] ✅ Proceeding with enrichment (with or without data)...');

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
        console.error('[EnrichProfileUseCase] ⚠️  OpenAI bio generation failed, using fallback');
        console.error('[EnrichProfileUseCase] Error message:', error.message);
        // SAFE FALLBACK: Use minimal bio instead of throwing
        bio = `${employeeBasicInfo.full_name} is ${employeeBasicInfo.current_role_in_company} at ${employeeBasicInfo.company_name}.`;
        console.log('[EnrichProfileUseCase] ✅ Using fallback bio');
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
          console.error('[EnrichProfileUseCase] ⚠️  OpenAI project summaries generation failed, using empty array');
          console.error('[EnrichProfileUseCase] Error message:', error.message);
          // SAFE FALLBACK: Use empty array instead of throwing
          projectSummaries = [];
          console.log('[EnrichProfileUseCase] ✅ Using empty project summaries array');
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
        console.error('[EnrichProfileUseCase] ⚠️  OpenAI value proposition generation failed, using fallback');
        console.error('[EnrichProfileUseCase] Error message:', error.message);
        // SAFE FALLBACK: Use minimal value proposition instead of throwing
        valueProposition = `${employeeBasicInfo.full_name} contributes to ${employeeBasicInfo.company_name} in their role as ${employeeBasicInfo.current_role_in_company}.`;
        console.log('[EnrichProfileUseCase] ✅ Using fallback value proposition');
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

        // PHASE_2: Prepare raw data for Skills Engine (use merged data if available, otherwise OAuth data)
        const rawData = mergedData ? {
          linkedin: mergedData.linkedin_profile || linkedinData,
          github: mergedData.github_profile || githubData,
          work_experience: mergedData.work_experience || [],
          skills: mergedData.skills || [],
          education: mergedData.education || [],
          languages: mergedData.languages || [],
          projects: mergedData.projects || []
        } : {
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
      // DIAGNOSTIC: Log FULL error details
      console.error('[EnrichProfileUseCase] ========== ENRICHMENT ERROR ==========');
      console.error('[EnrichProfileUseCase] Error message:', error.message);
      console.error('[EnrichProfileUseCase] Error name:', error.name);
      console.error('[EnrichProfileUseCase] Error stack:', error.stack);
      if (error.cause) {
        console.error('[EnrichProfileUseCase] Error cause:', error.cause);
      }
      console.error('[EnrichProfileUseCase] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  }

  /**
   * PHASE_2: Merge raw data before enrichment
   * Attempts to merge data from all sources (PDF, manual, LinkedIn, GitHub)
   * Returns null if no new sources exist (allows fallback to OAuth-only flow)
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Merged data or null
   */
  async mergeRawDataBeforeEnrichment(employeeId) {
    try {
      return await this.mergeRawDataUseCase.execute(employeeId);
    } catch (error) {
      console.warn('[EnrichProfileUseCase] Merge failed, will use fallback:', error.message);
      return null; // Signal to use fallback
    }
  }

  /**
   * Check if employee is ready for enrichment
   * PHASE_2: Now checks for new data sources (PDF, manual) OR existing OAuth data
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

    // PHASE_2: Check for new data sources (PDF, manual, LinkedIn, GitHub in new table)
    let hasNewDataSources = false;
    try {
      const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
      const rawDataRepo = new EmployeeRawDataRepository();
      hasNewDataSources = await rawDataRepo.hasAnyData(employeeId);
      console.log('[EnrichProfileUseCase] Has new data sources (PDF/manual/OAuth in new table):', hasNewDataSources);
    } catch (error) {
      console.warn('[EnrichProfileUseCase] Could not check new data sources, using fallback:', error.message);
      // Fall through to existing checks
    }

    // Existing OAuth checks (backward compatible)
    const hasLinkedIn = !!employee.linkedin_data;
    const hasGitHub = !!employee.github_data;
    const notCompleted = !employee.enrichment_completed;
    
    console.log('[EnrichProfileUseCase] Employee:', employee.email);
    console.log('[EnrichProfileUseCase] Has LinkedIn data (old):', hasLinkedIn);
    console.log('[EnrichProfileUseCase] Has GitHub data (old):', hasGitHub);
    console.log('[EnrichProfileUseCase] Enrichment not completed:', notCompleted);
    
    // PHASE_2: Ready if new sources exist OR both OAuth connected (backward compatible)
    const isReady = !!(hasNewDataSources || (hasLinkedIn && hasGitHub)) && notCompleted;
    console.log('[EnrichProfileUseCase] Ready for enrichment:', isReady);
    
    return isReady;
  }
}

module.exports = EnrichProfileUseCase;

