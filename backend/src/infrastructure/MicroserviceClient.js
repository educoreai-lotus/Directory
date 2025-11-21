// Infrastructure Layer - Microservice Client
// Generic client for calling other microservices with envelope structure and fallback

const axios = require('axios');
const config = require('../config');
const MockDataService = require('./MockDataService');

class MicroserviceClient {
  constructor() {
    this.mockDataService = new MockDataService();
  }

  /**
   * Call a microservice using the universal envelope structure
   * @param {string} microserviceName - Name of the microservice (e.g., 'skillsEngine', 'learnerAI')
   * @param {Object} payload - Data to send in the payload
   * @param {Object} responseTemplate - Template for the response structure (fields we want back)
   * @param {string} operation - Operation name for fallback mock data lookup
   * @returns {Promise<Object>} Filled response object
   */
  async callMicroservice(microserviceName, payload, responseTemplate, operation = null) {
    const microservice = config.microservices[microserviceName];
    
    if (!microservice) {
      throw new Error(`Microservice ${microserviceName} not configured`);
    }

    // Build envelope
    const envelope = {
      requester_service: 'directory',
      payload: payload || {},
      response: responseTemplate || {}
    };

    // Stringify envelope
    const requestBody = JSON.stringify(envelope);

    try {
      // Make request
      const response = await axios.post(
        `${microservice.baseUrl}${microservice.endpoint}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      // Parse response (should be stringified)
      let responseData;
      if (typeof response.data === 'string') {
        responseData = JSON.parse(response.data);
      } else {
        responseData = response.data;
      }

      // Extract filled response
      const filledResponse = responseData?.response || responseData;
      
      console.log(`[MicroserviceClient] ✅ Successfully called ${microserviceName}`);
      return filledResponse;

    } catch (error) {
      console.warn(`[MicroserviceClient] ⚠️  Failed to call ${microserviceName}:`, error.message);
      console.warn(`[MicroserviceClient] Using fallback mock data for ${microserviceName}/${operation || 'default'}`);

      // Fallback to mock data
      if (operation) {
        // Convert camelCase to kebab-case (e.g., "skillsEngine" -> "skills-engine")
        const microserviceKey = microserviceName.replace(/([A-Z])/g, '-$1').toLowerCase();
        const mockData = this.mockDataService.getMockData(microserviceKey, operation);
        if (mockData) {
          console.log(`[MicroserviceClient] ✅ Using mock data for ${microserviceKey}/${operation}`);
          return mockData;
        }
        
        // Hardcoded fallback for skills-engine if file-based mock data not found
        if (microserviceKey === 'skills-engine' && operation === 'normalize-skills') {
          console.log(`[MicroserviceClient] Using hardcoded fallback mock data for skills-engine/normalize-skills`);
          return {
            user_id: 1024,
            competencies: [
              {
                name: "Data Analysis",
                nested_competencies: [
                  {
                    name: "Data Processing",
                    skills: [
                      { name: "Python", verified: false },
                      { name: "SQL", verified: false }
                    ]
                  },
                  {
                    name: "Data Visualization",
                    skills: [
                      { name: "Power BI", verified: false },
                      { name: "Tableau", verified: false }
                    ]
                  }
                ]
              }
            ],
            relevance_score: 75.5,
            gap: {
              missing_skills: ["Docker", "Kubernetes", "AWS"]
            }
          };
        }
      }

      // Return empty response template if no mock data available
      console.warn(`[MicroserviceClient] No mock data found, returning empty response template`);
      return responseTemplate || {};
    }
  }

  /**
   * Get employee skills from Skills Engine
   * @param {string} employeeId - Employee ID
   * @param {string} companyId - Company ID
   * @param {string} roleType - Employee role type
   * @param {Object} rawData - Raw LinkedIn/GitHub data
   * @returns {Promise<Object>} Skills data with competencies and relevance_score
   */
  async getEmployeeSkills(employeeId, companyId, roleType, rawData) {
    const payload = {
      employee_id: employeeId,
      company_id: companyId,
      employee_type: roleType,
      raw_data: rawData || {}
    };

    const responseTemplate = {
      user_id: 0,
      competencies: [],
      relevance_score: 0,
      gap: {
        missing_skills: []
      }
    };

    return await this.callMicroservice('skillsEngine', payload, responseTemplate, 'normalize-skills');
  }

  /**
   * Get employee courses from Course Builder
   * @param {string} employeeId - Employee ID
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Courses data
   */
  async getEmployeeCourses(employeeId, companyId) {
    const payload = {
      employee_id: employeeId,
      company_id: companyId
    };

    const responseTemplate = {
      assigned_courses: [],
      in_progress_courses: [],
      completed_courses: []
    };

    return await this.callMicroservice('courseBuilder', payload, responseTemplate, 'get-courses');
  }

  /**
   * Get learning path from Learner AI
   * @param {string} employeeId - Employee ID
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Learning path data
   */
  async getLearningPath(employeeId, companyId) {
    const payload = {
      employee_id: employeeId,
      company_id: companyId
    };

    const responseTemplate = {
      path_id: '',
      courses: [],
      progress: 0,
      recommendations: []
    };

    // Learner AI uses a different endpoint
    const microservice = config.microservices.learnerAI;
    const envelope = {
      requester_service: 'directory',
      payload: payload,
      response: responseTemplate
    };

    try {
      const response = await axios.post(
        `${microservice.baseUrl}${microservice.endpoint}`,
        JSON.stringify(envelope),
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      let responseData;
      if (typeof response.data === 'string') {
        responseData = JSON.parse(response.data);
      } else {
        responseData = response.data;
      }

      return responseData?.response || responseTemplate;
    } catch (error) {
      console.warn('[MicroserviceClient] Failed to get learning path, using fallback');
      const mockData = this.mockDataService.getMockData('learner-ai', 'learning-path');
      return mockData || responseTemplate;
    }
  }

  /**
   * Get learning dashboard data from Learning Analytics
   * @param {string} employeeId - Employee ID
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Dashboard data
   */
  async getLearningDashboard(employeeId, companyId) {
    const payload = {
      employee_id: employeeId,
      company_id: companyId
    };

    const responseTemplate = {
      progress_summary: {},
      recent_activity: [],
      upcoming_deadlines: [],
      achievements: []
    };

    return await this.callMicroservice('learningAnalytics', payload, responseTemplate, 'dashboard');
  }
}

module.exports = MicroserviceClient;

