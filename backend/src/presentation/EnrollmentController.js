// Presentation Layer - Enrollment Controller
// Handles HTTP requests for employee enrollment to courses

const EnrollEmployeesCareerPathUseCase = require('../application/EnrollEmployeesCareerPathUseCase');

class EnrollmentController {
  constructor() {
    this.enrollCareerPathUseCase = new EnrollEmployeesCareerPathUseCase();
  }

  /**
   * Enroll employees via career-path-driven learning flow
   * POST /api/v1/companies/:companyId/enrollments/career-path
   * Requires authentication
   */
  async enrollCareerPath(req, res, next) {
    console.log('[EnrollmentController] ===== ENROLLMENT REQUEST RECEIVED =====');
    console.log('[EnrollmentController] Method:', req.method);
    console.log('[EnrollmentController] Path:', req.path);
    console.log('[EnrollmentController] Timestamp:', new Date().toISOString());
    
    try {
      const { companyId } = req.params;
      
      console.log('[EnrollmentController] Request params:', req.params);
      console.log('[EnrollmentController] req.body (raw):', JSON.stringify(req.body, null, 2));
      console.log('[EnrollmentController] req.parsedBody:', JSON.stringify(req.parsedBody, null, 2));
      
      // Handle envelope structure from parseRequest middleware
      // parseRequest sets req.parsedBody, but we check req.body first for compatibility
      const requestData = req.parsedBody || req.body.payload || req.body;
      const { employeeIds } = requestData;

      console.log('[EnrollmentController] Extracted requestData:', JSON.stringify(requestData, null, 2));
      console.log('[EnrollmentController] Extracted employeeIds:', employeeIds);
      console.log('[EnrollmentController] employeeIds type:', Array.isArray(employeeIds) ? 'array' : typeof employeeIds);
      console.log('[EnrollmentController] employeeIds length:', employeeIds?.length || 0);

      // Validate companyId matches authenticated user's company (if user is not admin)
      const userCompanyId = req.user?.companyId || req.user?.company_id;
      const isHR = req.user?.isHR || false;
      const isAdmin = req.user?.isAdmin || req.user?.role === 'DIRECTORY_ADMIN' || false;

      // Only HR or admins can enroll employees
      if (!isHR && !isAdmin) {
        return res.status(403).json({
          requester_service: 'directory_service',
          response: {
            success: false,
            message: 'Only HR managers or admins can enroll employees'
          }
        });
      }

      // HR can only enroll employees from their own company
      if (isHR && !isAdmin && userCompanyId !== companyId) {
        return res.status(403).json({
          requester_service: 'directory_service',
          response: {
            success: false,
            message: 'You can only enroll employees from your own company'
          }
        });
      }

      // Validate request body
      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            success: false,
            message: 'employeeIds must be a non-empty array'
          }
        });
      }

      // Execute enrollment
      console.log('[EnrollmentController] About to call use case with:', {
        companyId,
        employeeIdsCount: employeeIds.length,
        employeeIds: employeeIds
      });
      
      const result = await this.enrollCareerPathUseCase.execute(companyId, employeeIds);

      console.log('[EnrollmentController] Use case returned result:', JSON.stringify(result, null, 2));
      console.log('[EnrollmentController] Preparing success response...');

      // Return success response
      return res.status(200).json({
        requester_service: 'directory_service',
        response: {
          success: true,
          message: result.message,
          enrollment_batch_id: result.enrollment_batch_id,
          failed_employee_ids: result.failed_employee_ids,
          employees_enrolled: result.employees_enrolled
        }
      });

    } catch (error) {
      console.error('[EnrollmentController] ===== ENROLLMENT ERROR =====');
      console.error('[EnrollmentController] Error name:', error.name);
      console.error('[EnrollmentController] Error message:', error.message);
      console.error('[EnrollmentController] Error stack:', error.stack);
      console.error('[EnrollmentController] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Return error response
      return res.status(500).json({
        requester_service: 'directory_service',
        response: {
          success: false,
          message: 'Failed to enroll employees via AI learning flow',
          details: error.message || 'An unexpected error occurred'
        }
      });
    }
  }
}

module.exports = EnrollmentController;

