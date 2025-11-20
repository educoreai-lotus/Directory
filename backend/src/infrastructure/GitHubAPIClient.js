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
   * Sanitize text to avoid unsupported Unicode escape sequences in JSON
   * Replaces any "\u" not followed by 4 hex digits with "\\u"
   * @param {string|null|undefined} text
   * @returns {string|null}
   */
  sanitizeTextForJson(text) {
    if (!text || typeof text !== 'string') {
      return text || null;
    }
    return text.replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u');
  }

  /**
   * Fetch commit history summary for a repository
   * @param {string} accessToken - GitHub access token
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} limit - Maximum number of commits to analyze (default: 10)
   * @returns {Promise<Object>} Commit history summary
   */
  async getCommitHistorySummary(accessToken, owner, repo, limit = 10) {
    try {
      const response = await axios.get(`${this.baseUrl}/repos/${owner}/${repo}/commits`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EDUCORE-Directory-Service'
        },
        params: {
          per_page: limit
        },
        timeout: 15000
      });

      const commits = response.data;
      if (!commits || commits.length === 0) {
        return {
          total_commits_analyzed: 0,
          commit_frequency: 'none',
          last_commit_date: null,
          commit_messages_sample: []
        };
      }

      // Analyze commit patterns
      const commitDates = commits.map(c => new Date(c.commit.author.date));
      const lastCommitDate = commitDates[0];
      const daysSinceLastCommit = Math.floor((Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let commitFrequency = 'active';
      if (daysSinceLastCommit > 90) commitFrequency = 'inactive';
      else if (daysSinceLastCommit > 30) commitFrequency = 'moderate';

      // Extract sample commit messages (first 5)
      const commitMessages = commits.slice(0, 5).map(c => ({
        message: this.sanitizeTextForJson(c.commit.message.split('\n')[0].substring(0, 100)), // First line, max 100 chars
        date: c.commit.author.date
      }));

      return {
        total_commits_analyzed: commits.length,
        commit_frequency: commitFrequency,
        last_commit_date: lastCommitDate.toISOString(),
        days_since_last_commit: daysSinceLastCommit,
        commit_messages_sample: commitMessages
      };
    } catch (error) {
      // Commits might not be accessible (private repo without permission)
      if (error.response?.status === 403 || error.response?.status === 404) {
        return {
          total_commits_analyzed: 0,
          commit_frequency: 'unknown',
          last_commit_date: null,
          error: 'commits_not_accessible'
        };
      }
      console.warn(`[GitHubAPIClient] Could not fetch commit history for ${owner}/${repo}:`, error.response?.data?.message || error.message);
      return {
        total_commits_analyzed: 0,
        commit_frequency: 'unknown',
        last_commit_date: null,
        error: 'fetch_failed'
      };
    }
  }

  /**
   * Fetch contribution statistics for a user
   * @param {string} accessToken - GitHub access token
   * @param {string} username - GitHub username
   * @returns {Promise<Object>} Contribution statistics
   */
  async getContributionStatistics(accessToken, username) {
    try {
      // Get user's public events (contributions)
      const response = await axios.get(`${this.baseUrl}/users/${username}/events/public`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EDUCORE-Directory-Service'
        },
        params: {
          per_page: 30 // Get last 30 events
        },
        timeout: 15000
      });

      const events = response.data || [];
      
      // Count event types
      const eventTypes = {};
      events.forEach(event => {
        eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      });

      // Calculate activity period
      const eventDates = events.map(e => new Date(e.created_at));
      const oldestEvent = eventDates.length > 0 ? new Date(Math.min(...eventDates.map(d => d.getTime()))) : null;
      const newestEvent = eventDates.length > 0 ? new Date(Math.max(...eventDates.map(d => d.getTime()))) : null;

      return {
        total_events: events.length,
        event_types: eventTypes,
        activity_period: oldestEvent && newestEvent ? {
          start: oldestEvent.toISOString(),
          end: newestEvent.toISOString()
        } : null,
        last_activity_date: newestEvent ? newestEvent.toISOString() : null
      };
    } catch (error) {
      console.warn(`[GitHubAPIClient] Could not fetch contribution statistics for ${username}:`, error.response?.data?.message || error.message);
      return {
        total_events: 0,
        event_types: {},
        activity_period: null,
        last_activity_date: null,
        error: 'fetch_failed'
      };
    }
  }

  /**
   * Fetch user repositories with enhanced data (README, commit history)
   * @param {string} accessToken - GitHub access token
   * @param {number} limit - Maximum number of repositories to fetch (default: 30)
   * @returns {Promise<Array>} Array of repository data with enhanced information
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

      // Fetch basic repo data first
      const repos = response.data.map(repo => ({
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
        default_branch: repo.default_branch,
        topics: repo.topics || [], // Repository topics
        languages_url: repo.languages_url // URL to fetch languages breakdown
      }));

      // Enhance with README and commit history for top repositories (limit to 10 to avoid rate limits)
      const reposToEnhance = repos.slice(0, 10);
      const enhancedRepos = await Promise.all(reposToEnhance.map(async (repo) => {
        const [owner, repoName] = repo.full_name.split('/');
        
        // Fetch commit history (skip README to avoid Unicode issues)
        const commitHistory = await this.getCommitHistorySummary(accessToken, owner, repoName, 10).catch(() => null);

        return {
          ...repo,
          commit_history: commitHistory || null
        };
      }));

      // Combine enhanced repos with remaining repos
      return [...enhancedRepos, ...repos.slice(10)];
    } catch (error) {
      console.error('[GitHubAPIClient] Error fetching repositories:', error.response?.data || error.message);
      throw new Error(`Failed to fetch GitHub repositories: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Fetch complete GitHub profile data (profile + email + repositories + contributions)
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

    // Fetch contribution statistics (non-blocking, don't fail if unavailable)
    let contributionStats = null;
    if (profile.login) {
      try {
        contributionStats = await this.getContributionStatistics(accessToken, profile.login);
      } catch (error) {
        console.warn('[GitHubAPIClient] Could not fetch contribution statistics, continuing without them:', error.message);
      }
    }

    return {
      ...profile,
      email: email || profile.email || null,
      repositories: repositories || [],
      contribution_statistics: contributionStats,
      fetched_at: new Date().toISOString()
    };
  }
}

module.exports = GitHubAPIClient;

