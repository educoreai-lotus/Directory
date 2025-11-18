// Presentation Layer - Employee Controller
// Handles HTTP requests for employee CRUD operations

const AddEmployeeUseCase = require('../application/AddEmployeeUseCase');
const UpdateEmployeeUseCase = require('../application/UpdateEmployeeUseCase');
const DeleteEmployeeUseCase = require('../application/DeleteEmployeeUseCase');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const ErrorTranslator = require('../shared/ErrorTranslator');

class EmployeeController {
  constructor() {
    this.addEmployeeUseCase = new AddEmployeeUseCase();
    this.updateEmployeeUseCase = new UpdateEmployeeUseCase();
    this.deleteEmployeeUseCase = new DeleteEmployeeUseCase();
    this.employeeRepository = new EmployeeRepository();
  }

  /**
   * Add a new employee
   * POST /api/v1/companies/:id/employees
   */
  async addEmployee(req, res, next) {
    try {
      const { id: companyId } = req.params;
      const employeeData = req.body;

      console.log(`[EmployeeController] Adding employee for company ${companyId}`);

      const employee = await this.addEmployeeUseCase.execute(companyId, employeeData);

      res.status(201).json({
        employee,
        message: 'Employee added successfully'
      });
    } catch (error) {
      console.error('[EmployeeController] Error adding employee:', error);
      const userFriendlyMessage = ErrorTranslator.translateError(error);
      
      let statusCode = 500;
      if (error.message.includes('already registered') || 
          error.message.includes('already exists') ||
          error.message.includes('Email')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: userFriendlyMessage
      });
    }
  }

  /**
   * Update an employee
   * PUT /api/v1/companies/:id/employees/:employeeId
   */
  async updateEmployee(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      const employeeData = req.body;

      console.log(`[EmployeeController] Updating employee ${employeeId} for company ${companyId}`);

      const employee = await this.updateEmployeeUseCase.execute(companyId, employeeId, employeeData);

      res.status(200).json({
        employee,
        message: 'Employee updated successfully'
      });
    } catch (error) {
      console.error('[EmployeeController] Error updating employee:', error);
      const userFriendlyMessage = ErrorTranslator.translateError(error);
      
      let statusCode = 500;
      if (error.message === 'Employee not found') {
        statusCode = 404;
      } else if (error.message.includes('already registered') || error.message.includes('Email')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: userFriendlyMessage
      });
    }
  }

  /**
   * Delete an employee (soft delete - mark as inactive)
   * DELETE /api/v1/companies/:id/employees/:employeeId
   */
  async deleteEmployee(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;

      console.log(`[EmployeeController] Deleting employee ${employeeId} for company ${companyId}`);

      const employee = await this.deleteEmployeeUseCase.execute(companyId, employeeId);

      res.status(200).json({
        employee,
        message: 'Employee deleted successfully (marked as inactive)'
      });
    } catch (error) {
      console.error('[EmployeeController] Error deleting employee:', error);
      const userFriendlyMessage = ErrorTranslator.translateError(error);
      
      const statusCode = error.message === 'Employee not found' ? 404 : 500;

      res.status(statusCode).json({
        error: userFriendlyMessage
      });
    }
  }

  /**
   * Get a single employee
   * GET /api/v1/companies/:id/employees/:employeeId
   */
  async getEmployee(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;

      const employee = await this.employeeRepository.findById(employeeId);
      
      if (!employee || employee.company_id !== companyId) {
        return res.status(404).json({
          error: 'Employee not found'
        });
      }

      // Fetch project summaries if enrichment is completed
      let projectSummaries = [];
      if (employee.enrichment_completed) {
        try {
          projectSummaries = await this.employeeRepository.getProjectSummaries(employeeId);
        } catch (error) {
          console.warn('[EmployeeController] Could not fetch project summaries:', error.message);
        }
      }

      // Combine employee data with project summaries
      const employeeData = {
        ...employee,
        project_summaries: projectSummaries
      };

      res.status(200).json({
        employee: employeeData
      });
    } catch (error) {
      console.error('[EmployeeController] Error fetching employee:', error);
      res.status(500).json({
        error: 'An error occurred while fetching employee'
      });
    }
  }
}

module.exports = EmployeeController;

