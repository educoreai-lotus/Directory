// Application Layer - Enroll Employees Career Path Use Case
// Handles career-path-driven enrollment via Coordinator

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const { postToCoordinator } = require('../infrastructure/CoordinatorClient');

class EnrollEmployeesCareerPathUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.companyRepository = new CompanyRepository();
  }

  /**
   * Enroll employees via career-path-driven learning flow
   * @param {string} companyId - Company ID
   * @param {Array<string>} employeeIds - Array of employee UUIDs
   * @returns {Promise<Object>} Enrollment result
   */
  async execute(companyId, employeeIds) {
    console.log('[EnrollEmployeesCareerPathUseCase] ===== USE CASE EXECUTE START =====');
    console.log('[EnrollEmployeesCareerPathUseCase] Incoming companyId:', companyId);
    console.log('[EnrollEmployeesCareerPathUseCase] Incoming employeeIds:', JSON.stringify(employeeIds, null, 2));
    console.log('[EnrollEmployeesCareerPathUseCase] employeeIds type:', Array.isArray(employeeIds) ? 'array' : typeof employeeIds);
    console.log('[EnrollEmployeesCareerPathUseCase] employeeIds length:', employeeIds?.length || 0);
    
    try {

      // Validate employeeIds is non-empty array
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        throw new Error('employeeIds must be a non-empty array');
      }

      // Load company information
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new Error(`Company not found: ${companyId}`);
      }

      console.log('[EnrollEmployeesCareerPathUseCase] Company found:', company.company_name);

      // Load employees with required fields for Coordinator payload (5 fields per learner)
      console.log('[EnrollEmployeesCareerPathUseCase] Loading employees from database...');
      const employees = await this.loadEmployeesWithMetadata(companyId, employeeIds);
      
      console.log('[EnrollEmployeesCareerPathUseCase] Employees loaded from DB:', employees.length);
      console.log('[EnrollEmployeesCareerPathUseCase] Employee data (first 2):', JSON.stringify(employees.slice(0, 2), null, 2));
      
      if (employees.length === 0) {
        throw new Error('No valid employees found for enrollment');
      }

      if (employees.length !== employeeIds.length) {
        console.warn(`[EnrollEmployeesCareerPathUseCase] Only found ${employees.length} of ${employeeIds.length} requested employees`);
      }

      // Validate each employee has exactly 5 required fields
      console.log('[EnrollEmployeesCareerPathUseCase] Validating employee data structure...');
      employees.forEach((emp, idx) => {
        const requiredFields = ['learner_id', 'learner_name', 'company_id', 'learning_flow_tag', 'preferred_language'];
        const missingFields = requiredFields.filter(field => !(field in emp));
        if (missingFields.length > 0) {
          console.error(`[EnrollEmployeesCareerPathUseCase] Employee ${idx} missing fields:`, missingFields);
        } else {
          console.log(`[EnrollEmployeesCareerPathUseCase] Employee ${idx} has all 5 required fields:`, Object.keys(emp));
        }
      });

      // Build Coordinator payload with exactly 5 fields per learner
      console.log('[EnrollEmployeesCareerPathUseCase] Building Coordinator payload...');
      const payload = {
        action: 'enroll_employees_career_path',
        learning_flow: 'CAREER_PATH_DRIVEN',
        company_id: companyId,
        company_name: company.company_name,
        learners: employees // Already in the correct format from loadEmployeesWithMetadata
      };

      console.log('[EnrollEmployeesCareerPathUseCase] Coordinator payload structure:', {
        action: payload.action,
        learning_flow: payload.learning_flow,
        company_id: payload.company_id,
        company_name: payload.company_name,
        learners_count: payload.learners.length
      });
      console.log('[EnrollEmployeesCareerPathUseCase] First learner example (5 fields):', JSON.stringify(payload.learners[0], null, 2));
      console.log('[EnrollEmployeesCareerPathUseCase] Full payload:', JSON.stringify(payload, null, 2));

      // Build Coordinator envelope with REQUIRED response template
      // Coordinator's /api/fill-content-metrics/ endpoint REQUIRES:
      // 1. requester_service (required)
      // 2. payload (optional but we send it)
      // 3. response (REQUIRED - defines expected response structure)
      console.log('[EnrollEmployeesCareerPathUseCase] Building Coordinator envelope...');
      const coordinatorRequestBody = {
        requester_service: 'directory-service',
        payload,
        response: {
          success: false,
          message: '',
          enrollment_batch_id: '',
          failed_employee_ids: []
        }
      };

      console.log('[EnrollEmployeesCareerPathUseCase] Coordinator envelope structure:', {
        has_requester_service: !!coordinatorRequestBody.requester_service,
        requester_service: coordinatorRequestBody.requester_service,
        has_payload: !!coordinatorRequestBody.payload,
        payload_keys: Object.keys(coordinatorRequestBody.payload || {}),
        has_response: !!coordinatorRequestBody.response,
        response_keys: Object.keys(coordinatorRequestBody.response || {})
      });
      console.log('[EnrollEmployeesCareerPathUseCase] Full envelope:', JSON.stringify(coordinatorRequestBody, null, 2));

      // Call Coordinator unified proxy
      console.log('[EnrollEmployeesCareerPathUseCase] Calling Coordinator...');
      const { resp, data } = await postToCoordinator(coordinatorRequestBody);

      console.log('[EnrollEmployeesCareerPathUseCase] ===== COORDINATOR RESPONSE RECEIVED =====');
      console.log('[EnrollEmployeesCareerPathUseCase] Response status:', resp.status);
      console.log('[EnrollEmployeesCareerPathUseCase] Response statusText:', resp.statusText);
      console.log('[EnrollEmployeesCareerPathUseCase] Response ok:', resp.ok);
      console.log('[EnrollEmployeesCareerPathUseCase] Response headers:', JSON.stringify(Object.fromEntries(resp.headers.entries()), null, 2));
      console.log('[EnrollEmployeesCareerPathUseCase] Full response data:', JSON.stringify(data, null, 2));
      
      // Log response summary without personal data
      if (data) {
        console.log('[EnrollEmployeesCareerPathUseCase] Coordinator response summary:', {
          success: data.success || data.data?.success,
          message: data.message || data.data?.message,
          enrollment_batch_id: data.enrollment_batch_id || data.data?.enrollment_batch_id,
          failed_count: (data.failed_employee_ids || data.data?.failed_employee_ids || []).length,
          response_keys: Object.keys(data)
        });
      } else {
        console.warn('[EnrollEmployeesCareerPathUseCase] Coordinator returned empty data');
      }

      // Handle Coordinator response
      if (!resp.ok) {
        throw new Error(`Coordinator returned error: ${resp.status} - ${JSON.stringify(data)}`);
      }

      // Coordinator's unified proxy returns:
      // {
      //   "success": true,
      //   "data": { ... mapped response matching our template ... },
      //   "metadata": { ... routing info ... }
      // }
      // The "data" field contains the response mapped to our template structure
      const responseData = data?.data || data?.response || data;
      
      console.log('[EnrollEmployeesCareerPathUseCase] Extracted responseData:', JSON.stringify(responseData, null, 2));
      
      // Check if Coordinator returned success
      if (data.success === false || (responseData && responseData.success === false)) {
        throw new Error(responseData?.message || data?.message || 'Enrollment failed - Coordinator returned error');
      }

      // Return success result - map from Coordinator's response structure
      const result = {
        success: true,
        message: responseData?.message || data?.message || `Enrollment request sent for ${employees.length} learner(s)`,
        enrollment_batch_id: responseData?.enrollment_batch_id || null,
        failed_employee_ids: responseData?.failed_employee_ids || [],
        employees_enrolled: employees.length
      };
      
      console.log('[EnrollEmployeesCareerPathUseCase] Returning success result:', JSON.stringify(result, null, 2));
      console.log('[EnrollEmployeesCareerPathUseCase] ===== USE CASE EXECUTE SUCCESS =====');
      
      return result;

    } catch (error) {
      console.error('[EnrollEmployeesCareerPathUseCase] ===== USE CASE EXECUTE ERROR =====');
      console.error('[EnrollEmployeesCareerPathUseCase] Error name:', error.name);
      console.error('[EnrollEmployeesCareerPathUseCase] Error message:', error.message);
      console.error('[EnrollEmployeesCareerPathUseCase] Error stack:', error.stack);
      console.error('[EnrollEmployeesCareerPathUseCase] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      throw error;
    }
  }

  /**
   * Load employees with required fields for Coordinator payload
   * @param {string} companyId - Company ID
   * @param {Array<string>} employeeIds - Array of employee UUIDs
   * @returns {Promise<Array>} Array of employees with required fields
   */
  async loadEmployeesWithMetadata(companyId, employeeIds) {
    // Load only the 5 required fields per learner:
    // 1. learner_name (from full_name)
    // 2. learner_id (employee id)
    // 3. company_id (employee's company_id)
    // 4. learning_flow_tag (always "CAREER_PATH_DRIVEN")
    // 5. preferred_language
    const employeeQuery = `
      SELECT 
        e.id,
        e.full_name,
        e.company_id,
        e.preferred_language
      FROM employees e
      WHERE e.company_id = $1 
        AND e.id = ANY($2::uuid[])
        AND e.status = 'active'
    `;

    const employeeResult = await this.employeeRepository.pool.query(employeeQuery, [companyId, employeeIds]);
    
    if (employeeResult.rows.length === 0) {
      return [];
    }

    // Map to the required format
    return employeeResult.rows.map(employee => ({
      learner_id: employee.id,
      learner_name: employee.full_name,
      company_id: employee.company_id,
      learning_flow_tag: 'CAREER_PATH_DRIVEN',
      preferred_language: employee.preferred_language || null
    }));
  }
}

module.exports = EnrollEmployeesCareerPathUseCase;

