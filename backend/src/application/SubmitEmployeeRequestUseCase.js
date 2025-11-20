// Application Layer - Submit Employee Request Use Case
// Handles employee request submission

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const EmployeeRequestRepository = require('../infrastructure/EmployeeRequestRepository');

class SubmitEmployeeRequestUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.requestRepository = new EmployeeRequestRepository();
  }

  /**
   * Submit an employee request
   * @param {string} employeeId - Employee UUID
   * @param {string} companyId - Company UUID
   * @param {Object} requestData - Request data (request_type, title, description)
   * @returns {Promise<Object>} Created request
   */
  async execute(employeeId, companyId, requestData) {
    try {
      // Get employee data
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Check if employee belongs to the company
      if (String(employee.company_id) !== String(companyId)) {
        throw new Error('Employee does not belong to this company');
      }

      // Check if profile is approved (only approved employees can submit requests)
      if (employee.profile_status !== 'approved') {
        throw new Error('Employee profile must be approved to submit requests');
      }

      // Validate request data
      const { request_type, title, description } = requestData;

      if (!request_type) {
        throw new Error('Request type is required');
      }

      const validTypes = ['learn-new-skills', 'apply-trainer', 'self-learning', 'other'];
      if (!validTypes.includes(request_type)) {
        throw new Error(`Invalid request type. Must be one of: ${validTypes.join(', ')}`);
      }

      if (!title || title.trim().length === 0) {
        throw new Error('Request title is required');
      }

      // Create request
      const request = await this.requestRepository.create({
        employee_id: employeeId,
        company_id: companyId,
        request_type,
        title: title.trim(),
        description: description ? description.trim() : null
      });

      console.log('[SubmitEmployeeRequestUseCase] ✅ Request created:', {
        id: request.id,
        employee_id: request.employee_id,
        company_id: request.company_id,
        request_type: request.request_type,
        status: request.status,
        title: request.title
      });
      
      // Verify the request was created correctly
      const verifyRequest = await this.requestRepository.findById(request.id);
      if (!verifyRequest) {
        throw new Error('Request was created but could not be retrieved');
      }
      console.log('[SubmitEmployeeRequestUseCase] ✅ Request verified in database:', {
        id: verifyRequest.id,
        company_id: verifyRequest.company_id,
        status: verifyRequest.status
      });

      return {
        success: true,
        request
      };
    } catch (error) {
      console.error('[SubmitEmployeeRequestUseCase] Error:', error);
      throw error;
    }
  }
}

module.exports = SubmitEmployeeRequestUseCase;

