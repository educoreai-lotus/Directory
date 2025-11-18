// Infrastructure Layer - Mock Data Service
// Provides fallback mock data when external APIs fail

class MockDataService {
  constructor() {
    // Load mock data (will be created if it doesn't exist)
    try {
      this.mockData = require('../../mockData/index.json');
    } catch (error) {
      console.warn('[MockDataService] Mock data file not found, using default mocks');
      this.mockData = {};
    }
  }

  /**
   * Get mock bio for an employee
   * @param {Object} employeeBasicInfo - Basic employee info
   * @returns {string} Mock bio
   */
  getMockBio(employeeBasicInfo) {
    const name = employeeBasicInfo?.full_name || 'Employee';
    const role = employeeBasicInfo?.current_role_in_company || 'professional';
    
    // Try to get from mock data file
    if (this.mockData?.gemini?.bio) {
      return this.mockData.gemini.bio
        .replace('{{name}}', name)
        .replace('{{role}}', role);
    }

    // Default mock bio
    return `${name} is a ${role} with expertise in software development and technology. They bring valuable experience and skills to their team, contributing to innovative projects and solutions.`;
  }

  /**
   * Get mock project summaries for repositories
   * @param {Array} repositories - Array of repository objects
   * @returns {Array} Array of project summaries
   */
  getMockProjectSummaries(repositories) {
    if (!repositories || repositories.length === 0) {
      return [];
    }

    // Try to get from mock data file
    if (this.mockData?.gemini?.project_summaries) {
      return this.mockData.gemini.project_summaries.slice(0, repositories.length);
    }

    // Generate default mock summaries from repository data
    return repositories.slice(0, 20).map(repo => ({
      repository_name: repo.name,
      repository_url: repo.url,
      summary: repo.description || 
        `A ${repo.language || 'software'} project${repo.is_fork ? ' (forked)' : ''} that demonstrates technical skills and development experience.`
    }));
  }

  /**
   * Get mock data for a specific microservice and operation
   * @param {string} microservice - Microservice name (e.g., 'skills-engine')
   * @param {string} operation - Operation name (e.g., 'normalize-skills')
   * @returns {Object|null} Mock data or null if not found
   */
  getMockData(microservice, operation) {
    if (!this.mockData[microservice] || !this.mockData[microservice][operation]) {
      return null;
    }
    return this.mockData[microservice][operation];
  }
}

module.exports = MockDataService;

