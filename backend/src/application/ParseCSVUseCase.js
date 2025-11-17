// Application Layer - Parse CSV Use Case
// Business logic for parsing and processing CSV uploads

const CSVParser = require('../infrastructure/CSVParser');
const CSVValidator = require('../infrastructure/CSVValidator');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const DepartmentRepository = require('../infrastructure/DepartmentRepository');
const TeamRepository = require('../infrastructure/TeamRepository');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');

class ParseCSVUseCase {
  constructor() {
    this.csvParser = new CSVParser();
    this.csvValidator = new CSVValidator();
    this.companyRepository = new CompanyRepository();
    this.departmentRepository = new DepartmentRepository();
    this.teamRepository = new TeamRepository();
    this.employeeRepository = new EmployeeRepository();
  }

  /**
   * Parse and process CSV file
   * @param {Buffer} fileBuffer - CSV file buffer
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Processing result with validation and created records
   */
  async execute(fileBuffer, companyId) {
    console.log(`[ParseCSVUseCase] Starting CSV processing for company ${companyId}`);

    // Step 1: Parse CSV
    const rawRows = await this.csvParser.parse(fileBuffer);
    console.log(`[ParseCSVUseCase] Parsed ${rawRows.length} rows from CSV`);

    // Step 2: Normalize rows
    const normalizedRows = rawRows.map((row, index) => 
      this.csvParser.normalizeRow(row, index + 2) // +2 for header and 1-indexing
    );

    // Step 3: Validate CSV data
    const validationResult = this.csvValidator.validate(normalizedRows, companyId);
    console.log(`[ParseCSVUseCase] Validation complete: ${validationResult.validRows.length} valid rows, ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings`);

    // Step 4: If there are critical errors, return validation result without processing
    if (!validationResult.isValid) {
      return {
        success: false,
        validation: validationResult,
        created: {
          departments: 0,
          teams: 0,
          employees: 0
        },
        message: 'CSV validation failed. Please correct errors before proceeding.'
      };
    }

    // Step 5: Process valid rows and create database records
    const processingResult = await this.processValidRows(validationResult.validRows, companyId);

    return {
      success: true,
      validation: validationResult,
      created: processingResult,
      message: `Successfully processed ${validationResult.validRows.length} employees, ${processingResult.departments} departments, and ${processingResult.teams} teams.`
    };
  }

  /**
   * Process valid CSV rows and create database records
   * @param {Array} validRows - Validated CSV rows
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Processing statistics
   */
  async processValidRows(validRows, companyId) {
    // Start transaction
    const client = await this.companyRepository.beginTransaction();

    try {
      // Update company settings from first row
      const firstRow = validRows[0];
      if (firstRow.learning_path_approval || firstRow.primary_kpis) {
        await this.updateCompanySettings(companyId, firstRow, client);
      }

      // Track created records
      const createdDepartments = new Map(); // department_id -> department UUID
      const createdTeams = new Map(); // team_id -> team UUID
      const createdEmployees = new Map(); // employee_id -> employee UUID
      const employeeIdToUuid = new Map(); // CSV employee_id -> employee UUID

      // Process rows in order
      for (const row of validRows) {
        // Create or get department
        const department = await this.departmentRepository.createOrGet(
          companyId,
          row.department_id,
          row.department_name,
          client
        );
        if (!createdDepartments.has(row.department_id)) {
          createdDepartments.set(row.department_id, department.id);
        }

        // Create or get team
        const team = await this.teamRepository.createOrGet(
          companyId,
          row.team_id,
          row.team_name,
          department.id,
          client
        );
        if (!createdTeams.has(row.team_id)) {
          createdTeams.set(row.team_id, team.id);
        }

        // Create employee
        const employee = await this.employeeRepository.create({
          company_id: companyId,
          employee_id: row.employee_id,
          full_name: row.full_name,
          email: row.email,
          password: row.password,
          current_role_in_company: row.current_role_in_company,
          target_role_in_company: row.target_role_in_company,
          preferred_language: row.preferred_language,
          status: row.status
        }, client);

        createdEmployees.set(row.employee_id, employee.id);
        employeeIdToUuid.set(row.employee_id, employee.id);

        // Parse and create roles
        const roles = this.parseRoles(row.role_type);
        for (const role of roles) {
          await this.employeeRepository.createRole(employee.id, role, client);
        }

        // Assign employee to team
        await this.employeeRepository.assignToTeam(employee.id, team.id, client);

        // Create trainer settings if applicable
        if (roles.includes('TRAINER')) {
          await this.employeeRepository.createTrainerSettings(
            employee.id,
            row.ai_enabled || false,
            row.public_publish_enable || false,
            client
          );
        }
      }

      // Process manager relationships (second pass, after all employees are created)
      for (const row of validRows) {
        if (row.manager_id) {
          const employeeUuid = employeeIdToUuid.get(row.employee_id);
          const managerUuid = employeeIdToUuid.get(row.manager_id);

          if (employeeUuid && managerUuid) {
            // Determine relationship type based on manager's roles
            const managerRow = validRows.find(r => r.employee_id === row.manager_id);
            if (managerRow) {
              const managerRoles = this.parseRoles(managerRow.role_type);
              if (managerRoles.includes('DEPARTMENT_MANAGER')) {
                await this.employeeRepository.assignManager(
                  employeeUuid,
                  managerUuid,
                  'department_manager',
                  client
                );
              } else if (managerRoles.includes('TEAM_MANAGER')) {
                await this.employeeRepository.assignManager(
                  employeeUuid,
                  managerUuid,
                  'team_manager',
                  client
                );
              }
            }
          }
        }
      }

      // Commit transaction
      await this.companyRepository.commitTransaction(client);

      return {
        departments: createdDepartments.size,
        teams: createdTeams.size,
        employees: createdEmployees.size
      };
    } catch (error) {
      // Rollback transaction on error
      await this.companyRepository.rollbackTransaction(client);
      console.error('[ParseCSVUseCase] Error processing CSV:', error);
      throw new Error(`Failed to process CSV: ${error.message}`);
    }
  }

  /**
   * Update company settings from CSV
   * @param {string} companyId - Company ID
   * @param {Object} row - CSV row with company data
   * @param {Object} client - Database client
   */
  async updateCompanySettings(companyId, row, client) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (row.learning_path_approval) {
      updates.push(`learning_path_approval = $${paramIndex++}`);
      values.push(row.learning_path_approval);
    }

    if (row.primary_kpis) {
      updates.push(`primary_kpis = $${paramIndex++}`);
      values.push(row.primary_kpis);
    }

    if (updates.length > 0) {
      values.push(companyId);
      const query = `
        UPDATE companies
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
      `;
      await client.query(query, values);
    }
  }

  /**
   * Parse role type string into array of roles
   * @param {string} roleType - Role type string (e.g., "REGULAR_EMPLOYEE + TEAM_MANAGER")
   * @returns {Array<string>} Array of role types
   */
  parseRoles(roleType) {
    if (!roleType) {
      return ['REGULAR_EMPLOYEE']; // Default role
    }

    const roles = roleType
      .split('+')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    // If no valid roles found, default to REGULAR_EMPLOYEE
    return roles.length > 0 ? roles : ['REGULAR_EMPLOYEE'];
  }
}

module.exports = ParseCSVUseCase;

