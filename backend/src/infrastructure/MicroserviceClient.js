// Infrastructure Layer - Microservice Client
// Generic client for calling other microservices via Coordinator unified proxy

const config = require('../config');
const MockDataService = require('./MockDataService');
const { postToCoordinator } = require('./CoordinatorClient');

class MicroserviceClient {
  constructor() {
    this.mockDataService = new MockDataService();
    
    // Map microservice names to target service names and actions
    this.microserviceMapping = {
      'skillsEngine': {
        targetService: 'skills-engine-service',
        action: 'get_employee_skills_for_directory_profile'
      },
      'courseBuilder': {
        targetService: 'course-builder',
        action: 'fetch_employee_courses_for_directory'
      },
      'learnerAI': {
        targetService: 'learner-ai',
        action: 'get_learning_path_for_employee_dashboard'
      },
      'learningAnalytics': {
        targetService: 'learning-analytics',
        action: 'fetch_learning_progress_for_employee_dashboard'
      },
      'contentStudio': {
        targetService: 'content-studio',
        action: 'get_content_data_for_directory'
      },
      'assessment': {
        targetService: 'assessment-service',
        action: 'get_assessment_data_for_directory'
      },
      'managementReporting': {
        targetService: 'management-reporting',
        action: 'get_management_data_for_directory'
      }
    };
  }

  /**
   * Call a microservice via Coordinator unified proxy
   * @param {string} microserviceName - Name of the microservice (e.g., 'skillsEngine', 'learnerAI')
   * @param {Object} payload - Data to send in the payload
   * @param {Object} responseTemplate - Template for the response structure (fields we want back)
   * @param {string} operation - Operation name for fallback mock data lookup
   * @returns {Promise<Object>} Filled response object
   */
  async callMicroservice(microserviceName, payload, responseTemplate, operation = null) {
    // Get mapping for this microservice
    const mapping = this.microserviceMapping[microserviceName];
    if (!mapping) {
      throw new Error(`Microservice ${microserviceName} not mapped to Coordinator target service`);
    }

    // Build envelope for Coordinator
    const envelope = {
      requester_service: config.coordinator.serviceName,
      payload: {
        action: mapping.action,
        target_service: mapping.targetService,
        // Include all original request parameters
        ...payload
      },
      response: responseTemplate || {}
    };

    try {
      // Make signed request to Coordinator unified proxy
      const { data: json } = await postToCoordinator(envelope);

      // Extract filled response from Coordinator's response
      // Coordinator returns: { success: true, data: { ... } }
      const filledResponse = json?.data?.response || json?.response || json?.data || json;
      
      console.log(`[MicroserviceClient] ✅ Successfully called ${mapping.targetService} via Coordinator`);
      return filledResponse;

    } catch (error) {
      console.warn(`[MicroserviceClient] ⚠️  Failed to call ${mapping.targetService} via Coordinator:`, error.message);
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
   * @param {Object} params
   * @param {string} params.userId - Employee UUID (sent as user_id)
   * @param {string} params.userName - Employee full name (sent as user_name)
   * @param {string} params.companyId - Company UUID
   * @param {string} params.companyName - Company name
   * @param {string} params.roleType - Employee role type (trainer | regular_employee)
   * @param {string|null} params.pathCareer - Target role (sent as path_career)
   * @param {string} params.preferredLanguage - Preferred language (e.g., 'en', 'ar')
   * @param {Object} params.rawData - Raw LinkedIn/GitHub/CV/form data
   * @returns {Promise<Object>} Skills data with competencies and relevance_score
   */
  async getEmployeeSkills({
    userId,
    userName,
    companyId,
    companyName,
    roleType,
    pathCareer,
    preferredLanguage,
    rawData
  }) {
    // Map roleType to Skills Engine expected values: "regular" or "trainer"
    // Skills Engine expects "regular" or "trainer", not "regular_employee"
    const employeeType = roleType === 'trainer' ? 'trainer' : 'regular';
    
    // Payload structure must match Skills Engine's expected format exactly:
    // {
    //   "user_id": "uuid",
    //   "user_name": "string",
    //   "company_id": "uuid",
    //   "company_name": "string",
    //   "employee_type": "regular" | "trainer",
    //   "path_career": "string" | null,
    //   "preferred_language": "string",
    //   "raw_data": { "github": {...}, "linkedin": {...} }
    // }
    // Note: Coordinator will add "action" and "target_service" to envelope,
    // but these should be stripped before forwarding to Skills Engine
    const payload = {
      user_id: userId,
      user_name: userName,
      company_id: companyId,
      company_name: companyName,
      employee_type: employeeType, // Mapped to "regular" or "trainer"
      path_career: pathCareer || null,
      preferred_language: preferredLanguage || 'en',
      raw_data: rawData || {} // Can contain any keys (linkedin, github, pdf, manual) - Skills Engine extracts from all
    };
    
    // Log payload structure for verification (without sensitive data)
    console.log('[MicroserviceClient] Skills Engine payload structure:', {
      user_id: payload.user_id,
      user_name: payload.user_name,
      company_id: payload.company_id,
      company_name: payload.company_name,
      employee_type: payload.employee_type,
      path_career: payload.path_career,
      preferred_language: payload.preferred_language,
      raw_data_sources: Object.keys(payload.raw_data || {}), // Only sources with actual data
      raw_data_keys: Object.keys(payload.raw_data || {}).reduce((acc, key) => {
        acc[key] = Object.keys(payload.raw_data[key] || {}).length;
        return acc;
      }, {})
    });

    const responseTemplate = {
      user_id: 0,
      competencies: [],
      relevance_score: 0
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
   * Get learning path from Learner AI via Coordinator
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

    // Use the unified callMicroservice method which routes through Coordinator
    return await this.callMicroservice('learnerAI', payload, responseTemplate, 'learning-path');
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

