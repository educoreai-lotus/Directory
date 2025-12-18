// Application Layer - Merge Raw Data Use Case
// Intelligently merges raw data from all sources (PDF, manual, LinkedIn, GitHub)
// All raw data is stored in employees table columns: pdf_data, manual_data, linkedin_data, github_data

const EmployeeRepository = require('../infrastructure/EmployeeRepository');

class MergeRawDataUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
  }

  /**
   * Merge all available raw data sources for an employee
   * Reads from employees table columns: pdf_data, manual_data, linkedin_data, github_data
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Merged data object or null if no data exists
   */
  async execute(employeeId) {
    try {
      console.log('[MergeRawDataUseCase] Starting merge for employee:', employeeId);

      // Load employee with all raw data columns
      const employee = await this.employeeRepository.findById(employeeId);
      
      if (!employee) {
        console.log('[MergeRawDataUseCase] Employee not found');
        return null;
      }

      // Parse JSONB data from employees table columns
      const pdfData = employee.pdf_data 
        ? (typeof employee.pdf_data === 'string' ? JSON.parse(employee.pdf_data) : employee.pdf_data)
        : null;
      const manualData = employee.manual_data
        ? (typeof employee.manual_data === 'string' ? JSON.parse(employee.manual_data) : employee.manual_data)
        : null;
      const linkedinData = employee.linkedin_data
        ? (typeof employee.linkedin_data === 'string' ? JSON.parse(employee.linkedin_data) : employee.linkedin_data)
        : null;
      const githubData = employee.github_data
        ? (typeof employee.github_data === 'string' ? JSON.parse(employee.github_data) : employee.github_data)
        : null;

      console.log('[MergeRawDataUseCase] Raw data sources found:', {
        has_pdf: !!pdfData,
        has_manual: !!manualData,
        has_linkedin: !!linkedinData,
        has_github: !!githubData
      });

      // Build merged object
      const merged = {
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

      // Merge work experience (from PDF, LinkedIn, Manual)
      if (pdfData?.work_experience) {
        merged.work_experience = Array.isArray(pdfData.work_experience) 
          ? [...pdfData.work_experience] 
          : [pdfData.work_experience];
      }
      if (linkedinData?.experience) {
        const linkedinExp = Array.isArray(linkedinData.experience) 
          ? linkedinData.experience 
          : [linkedinData.experience];
        merged.work_experience = [...merged.work_experience, ...linkedinExp];
      }
      // Manual data overrides/adds to existing
      if (manualData?.work_experience) {
        const manualExp = Array.isArray(manualData.work_experience) 
          ? manualData.work_experience 
          : [manualData.work_experience];
        // Manual takes priority - prepend to array
        merged.work_experience = [...manualExp, ...merged.work_experience];
      }

      // Merge skills (combine from all sources, remove duplicates)
      const skillsSet = new Set();
      if (pdfData?.skills) {
        const pdfSkills = Array.isArray(pdfData.skills) ? pdfData.skills : [pdfData.skills];
        pdfSkills.forEach(skill => skillsSet.add(String(skill).trim()));
      }
      if (manualData?.skills) {
        const manualSkills = Array.isArray(manualData.skills) 
          ? manualData.skills 
          : String(manualData.skills).split(',').map(s => s.trim());
        manualSkills.forEach(skill => skillsSet.add(String(skill).trim()));
      }
      if (linkedinData?.skills) {
        const linkedinSkills = Array.isArray(linkedinData.skills) 
          ? linkedinData.skills 
          : [linkedinData.skills];
        linkedinSkills.forEach(skill => skillsSet.add(String(skill).trim()));
      }
      if (githubData?.languages) {
        // GitHub languages are also skills
        const githubLanguages = Array.isArray(githubData.languages) 
          ? githubData.languages 
          : [githubData.languages];
        githubLanguages.forEach(lang => skillsSet.add(String(lang).trim()));
      }
      merged.skills = Array.from(skillsSet).filter(s => s.length > 0);

      // Merge education (from PDF, LinkedIn, Manual)
      if (pdfData?.education) {
        merged.education = Array.isArray(pdfData.education) 
          ? [...pdfData.education] 
          : [pdfData.education];
      }
      if (linkedinData?.education) {
        const linkedinEdu = Array.isArray(linkedinData.education) 
          ? linkedinData.education 
          : [linkedinData.education];
        merged.education = [...merged.education, ...linkedinEdu];
      }
      // Manual data overrides/adds
      if (manualData?.education) {
        const manualEdu = Array.isArray(manualData.education) 
          ? manualData.education 
          : [manualData.education];
        merged.education = [...manualEdu, ...merged.education];
      }

      // Merge languages (combine from all sources)
      const languagesSet = new Set();
      if (pdfData?.languages) {
        const pdfLangs = Array.isArray(pdfData.languages) 
          ? pdfData.languages 
          : String(pdfData.languages).split(',').map(l => l.trim());
        pdfLangs.forEach(lang => languagesSet.add(String(lang).trim()));
      }
      if (manualData?.languages) {
        const manualLangs = Array.isArray(manualData.languages) 
          ? manualData.languages 
          : String(manualData.languages).split(',').map(l => l.trim());
        manualLangs.forEach(lang => languagesSet.add(String(lang).trim()));
      }
      if (linkedinData?.languages) {
        const linkedinLangs = Array.isArray(linkedinData.languages) 
          ? linkedinData.languages 
          : [linkedinData.languages];
        linkedinLangs.forEach(lang => languagesSet.add(String(lang).trim()));
      }
      merged.languages = Array.from(languagesSet).filter(l => l.length > 0);

      // Merge projects (from GitHub repositories)
      if (githubData?.repositories) {
        merged.projects = Array.isArray(githubData.repositories) 
          ? [...githubData.repositories] 
          : [githubData.repositories];
      }

      // Merge volunteer (from PDF, Manual)
      if (pdfData?.volunteer) {
        merged.volunteer = Array.isArray(pdfData.volunteer) 
          ? [...pdfData.volunteer] 
          : [pdfData.volunteer];
      }
      if (manualData?.volunteer) {
        const manualVol = Array.isArray(manualData.volunteer) 
          ? manualData.volunteer 
          : [manualData.volunteer];
        merged.volunteer = [...manualVol, ...merged.volunteer];
      }

      // Merge military (from PDF, Manual)
      if (pdfData?.military) {
        merged.military = Array.isArray(pdfData.military) 
          ? [...pdfData.military] 
          : [pdfData.military];
      }
      if (manualData?.military) {
        const manualMil = Array.isArray(manualData.military) 
          ? manualData.military 
          : [manualData.military];
        merged.military = [...manualMil, ...merged.military];
      }

      // Store full LinkedIn and GitHub profiles for reference
      if (linkedinData) {
        merged.linkedin_profile = linkedinData;
      }
      if (githubData) {
        merged.github_profile = githubData;
      }

      // Check if merged data has actual content (not all empty arrays)
      console.log('[MergeRawDataUseCase] Checking merged data content...');
      console.log('[MergeRawDataUseCase] Merged data structure:', {
        work_experience_length: merged.work_experience?.length || 0,
        skills_length: merged.skills?.length || 0,
        education_length: merged.education?.length || 0,
        languages_length: merged.languages?.length || 0,
        projects_length: merged.projects?.length || 0,
        volunteer_length: merged.volunteer?.length || 0,
        military_length: merged.military?.length || 0,
        has_linkedin_profile: merged.linkedin_profile !== null,
        has_github_profile: merged.github_profile !== null
      });
      
      const hasContent = merged.work_experience.length > 0 ||
                        merged.skills.length > 0 ||
                        merged.education.length > 0 ||
                        merged.languages.length > 0 ||
                        merged.projects.length > 0 ||
                        merged.volunteer?.length > 0 ||
                        merged.military?.length > 0 ||
                        merged.linkedin_profile !== null ||
                        merged.github_profile !== null;

      console.log('[MergeRawDataUseCase] hasContent check result:', hasContent);

      if (!hasContent) {
        console.warn('[MergeRawDataUseCase] ⚠️  Merged data is empty - no real content found');
        // SAFE FALLBACK: Return empty object instead of null so enrichment can proceed
        console.log('[MergeRawDataUseCase] Returning empty merged object (not null)');
        return merged; // Return empty object instead of null
      }

      // Note: We don't save merged data anymore - it's computed on-the-fly from employees table columns
      console.log('[MergeRawDataUseCase] Merge completed successfully:', {
        work_experience_count: merged.work_experience.length,
        skills_count: merged.skills.length,
        education_count: merged.education.length,
        languages_count: merged.languages.length,
        projects_count: merged.projects.length,
        volunteer_count: merged.volunteer?.length || 0,
        military_count: merged.military?.length || 0
      });

      return merged;
    } catch (error) {
      console.error('[MergeRawDataUseCase] Error merging raw data:', error);
      throw error;
    }
  }
}

module.exports = MergeRawDataUseCase;

