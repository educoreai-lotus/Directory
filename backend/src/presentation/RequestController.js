// Presentation Layer - Request Controller
// Handles HTTP requests for employee requests

const SubmitEmployeeRequestUseCase = require('../application/SubmitEmployeeRequestUseCase');
const GetEmployeeRequestsUseCase = require('../application/GetEmployeeRequestsUseCase');
const EmployeeRequestRepository = require('../infrastructure/EmployeeRequestRepository');
const ErrorTranslator = require('../shared/ErrorTranslator');

class RequestController {
  constructor() {
    this.submitRequestUseCase = new SubmitEmployeeRequestUseCase();
    this.getRequestsUseCase = new GetEmployeeRequestsUseCase();
    this.requestRepository = new EmployeeRequestRepository();
  }

  /**
   * Submit an employee request
   * POST /api/v1/companies/:id/employees/:employeeId/requests
   */
  async submitRequest(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      
      // Handle envelope structure from frontend API interceptor
      const requestData = req.body.payload || req.body;
      const { request_type, title, description } = requestData;

      if (!request_type || !title) {
        return res.status(400).json({
          error: 'Request type and title are required'
        });
      }

      const result = await this.submitRequestUseCase.execute(employeeId, companyId, {
        request_type,
        title,
        description
      });

      res.status(201).json({
        success: true,
        request: result.request,
        message: 'Request submitted successfully'
      });
    } catch (error) {
      console.error('[RequestController] Error submitting request:', error);
      const userFriendlyMessage = ErrorTranslator.translateError(error);
      
      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('approved') || error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: userFriendlyMessage
      });
    }
  }

  /**
   * Get employee requests
   * GET /api/v1/companies/:id/employees/:employeeId/requests
   */
  async getEmployeeRequests(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;

      const result = await this.getRequestsUseCase.execute(employeeId, companyId);

      res.status(200).json({
        success: true,
        requests: result.requests
      });
    } catch (error) {
      console.error('[RequestController] Error fetching requests:', error);
      const userFriendlyMessage = ErrorTranslator.translateError(error);
      
      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('approved')) {
        statusCode = 403;
      }

      res.status(statusCode).json({
        error: userFriendlyMessage
      });
    }
  }

  /**
   * Get company requests (for HR/manager view)
   * GET /api/v1/companies/:id/requests
   */
  async getCompanyRequests(req, res, next) {
    try {
      const { id: companyId } = req.params;
      const { status } = req.query;

      console.log(`[RequestController] Fetching company requests for company ${companyId} with status: ${status || 'all'}`);

      const requests = await this.requestRepository.findByCompanyId(companyId, status || null);

      console.log(`[RequestController] ✅ Found ${requests.length} requests for company ${companyId}`);

      res.status(200).json({
        success: true,
        requests
      });
    } catch (error) {
      console.error('[RequestController] Error fetching company requests:', error);
      const userFriendlyMessage = ErrorTranslator.translateError(error);
      res.status(500).json({
        error: userFriendlyMessage || 'An error occurred while fetching requests'
      });
    }
  }

  /**
   * Update request status (approve/reject)
   * PUT /api/v1/companies/:id/requests/:requestId
   */
  async updateRequestStatus(req, res, next) {
    try {
      const { id: companyId, requestId } = req.params;
      const { status, rejection_reason, response_notes } = req.body;
      const reviewerId = req.user?.id; // From auth middleware

      if (!status) {
        return res.status(400).json({
          error: 'Status is required'
        });
      }

      const validStatuses = ['pending', 'approved', 'rejected', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Get request to verify it belongs to the company
      const request = await this.requestRepository.findById(requestId);
      if (!request) {
        return res.status(404).json({
          error: 'Request not found'
        });
      }

      if (String(request.company_id) !== String(companyId)) {
        return res.status(403).json({
          error: 'Request does not belong to this company'
        });
      }

      // Update status
      const updatedRequest = await this.requestRepository.updateStatus(
        requestId,
        status,
        reviewerId,
        rejection_reason || null,
        response_notes || null
      );

      res.status(200).json({
        success: true,
        request: updatedRequest,
        message: 'Request status updated successfully'
      });
    } catch (error) {
      console.error('[RequestController] Error updating request status:', error);
      res.status(500).json({
        error: 'An error occurred while updating request status'
      });
    }
  }
}

module.exports = RequestController;

