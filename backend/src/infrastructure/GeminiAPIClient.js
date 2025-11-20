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

    // Retry logic for rate limits (max 3 attempts with exponential backoff)
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Use gemini-1.5-flash for faster responses (free tier compatible)
        const model = 'gemini-1.5-flash';
        const response = await axios.post(
          `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
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

        if (attempt > 0) {
          console.log(`[GeminiAPIClient] ✅ Bio generated successfully after ${attempt} retry(ies)`);
        }
        return bio;
      } catch (error) {
        lastError = error;
        const errorData = error.response?.data;
        const statusCode = error.response?.status;
        const errorMessage = errorData?.error?.message || error.message;
        
        // Check if it's a rate limit error (429) or quota exceeded
        const isRateLimit = statusCode === 429 || 
                           errorMessage?.toLowerCase().includes('rate limit') ||
                           errorMessage?.toLowerCase().includes('quota') ||
                           errorMessage?.toLowerCase().includes('resource exhausted');
        
        if (isRateLimit && attempt < maxRetries - 1) {
          // Exponential backoff: 2^attempt seconds (2s, 4s, 8s)
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[GeminiAPIClient] ⚠️  Rate limit hit (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        }
        
        // If not rate limit or last attempt, throw error
        console.error(`[GeminiAPIClient] Error generating bio (attempt ${attempt + 1}/${maxRetries}):`, errorData || errorMessage);
        if (attempt === maxRetries - 1) {
          throw new Error(`Failed to generate bio after ${maxRetries} attempts: ${errorMessage}`);
        }
      }
    }
    
    // Should never reach here, but just in case
    throw new Error(`Failed to generate bio: ${lastError?.message || 'Unknown error'}`);
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
    
    console.log('[GeminiAPIClient] Generating project summaries for', repositories.length, 'repositories');
    console.log('[GeminiAPIClient] Prompt length:', prompt.length, 'characters');
    console.log('[GeminiAPIClient] Repository names:', repositories.slice(0, 5).map(r => r.name).join(', '));

    // Retry logic for rate limits (max 3 attempts with exponential backoff)
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Use gemini-1.5-flash for faster responses (free tier compatible)
        const model = 'gemini-1.5-flash';
        if (attempt === 0) {
          console.log('[GeminiAPIClient] Calling Gemini API with model:', model);
        }
        
        const response = await axios.post(
          `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
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
            timeout: 60000 // Longer timeout for project summaries (more data)
          }
        );

        const summariesText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!summariesText) {
          console.error('[GeminiAPIClient] No summaries in response:', response.data);
          throw new Error('No project summaries generated from Gemini API');
        }

        if (attempt > 0) {
          console.log(`[GeminiAPIClient] ✅ Summaries received after ${attempt} retry(ies), length:`, summariesText.length);
        } else {
          console.log('[GeminiAPIClient] ✅ Summaries received, length:', summariesText.length);
        }
        
        // Parse the response (expecting JSON array)
        const summaries = this.parseProjectSummaries(summariesText, repositories);
        console.log('[GeminiAPIClient] ✅ Parsed', summaries.length, 'project summaries');
        return summaries;
      } catch (error) {
        lastError = error;
        const errorData = error.response?.data;
        const statusCode = error.response?.status;
        const errorMessage = errorData?.error?.message || error.message;
        
        // Check if it's a rate limit error (429) or quota exceeded
        const isRateLimit = statusCode === 429 || 
                           errorMessage?.toLowerCase().includes('rate limit') ||
                           errorMessage?.toLowerCase().includes('quota') ||
                           errorMessage?.toLowerCase().includes('resource exhausted');
        
        if (isRateLimit && attempt < maxRetries - 1) {
          // Exponential backoff: 2^attempt seconds (2s, 4s, 8s)
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[GeminiAPIClient] ⚠️  Rate limit hit (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        }
        
        // If not rate limit or last attempt, log and throw
        console.error(`[GeminiAPIClient] ❌ Error generating project summaries (attempt ${attempt + 1}/${maxRetries}):`);
        console.error('[GeminiAPIClient] Status:', statusCode);
        console.error('[GeminiAPIClient] Error data:', JSON.stringify(errorData, null, 2));
        console.error('[GeminiAPIClient] Error message:', errorMessage);
        
        if (attempt === maxRetries - 1) {
          throw new Error(`Failed to generate project summaries after ${maxRetries} attempts: ${errorMessage}`);
        }
      }
    }
    
    // Should never reach here, but just in case
    throw new Error(`Failed to generate project summaries: ${lastError?.message || 'Unknown error'}`);
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
    
    // Determine correct pronoun based on name or LinkedIn data
    const firstName = employeeBasicInfo?.full_name?.split(' ')[0] || linkedinData?.given_name || '';
    // Use he/she based on common name patterns (this is a simple approach - can be improved with gender detection API if needed)
    let pronoun = 'they';
    let possessive = 'their';
    if (firstName) {
      // Common female name endings/patterns (simplified - can be enhanced)
      const femalePatterns = ['a', 'ia', 'ella', 'ette', 'ine', 'elle'];
      const lastName = firstName.toLowerCase();
      if (femalePatterns.some(pattern => lastName.endsWith(pattern)) || 
          linkedinData?.gender === 'female' || 
          (linkedinData?.pronouns && linkedinData.pronouns.includes('she'))) {
        pronoun = 'she';
        possessive = 'her';
      } else if (linkedinData?.gender === 'male' || 
                 (linkedinData?.pronouns && linkedinData.pronouns.includes('he'))) {
        pronoun = 'he';
        possessive = 'his';
      }
    }
    
    prompt += `- Write in third person using "${pronoun}" and "${possessive}" as the pronoun (e.g., "${name} is a...", "${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} has...", "${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} specializes in...")\n`;
    prompt += `- Length: 3-5 sentences, maximum 250 words\n`;
    prompt += `- Tone: Professional, confident, and engaging\n`;
    prompt += `- Content: Synthesize information from LinkedIn (professional experience, positions, summary) and GitHub (repositories, languages, contributions) to create a unique, personalized bio\n`;
    prompt += `- Style: Use active voice, specific achievements, technologies mentioned in repositories, and career progression\n`;
    prompt += `- Personalization: Make it unique to this person - reference specific technologies, projects, or experiences from their LinkedIn and GitHub data\n`;
    prompt += `- Restrictions: Do NOT include personal contact information, email addresses, URLs, or social media handles\n`;
    prompt += `- Format: Return ONLY the bio text, no markdown, no code blocks, no explanations, no additional formatting\n\n`;
    
    prompt += `Now generate a unique, professional bio specifically for ${name}:\n`;
    
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
    prompt += `For EACH repository listed above, create a UNIQUE, concise, professional summary that:\n`;
    prompt += `1. Describes the SPECIFIC project's purpose and main functionality (use the repository description, language, and name to understand what it does)\n`;
    prompt += `2. Highlights the SPECIFIC technologies, frameworks, or tools used (mention the primary language and any frameworks if evident from the name/description)\n`;
    prompt += `3. Explains the business value or technical significance of THIS SPECIFIC project\n`;
    prompt += `4. For forked repositories, notes that it's a contribution to an existing project and what the contribution adds\n`;
    prompt += `5. Make each summary UNIQUE - do not use generic descriptions. Reference specific details from the repository data above\n\n`;
    
    // OUTPUT REQUIREMENTS: Format specifications
    prompt += `OUTPUT REQUIREMENTS:\n`;
    prompt += `- Return a valid JSON array with objects containing "repository_name" and "summary" fields\n`;
    prompt += `- Each summary: 2-3 sentences, maximum 200 words\n`;
    prompt += `- Tone: Professional, technical, and suitable for a work profile\n`;
    prompt += `- Content: Focus on what THIS SPECIFIC project does, why it matters, and key technologies used\n`;
    prompt += `- Uniqueness: Each summary must be different - reference the repository name, description, language, and other specific details\n`;
    prompt += `- Format: Valid JSON only, no markdown code blocks, no explanations, no additional text\n`;
    prompt += `- Example format: [{"repository_name": "project-name", "summary": "Unique professional description specific to this project..."}]\n\n`;
    
    prompt += `Now generate UNIQUE project summaries for each repository listed above:\n`;
    
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

