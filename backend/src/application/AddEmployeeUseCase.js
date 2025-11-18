// Application Layer - Add Employee Use Case
// Business logic for adding a new employee

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const DepartmentRepository = require('../infrastructure/DepartmentRepository');
const TeamRepository = require('../infrastructure/TeamRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const DatabaseConstraintValidator = require('../infrastructure/DatabaseConstraintValidator');

class AddEmployeeUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.departmentRepository = new DepartmentRepository();
    this.teamRepository = new TeamRepository();
    this.companyRepository = new CompanyRepository();
    this.dbConstraintValidator = new DatabaseConstraintValidator();
  }

  /**
   * Add a new employee
   * @param {string} companyId - Company ID
   * @param {Object} employeeData - Employee data
   * @returns {Promise<Object>} Created employee
   */
  async execute(companyId, employeeData) {
    // Validate and normalize employee data
    const validatedData = this.dbConstraintValidator.validateEmployeeRow(employeeData);
    
    // Check if email already exists (globally)
    const existingEmailOwner = await this.employeeRepository.findEmailOwner(validatedData.email);
    if (existingEmailOwner && existingEmailOwner.company_id !== companyId) {
      throw new Error(`Email address "${validatedData.email}" is already registered to another company.`);
    }

    // Check if employee_id already exists for this company
    const existingEmployee = await this.employeeRepository.findByCompanyAndEmployeeId(
      companyId,
      validatedData.employee_id
    );
    if (existingEmployee) {
      throw new Error(`An employee with ID "${validatedData.employee_id}" already exists in your company.`);
    }

    // Get or create department
    const department = await this.departmentRepository.createOrGet(
      companyId,
      validatedData.department_id,
      validatedData.department_name
    );

    // Get or create team
    const team = await this.teamRepository.createOrGet(
      companyId,
      validatedData.team_id,
      validatedData.team_name,
      department.id
    );

    // Start transaction
    const client = await this.companyRepository.beginTransaction();
    
    try {
      // Create employee
      const employee = await this.employeeRepository.create({
        company_id: companyId,
        employee_id: validatedData.employee_id,
        full_name: validatedData.full_name,
        email: validatedData.email,
        password: validatedData.password,
        current_role_in_company: validatedData.current_role_in_company,
        target_role_in_company: validatedData.target_role_in_company,
        preferred_language: validatedData.preferred_language,
        status: validatedData.status
      }, client);

      // Add roles
      const roles = validatedData.validatedRoles || this.dbConstraintValidator.validateRoleType(validatedData.role_type);
      for (const role of roles) {
        await this.employeeRepository.createRole(employee.id, role, client);
      }

      // Assign to team
      await this.employeeRepository.assignToTeam(employee.id, team.id, client);

      // Add trainer settings if applicable
      if (roles.includes('TRAINER')) {
        await this.employeeRepository.createTrainerSettings(
          employee.id,
          validatedData.ai_enabled || false,
          validatedData.public_publish_enable || false,
          client
        );
      }

      // Add manager relationship if provided
      if (validatedData.manager_id) {
        const manager = await this.employeeRepository.findByCompanyAndEmployeeId(companyId, validatedData.manager_id);
        if (manager) {
          // Determine relationship type based on manager's roles
          const managerRoles = await this.getEmployeeRoles(manager.id);
          const relationshipType = managerRoles.includes('DEPARTMENT_MANAGER') 
            ? 'department_manager' 
            : 'team_manager';
          
          await this.employeeRepository.assignManager(
            employee.id,
            manager.id,
            relationshipType,
            client
          );
        }
      }

      await this.companyRepository.commitTransaction(client);
      return employee;
    } catch (error) {
      await this.companyRepository.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Get employee roles
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Array>} Array of role types
   */
  async getEmployeeRoles(employeeId) {
    const query = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
    const result = await this.employeeRepository.pool.query(query, [employeeId]);
    return result.rows.map(row => row.role_type);
  }
}

module.exports = AddEmployeeUseCase;

