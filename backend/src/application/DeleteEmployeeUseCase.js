// Application Layer - Delete Employee Use Case
// Business logic for soft deleting an employee (mark as inactive)

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');

class DeleteEmployeeUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.companyRepository = new CompanyRepository();
  }

  /**
   * Soft delete an employee (mark as inactive)
   * @param {string} companyId - Company ID
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object>} Updated employee
   */
  async execute(companyId, employeeId) {
    // Verify employee exists and belongs to company
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee || employee.company_id !== companyId) {
      throw new Error('Employee not found');
    }

    // Soft delete: mark as inactive
    const updatedEmployee = await this.employeeRepository.updateByEmployeeId(
      companyId,
      employee.employee_id,
      { status: 'inactive' }
    );

    return updatedEmployee;
  }
}

module.exports = DeleteEmployeeUseCase;

