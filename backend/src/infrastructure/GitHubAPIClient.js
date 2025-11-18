// Infrastructure Layer - GitHub API Client
// Fetches profile and repository data from GitHub API

const axios = require('axios');

class GitHubAPIClient {
  constructor() {
    // GitHub API v3 endpoints
    this.baseUrl = 'https://api.github.com';
    
    // User profile endpoint
    this.userUrl = `${this.baseUrl}/user`;
    
    // User email endpoint
    this.userEmailsUrl = `${this.baseUrl}/user/emails`;
    
    // User repositories endpoint
    this.userReposUrl = `${this.baseUrl}/user/repos`;
  }

  /**
   * Fetch user profile information
   * @param {string} accessToken - GitHub access token
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(this.userUrl, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EDUCORE-Directory-Service'
        },
        timeout: 10000
      });

      return {
        id: response.data.id,
        login: response.data.login,
        name: response.data.name,
        email: response.data.email,
        bio: response.data.bio,
        avatar_url: response.data.avatar_url,
        company: response.data.company,
        blog: response.data.blog,
        location: response.data.location,
        public_repos: response.data.public_repos,
        followers: response.data.followers,
        following: response.data.following,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at
      };
    } catch (error) {
      console.error('[GitHubAPIClient] Error fetching user profile:', error.response?.data || error.message);
      throw new Error(`Failed to fetch GitHub profile: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Fetch user email addresses
   * @param {string} accessToken - GitHub access token
   * @returns {Promise<Array>} Array of email addresses
   */
  async getUserEmails(accessToken) {
    try {
      const response = await axios.get(this.userEmailsUrl, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EDUCORE-Directory-Service'
        },
        timeout: 10000
      });

      // Return primary email or first verified email
      const primaryEmail = response.data.find(email => email.primary);
      if (primaryEmail) {
        return primaryEmail.email;
      }

      const verifiedEmail = response.data.find(email => email.verified);
      if (verifiedEmail) {
        return verifiedEmail.email;
      }

      return response.data[0]?.email || null;
    } catch (error) {
      console.warn('[GitHubAPIClient] Could not fetch emails:', error.response?.data || error.message);
      return null; // Email is optional, don't fail if we can't get it
    }
  }

  /**
   * Fetch user repositories
   * @param {string} accessToken - GitHub access token
   * @param {number} limit - Maximum number of repositories to fetch (default: 30)
   * @returns {Promise<Array>} Array of repository data
   */
  async getUserRepositories(accessToken, limit = 30) {
    try {
      const response = await axios.get(this.userReposUrl, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EDUCORE-Directory-Service'
        },
        params: {
          sort: 'updated',
          direction: 'desc',
          per_page: limit,
          type: 'all' // Include both public and private repos (if user has access)
        },
        timeout: 15000
      });

      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        clone_url: repo.clone_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        is_private: repo.private,
        is_fork: repo.fork,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        default_branch: repo.default_branch
      }));
    } catch (error) {
      console.error('[GitHubAPIClient] Error fetching repositories:', error.response?.data || error.message);
      throw new Error(`Failed to fetch GitHub repositories: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Fetch complete GitHub profile data (profile + email + repositories)
   * @param {string} accessToken - GitHub access token
   * @returns {Promise<Object>} Complete profile data
   */
  async getCompleteProfile(accessToken) {
    const [profile, email, repositories] = await Promise.all([
      this.getUserProfile(accessToken),
      this.getUserEmails(accessToken),
      this.getUserRepositories(accessToken).catch(error => {
        // Don't fail if repositories can't be fetched
        console.warn('[GitHubAPIClient] Could not fetch repositories, continuing without them:', error.message);
        return [];
      })
    ]);

    return {
      ...profile,
      email: email || profile.email || null,
      repositories: repositories || [],
      fetched_at: new Date().toISOString()
    };
  }
}

module.exports = GitHubAPIClient;

