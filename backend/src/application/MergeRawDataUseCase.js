// Application Layer - Merge Raw Data Use Case
// Intelligently merges raw data from all sources (PDF, manual, LinkedIn, GitHub)
// PHASE_2: This file is part of the extended enrichment flow

const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');

class MergeRawDataUseCase {
  constructor() {
    this.rawDataRepository = new EmployeeRawDataRepository();
  }

  /**
   * Merge all available raw data sources for an employee
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Merged data object or null if no data exists
   */
  async execute(employeeId) {
    try {
      console.log('[MergeRawDataUseCase] Starting merge for employee:', employeeId);

      // Load all raw data sources
      const allRawData = await this.rawDataRepository.findByEmployeeId(employeeId);
      
      if (!allRawData || allRawData.length === 0) {
        console.log('[MergeRawDataUseCase] No raw data found for employee');
        return null;
      }

      console.log('[MergeRawDataUseCase] Found', allRawData.length, 'raw data sources');

      // Separate by source
      const pdfData = allRawData.find(r => r.source === 'pdf')?.data || null;
      const manualData = allRawData.find(r => r.source === 'manual')?.data || null;
      const linkedinData = allRawData.find(r => r.source === 'linkedin')?.data || null;
      const githubData = allRawData.find(r => r.source === 'github')?.data || null;

      // Build merged object
      const merged = {
        work_experience: [],
        skills: [],
        education: [],
        languages: [],
        projects: [],
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

      // Store full LinkedIn and GitHub profiles for reference
      if (linkedinData) {
        merged.linkedin_profile = linkedinData;
      }
      if (githubData) {
        merged.github_profile = githubData;
      }

      // Save merged result to database
      await this.rawDataRepository.createOrUpdate(employeeId, 'merged', merged);

      console.log('[MergeRawDataUseCase] Merge completed successfully:', {
        work_experience_count: merged.work_experience.length,
        skills_count: merged.skills.length,
        education_count: merged.education.length,
        languages_count: merged.languages.length,
        projects_count: merged.projects.length
      });

      return merged;
    } catch (error) {
      console.error('[MergeRawDataUseCase] Error merging raw data:', error);
      throw error;
    }
  }
}

module.exports = MergeRawDataUseCase;

