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
   * Improved prompt with clear role, context, and task definitions
   */
  buildBioPrompt(linkedinData, githubData, employeeBasicInfo) {
    // ROLE: Define AI's role
    let prompt = `You are a professional HR and career development AI assistant specializing in creating compelling, accurate professional bios for employee profiles.\n\n`;
    
    // CONTEXT: Provide employee context
    const name = employeeBasicInfo?.full_name || 'the employee';
    const role = employeeBasicInfo?.current_role_in_company || 'their role';
    const targetRole = employeeBasicInfo?.target_role_in_company || null;
    
    prompt += `CONTEXT:\n`;
    prompt += `You are creating a professional bio for ${name}, who currently works as ${role}`;
    if (targetRole && targetRole !== role) {
      prompt += ` with career goals to transition to ${targetRole}`;
    }
    prompt += `.\n\n`;
    
    // DATA SOURCES: LinkedIn information
    if (linkedinData) {
      prompt += `LINKEDIN PROFILE DATA:\n`;
      if (linkedinData.name) prompt += `- Full Name: ${linkedinData.name}\n`;
      if (linkedinData.given_name) prompt += `- First Name: ${linkedinData.given_name}\n`;
      if (linkedinData.family_name) prompt += `- Last Name: ${linkedinData.family_name}\n`;
      if (linkedinData.email) prompt += `- Email: ${linkedinData.email}\n`;
      if (linkedinData.locale) prompt += `- Location: ${linkedinData.locale}\n`;
      if (linkedinData.headline) prompt += `- Professional Headline: ${linkedinData.headline}\n`;
      if (linkedinData.summary) prompt += `- Professional Summary: ${linkedinData.summary}\n`;
      if (linkedinData.positions && linkedinData.positions.length > 0) {
        prompt += `- Work Experience (${linkedinData.positions.length} position(s)):\n`;
        linkedinData.positions.slice(0, 5).forEach((pos, idx) => {
          prompt += `  ${idx + 1}. ${pos.title || 'Position'} at ${pos.companyName || 'Company'}`;
          if (pos.description) prompt += `\n     Description: ${pos.description.substring(0, 200)}`;
          if (pos.startDate) prompt += `\n     Duration: ${pos.startDate}${pos.endDate ? ` - ${pos.endDate}` : ' (Current)'}`;
          prompt += '\n';
        });
      }
      prompt += '\n';
    }
    
    // DATA SOURCES: GitHub information
    if (githubData) {
      prompt += `GITHUB PROFILE DATA:\n`;
      if (githubData.name) prompt += `- Name: ${githubData.name}\n`;
      if (githubData.login) prompt += `- Username: ${githubData.login}\n`;
      if (githubData.bio) prompt += `- Bio: ${githubData.bio}\n`;
      if (githubData.company) prompt += `- Company: ${githubData.company}\n`;
      if (githubData.location) prompt += `- Location: ${githubData.location}\n`;
      if (githubData.blog) prompt += `- Website: ${githubData.blog}\n`;
      if (githubData.public_repos) prompt += `- Public Repositories: ${githubData.public_repos}\n`;
      if (githubData.followers) prompt += `- Followers: ${githubData.followers}\n`;
      if (githubData.following) prompt += `- Following: ${githubData.following}\n`;
      if (githubData.repositories && githubData.repositories.length > 0) {
        prompt += `- Total Repositories: ${githubData.repositories.length}\n`;
        // Include top repositories with detailed information
        const topRepos = githubData.repositories.slice(0, 10);
        prompt += `- Top Repositories (showing technical expertise):\n`;
        topRepos.forEach((repo, idx) => {
          prompt += `  ${idx + 1}. ${repo.name}`;
          if (repo.description) prompt += `\n     Description: ${repo.description}`;
          if (repo.language) prompt += `\n     Primary Language: ${repo.language}`;
          if (repo.stars) prompt += `\n     Stars: ${repo.stars}`;
          if (repo.forks) prompt += `\n     Forks: ${repo.forks}`;
          if (repo.url) prompt += `\n     URL: ${repo.url}`;
          if (repo.is_fork) prompt += `\n     Note: Forked repository`;
          prompt += '\n';
        });
      }
      prompt += '\n';
    }
    
    // TASK: Define what the AI needs to do
    prompt += `TASK:\n`;
    prompt += `Your task is to create a professional, compelling bio that:\n`;
    prompt += `1. Synthesizes information from both LinkedIn (professional experience) and GitHub (technical expertise)\n`;
    prompt += `2. Highlights the employee's professional background, technical skills, and career trajectory\n`;
    prompt += `3. Connects their current role with their career goals (if target role is different)\n`;
    prompt += `4. Showcases their technical contributions and professional achievements\n\n`;
    
    // REQUIREMENTS: Output specifications
    prompt += `OUTPUT REQUIREMENTS:\n`;
    prompt += `- Write in third person (e.g., "John is a...", "She has...", "They specialize in...")\n`;
    prompt += `- Length: 2-3 sentences, maximum 200 words\n`;
    prompt += `- Tone: Professional, confident, and engaging\n`;
    prompt += `- Content: Focus on professional experience, technical expertise, key achievements, and career goals\n`;
    prompt += `- Style: Use active voice and specific examples when possible\n`;
    prompt += `- Restrictions: Do NOT include personal contact information, email addresses, URLs, or social media handles\n`;
    prompt += `- Format: Return ONLY the bio text, no markdown, no code blocks, no explanations, no additional formatting\n\n`;
    
    prompt += `Now generate the professional bio:\n`;
    
    return prompt;
  }

  /**
   * Build prompt for project summaries generation
   * Improved prompt with clear role, context, and task definitions
   */
  buildProjectSummariesPrompt(repositories) {
    // ROLE: Define AI's role
    let prompt = `You are a technical documentation AI assistant specializing in creating clear, professional project summaries for software repositories.\n\n`;
    
    // CONTEXT: Explain the purpose
    prompt += `CONTEXT:\n`;
    prompt += `You are creating project summaries for an employee's GitHub repositories to showcase their technical contributions and expertise.\n`;
    prompt += `These summaries will appear on the employee's professional profile.\n\n`;
    
    // DATA: Repository information
    prompt += `REPOSITORY DATA:\n`;
    
    // Include detailed information about each repository
    repositories.slice(0, 20).forEach((repo, index) => {
      prompt += `${index + 1}. ${repo.name || repo.full_name || 'Repository'}\n`;
      if (repo.description) prompt += `   Description: ${repo.description}\n`;
      if (repo.language) prompt += `   Primary Language: ${repo.language}\n`;
      if (repo.stars) prompt += `   Stars: ${repo.stars}\n`;
      if (repo.forks) prompt += `   Forks: ${repo.forks}\n`;
      if (repo.url) prompt += `   URL: ${repo.url}\n`;
      if (repo.created_at) prompt += `   Created: ${repo.created_at}\n`;
      if (repo.updated_at) prompt += `   Last Updated: ${repo.updated_at}\n`;
      if (repo.is_fork) prompt += `   Type: Forked repository (contribution to existing project)\n`;
      if (repo.is_private) prompt += `   Visibility: Private repository\n`;
      prompt += '\n';
    });
    
    // TASK: Define what the AI needs to do
    prompt += `TASK:\n`;
    prompt += `For each repository, create a concise, professional summary that:\n`;
    prompt += `1. Describes the project's purpose and main functionality\n`;
    prompt += `2. Highlights key technologies, frameworks, or tools used\n`;
    prompt += `3. Explains the business value or technical significance\n`;
    prompt += `4. For forked repositories, notes that it's a contribution to an existing project\n\n`;
    
    // OUTPUT REQUIREMENTS: Format specifications
    prompt += `OUTPUT REQUIREMENTS:\n`;
    prompt += `- Return a valid JSON array with objects containing "repository_name" and "summary" fields\n`;
    prompt += `- Each summary: 1-2 sentences, maximum 150 words\n`;
    prompt += `- Tone: Professional, technical, and suitable for a work profile\n`;
    prompt += `- Content: Focus on what the project does, why it matters, and key technologies\n`;
    prompt += `- Format: Valid JSON only, no markdown code blocks, no explanations, no additional text\n`;
    prompt += `- Example format: [{"repository_name": "project-name", "summary": "Brief professional description..."}]\n\n`;
    
    prompt += `Now generate the project summaries:\n`;
    
    return prompt;
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

