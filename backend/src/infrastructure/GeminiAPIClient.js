// Infrastructure Layer - Gemini API Client
// Handles API calls to Google Gemini AI for profile enrichment

const axios = require('axios');
const config = require('../config');

class GeminiAPIClient {
  constructor() {
    this.apiKey = config.gemini?.apiKey || process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    
    if (!this.apiKey) {
      console.warn('[GeminiAPIClient] ⚠️  Gemini API key not configured.');
      console.warn('[GeminiAPIClient] To enable Gemini AI enrichment, set GEMINI_API_KEY in Railway.');
      console.warn('[GeminiAPIClient] See /docs/Gemini-Integration-Setup.md for setup instructions.');
    } else {
      console.log('[GeminiAPIClient] ✅ Gemini API key configured');
    }
  }

  /**
   * Generate professional bio from LinkedIn and GitHub data
   * @param {Object} linkedinData - LinkedIn profile data
   * @param {Object} githubData - GitHub profile data
   * @param {Object} employeeBasicInfo - Basic employee info (name, role, etc.)
   * @returns {Promise<string>} Generated bio
   */
  async generateBio(linkedinData, githubData, employeeBasicInfo) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = this.buildBioPrompt(linkedinData, githubData, employeeBasicInfo);

    try {
      const response = await axios.post(
        `${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const bio = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!bio) {
        throw new Error('No bio generated from Gemini API');
      }

      return bio;
    } catch (error) {
      console.error('[GeminiAPIClient] Error generating bio:', error.response?.data || error.message);
      throw new Error(`Failed to generate bio: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Generate project summaries for GitHub repositories
   * @param {Array} repositories - Array of GitHub repository objects
   * @returns {Promise<Array>} Array of project summaries with repository_name and summary
   */
  async generateProjectSummaries(repositories) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    if (!repositories || repositories.length === 0) {
      return [];
    }

    const prompt = this.buildProjectSummariesPrompt(repositories);

    try {
      const response = await axios.post(
        `${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const summariesText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!summariesText) {
        throw new Error('No project summaries generated from Gemini API');
      }

      // Parse the response (expecting JSON array)
      const summaries = this.parseProjectSummaries(summariesText, repositories);
      return summaries;
    } catch (error) {
      console.error('[GeminiAPIClient] Error generating project summaries:', error.response?.data || error.message);
      throw new Error(`Failed to generate project summaries: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Build prompt for bio generation
   */
  buildBioPrompt(linkedinData, githubData, employeeBasicInfo) {
    const name = employeeBasicInfo?.full_name || 'the employee';
    const role = employeeBasicInfo?.current_role_in_company || 'their role';
    
    let context = `Generate a professional, concise bio (2-3 sentences) for ${name}, who works as ${role}.\n\n`;
    
    if (linkedinData) {
      context += `LinkedIn Profile Information:\n`;
      if (linkedinData.headline) context += `- Headline: ${linkedinData.headline}\n`;
      if (linkedinData.summary) context += `- Summary: ${linkedinData.summary}\n`;
      if (linkedinData.positions && linkedinData.positions.length > 0) {
        context += `- Work Experience: ${linkedinData.positions.length} position(s)\n`;
      }
      context += '\n';
    }
    
    if (githubData) {
      context += `GitHub Profile Information:\n`;
      if (githubData.bio) context += `- Bio: ${githubData.bio}\n`;
      if (githubData.public_repos) context += `- Public Repositories: ${githubData.public_repos}\n`;
      if (githubData.repositories && githubData.repositories.length > 0) {
        context += `- Total Repositories: ${githubData.repositories.length}\n`;
      }
      context += '\n';
    }
    
    context += `Requirements:\n`;
    context += `- Write in third person\n`;
    context += `- Keep it professional and concise (2-3 sentences)\n`;
    context += `- Focus on professional experience and technical expertise\n`;
    context += `- Do not include personal information or contact details\n`;
    context += `- Return only the bio text, no additional formatting or explanations\n`;
    
    return context;
  }

  /**
   * Build prompt for project summaries generation
   */
  buildProjectSummariesPrompt(repositories) {
    let context = `Generate concise project summaries (1-2 sentences each) for the following GitHub repositories.\n\n`;
    context += `Repositories:\n`;
    
    repositories.slice(0, 20).forEach((repo, index) => {
      context += `${index + 1}. ${repo.name}`;
      if (repo.description) context += ` - ${repo.description}`;
      if (repo.language) context += ` (${repo.language})`;
      context += '\n';
    });
    
    context += `\nRequirements:\n`;
    context += `- Return a JSON array with objects containing "repository_name" and "summary" fields\n`;
    context += `- Each summary should be 1-2 sentences describing what the project does\n`;
    context += `- Focus on the purpose and key technologies used\n`;
    context += `- Return only valid JSON, no markdown formatting or code blocks\n`;
    context += `- Example format: [{"repository_name": "project-name", "summary": "Brief description..."}]\n`;
    
    return context;
  }

  /**
   * Parse project summaries from Gemini response
   */
  parseProjectSummaries(summariesText, repositories) {
    try {
      // Try to extract JSON from the response (might be wrapped in markdown)
      let jsonText = summariesText.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }
      
      // Try to parse as JSON
      const summaries = JSON.parse(jsonText);
      
      if (!Array.isArray(summaries)) {
        throw new Error('Response is not an array');
      }
      
      // Validate and map to repository names
      return summaries.map(item => ({
        repository_name: item.repository_name || item.name || '',
        repository_url: repositories.find(r => r.name === item.repository_name)?.url || null,
        summary: item.summary || item.description || ''
      })).filter(item => item.repository_name && item.summary);
    } catch (error) {
      console.warn('[GeminiAPIClient] Failed to parse JSON, creating summaries from repository data:', error.message);
      
      // Fallback: create basic summaries from repository data
      return repositories.slice(0, 20).map(repo => ({
        repository_name: repo.name,
        repository_url: repo.url,
        summary: repo.description || `A ${repo.language || 'software'} project${repo.is_fork ? ' (forked)' : ''}.`
      }));
    }
  }
}

module.exports = GeminiAPIClient;

