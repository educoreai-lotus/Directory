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
    try {
      console.log('[EnrollEmployeesCareerPathUseCase] Starting enrollment for company:', companyId);
      console.log('[EnrollEmployeesCareerPathUseCase] Employee IDs:', employeeIds);

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
      const employees = await this.loadEmployeesWithMetadata(companyId, employeeIds);
      
      if (employees.length === 0) {
        throw new Error('No valid employees found for enrollment');
      }

      if (employees.length !== employeeIds.length) {
        console.warn(`[EnrollEmployeesCareerPathUseCase] Only found ${employees.length} of ${employeeIds.length} requested employees`);
      }

      console.log(`[EnrollEmployeesCareerPathUseCase] Loaded ${employees.length} learners for enrollment`);

      // Build Coordinator payload with exactly 5 fields per learner
      const payload = {
        action: 'enroll_employees_career_path',
        learning_flow: 'CAREER_PATH_DRIVEN',
        company_id: companyId,
        company_name: company.company_name,
        learners: employees // Already in the correct format from loadEmployeesWithMetadata
      };

      console.log('[EnrollEmployeesCareerPathUseCase] Coordinator payload prepared:', {
        action: payload.action,
        learning_flow: payload.learning_flow,
        learning_flow_tag: 'CAREER_PATH_DRIVEN',
        company_id: payload.company_id,
        learners_count: payload.learners.length
      });

      // Build Coordinator envelope (no response template needed)
      const coordinatorRequestBody = {
        requester_service: 'directory-service',
        payload
      };

      // Call Coordinator unified proxy
      console.log('[EnrollEmployeesCareerPathUseCase] Calling Coordinator...');
      const { resp, data } = await postToCoordinator(coordinatorRequestBody);

      console.log('[EnrollEmployeesCareerPathUseCase] Coordinator response status:', resp.status);
      console.log('[EnrollEmployeesCareerPathUseCase] Coordinator response success:', resp.ok);
      
      // Log response summary without personal data
      if (data) {
        console.log('[EnrollEmployeesCareerPathUseCase] Coordinator response summary:', {
          success: data.success || data.data?.success,
          message: data.message || data.data?.message,
          enrollment_batch_id: data.enrollment_batch_id || data.data?.enrollment_batch_id,
          failed_count: (data.failed_employee_ids || data.data?.failed_employee_ids || []).length
        });
      }

      // Handle Coordinator response
      if (!resp.ok) {
        throw new Error(`Coordinator returned error: ${resp.status} - ${JSON.stringify(data)}`);
      }

      // Extract response data (Coordinator may wrap it)
      const responseData = data?.data || data?.response || data;
      
      if (!responseData || responseData.success === false) {
        throw new Error(responseData?.message || 'Enrollment failed - Coordinator returned error');
      }

      // Return success result
      return {
        success: true,
        message: responseData.message || `Enrollment request sent for ${employees.length} learner(s)`,
        enrollment_batch_id: responseData.enrollment_batch_id || null,
        failed_employee_ids: responseData.failed_employee_ids || [],
        employees_enrolled: employees.length
      };

    } catch (error) {
      console.error('[EnrollEmployeesCareerPathUseCase] Error:', error);
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

