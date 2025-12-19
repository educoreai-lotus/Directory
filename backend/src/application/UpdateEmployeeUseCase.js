// Application Layer - Update Employee Use Case
// Business logic for updating an existing employee

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const DepartmentRepository = require('../infrastructure/DepartmentRepository');
const TeamRepository = require('../infrastructure/TeamRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const DatabaseConstraintValidator = require('../infrastructure/DatabaseConstraintValidator');

class UpdateEmployeeUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.departmentRepository = new DepartmentRepository();
    this.teamRepository = new TeamRepository();
    this.companyRepository = new CompanyRepository();
    this.dbConstraintValidator = new DatabaseConstraintValidator();
  }

  /**
   * Update an existing employee
   * @param {string} companyId - Company ID
   * @param {string} employeeId - Employee UUID
   * @param {Object} employeeData - Updated employee data
   * @returns {Promise<Object>} Updated employee
   */
  async execute(companyId, employeeId, employeeData) {
    // First, try to find employee by UUID (for profile edits)
    let existingEmployee = await this.employeeRepository.findById(employeeId);
    
    // If not found by UUID, try to find by employee_id (for admin updates)
    if (!existingEmployee && employeeData.employee_id) {
      existingEmployee = await this.employeeRepository.findByCompanyAndEmployeeId(companyId, employeeData.employee_id);
    }
    
    if (!existingEmployee) {
      throw new Error('Employee not found');
    }

    // Verify employee belongs to company
    if (existingEmployee.company_id !== companyId) {
      throw new Error('Employee does not belong to this company');
    }

    // If this is a profile edit (only bio, value_proposition, preferred_language), use simpler update
    const isProfileEdit = employeeData.bio !== undefined || 
                         employeeData.value_proposition !== undefined || 
                         (employeeData.preferred_language !== undefined && 
                          !employeeData.full_name && 
                          !employeeData.email && 
                          !employeeData.employee_id);
    
    if (isProfileEdit) {
      // Simple profile update - no validation needed for bio/value_proposition
      const updateData = {};
      if (employeeData.preferred_language !== undefined) {
        updateData.preferred_language = employeeData.preferred_language;
      }
      if (employeeData.bio !== undefined) {
        updateData.bio = employeeData.bio;
      }
      if (employeeData.value_proposition !== undefined) {
        updateData.value_proposition = employeeData.value_proposition;
      }
      
      return await this.employeeRepository.updateById(employeeId, updateData);
    }

    // Full employee update - validate and normalize employee data
    const validatedData = this.dbConstraintValidator.validateEmployeeRow({
      ...employeeData,
      employee_id: existingEmployee.employee_id // Keep original employee_id
    });

    // Check email uniqueness if email is being changed
    if (validatedData.email && validatedData.email !== existingEmployee.email) {
      const emailOwner = await this.employeeRepository.findEmailOwner(validatedData.email);
      if (emailOwner && emailOwner.company_id !== companyId) {
        throw new Error(`Email address "${validatedData.email}" is already registered to another company.`);
      }
    }

    // Start transaction
    const client = await this.companyRepository.beginTransaction();

    try {
      // Update employee basic info
      const updatedEmployee = await this.employeeRepository.updateByEmployeeId(
        companyId,
        existingEmployee.employee_id,
        {
          full_name: validatedData.full_name,
          email: validatedData.email,
          password: validatedData.password,
          current_role_in_company: validatedData.current_role_in_company,
          target_role_in_company: validatedData.target_role_in_company,
          preferred_language: validatedData.preferred_language,
          bio: validatedData.bio,
          value_proposition: validatedData.value_proposition,
          status: validatedData.status
        },
        client
      );

      // Update roles if role_type changed
      if (validatedData.role_type) {
        const newRoles = validatedData.validatedRoles || this.dbConstraintValidator.validateRoleType(validatedData.role_type);
        const currentRoles = await this.getEmployeeRoles(existingEmployee.id);
        
        // Remove old roles not in new roles
        for (const oldRole of currentRoles) {
          if (!newRoles.includes(oldRole)) {
            await this.removeRole(existingEmployee.id, oldRole, client);
          }
        }
        
        // Add new roles not in current roles
        for (const newRole of newRoles) {
          if (!currentRoles.includes(newRole)) {
            await this.employeeRepository.createRole(existingEmployee.id, newRole, client);
          }
        }
      }

      // Update team if changed
      if (validatedData.team_id) {
        const team = await this.teamRepository.findByCompanyAndTeamId(companyId, validatedData.team_id);
        if (team) {
          // Remove old team associations
          await this.removeTeamAssociations(existingEmployee.id, client);
          // Add new team association
          await this.employeeRepository.assignToTeam(existingEmployee.id, team.id, client);
        }
      }

      // Update trainer settings if applicable
      const roles = validatedData.validatedRoles || this.dbConstraintValidator.validateRoleType(validatedData.role_type);
      if (roles.includes('TRAINER')) {
        await this.employeeRepository.createTrainerSettings(
          existingEmployee.id,
          validatedData.ai_enabled || false,
          validatedData.public_publish_enable || false,
          client
        );
      }

      await this.companyRepository.commitTransaction(client);
      return updatedEmployee;
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

  /**
   * Remove role from employee
   * @param {string} employeeId - Employee UUID
   * @param {string} roleType - Role type to remove
   * @param {Object} client - Database client
   */
  async removeRole(employeeId, roleType, client) {
    const query = 'DELETE FROM employee_roles WHERE employee_id = $1 AND role_type = $2';
    await client.query(query, [employeeId, roleType]);
  }

  /**
   * Remove all team associations for employee
   * @param {string} employeeId - Employee UUID
   * @param {Object} client - Database client
   */
  async removeTeamAssociations(employeeId, client) {
    const query = 'DELETE FROM employee_teams WHERE employee_id = $1';
    await client.query(query, [employeeId]);
  }
}

module.exports = UpdateEmployeeUseCase;

