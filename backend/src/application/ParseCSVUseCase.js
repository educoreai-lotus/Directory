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
    this.dbConstraintValidator = new DatabaseConstraintValidator();
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

    // Step 2: Normalize rows (use actual CSV line number if available)
    const normalizedRows = rawRows.map((row) => {
      // Use the actual CSV line number if stored during parsing, otherwise fall back to index + 2
      const rowNumber = row._csvLineNumber || (rawRows.indexOf(row) + 2);
      return this.csvParser.normalizeRow(row, rowNumber);
    });

    // Step 3: Validate CSV data
    const validationResult = this.csvValidator.validate(normalizedRows, companyId);
    console.log(`[ParseCSVUseCase] Validation complete: ${validationResult.validRows.length} valid rows, ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings`);
    
    // Log first few errors for debugging
    if (validationResult.errors.length > 0) {
      console.log(`[ParseCSVUseCase] First 5 errors:`, validationResult.errors.slice(0, 5));
    }

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
      // Update company settings from first row (with validation)
      const firstRow = validRows[0];
      if (firstRow.learning_path_approval || firstRow.primary_kpis) {
        await this.updateCompanySettings(companyId, firstRow, client);
      }

      // Track created records
      const createdDepartments = new Map(); // department_id -> department UUID
      const createdTeams = new Map(); // team_id -> team UUID
      const createdEmployees = new Map(); // employee_id -> employee UUID
      const employeeIdToUuid = new Map(); // CSV employee_id -> employee UUID

      // Pre-validate all emails against database to catch conflicts early
      const emailConflicts = [];
      for (const row of validRows) {
        const emailOwner = await this.employeeRepository.findEmailOwner(row.email);
        if (emailOwner && emailOwner.company_id !== companyId) {
          emailConflicts.push({
            email: row.email,
            row: row.rowNumber,
            existingCompany: emailOwner.company_id
          });
        }
      }

      if (emailConflicts.length > 0) {
        const conflictMessages = emailConflicts.map(c => 
          `Row ${c.row}: Email "${c.email}" is already registered to another company.`
        );
        throw new Error(`Email conflicts detected:\n${conflictMessages.join('\n')}`);
      }

      // Process rows in order
      for (const row of validRows) {
        // Validate and normalize row data against database constraints
        const validatedRow = this.dbConstraintValidator.validateEmployeeRow(row);

        // Create or get department
        const department = await this.departmentRepository.createOrGet(
          companyId,
          validatedRow.department_id,
          validatedRow.department_name,
          client
        );
        if (!createdDepartments.has(validatedRow.department_id)) {
          createdDepartments.set(validatedRow.department_id, department.id);
        }

        // Create or get team
        const team = await this.teamRepository.createOrGet(
          companyId,
          validatedRow.team_id,
          validatedRow.team_name,
          department.id,
          client
        );
        if (!createdTeams.has(validatedRow.team_id)) {
          createdTeams.set(validatedRow.team_id, team.id);
        }

        // Create or update employee (handles email uniqueness)
        const employee = await this.employeeRepository.createOrUpdate({
          company_id: companyId,
          employee_id: validatedRow.employee_id,
          full_name: validatedRow.full_name,
          email: validatedRow.email,
          password: validatedRow.password,
          current_role_in_company: validatedRow.current_role_in_company,
          target_role_in_company: validatedRow.target_role_in_company,
          preferred_language: validatedRow.preferred_language,
          status: validatedRow.status
        }, client);

        createdEmployees.set(validatedRow.employee_id, employee.id);
        employeeIdToUuid.set(validatedRow.employee_id, employee.id);

        // Parse and create roles (using validated roles from validator)
        const roles = validatedRow.validatedRoles || this.dbConstraintValidator.validateRoleType(validatedRow.role_type);
        for (const role of roles) {
          await this.employeeRepository.createRole(employee.id, role, client);
        }

        // Assign employee to team
        await this.employeeRepository.assignToTeam(employee.id, team.id, client);

        // Create trainer settings if applicable
        if (roles.includes('TRAINER')) {
          await this.employeeRepository.createTrainerSettings(
            employee.id,
            validatedRow.ai_enabled || false,
            validatedRow.public_publish_enable || false,
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
              const managerRoles = this.dbConstraintValidator.validateRoleType(managerRow.role_type);
              const relationshipType = managerRoles.includes('DEPARTMENT_MANAGER') 
                ? 'department_manager' 
                : 'team_manager';
              
              await this.employeeRepository.assignManager(
                employeeUuid,
                managerUuid,
                relationshipType,
                client
              );
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
      // Re-throw with original message (will be translated by controller)
      throw error;
    }
  }

  /**
   * Update company settings from CSV
   * @param {string} companyId - Company ID
   * @param {Object} row - CSV row with company data
   * @param {Object} client - Database client
   */
  async updateCompanySettings(companyId, row, client) {
    // Validate company settings against database constraints
    const validatedSettings = this.dbConstraintValidator.validateCompanySettings(row);

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (validatedSettings.learning_path_approval !== undefined) {
      updates.push(`learning_path_approval = $${paramIndex++}`);
      values.push(validatedSettings.learning_path_approval);
    }

    if (validatedSettings.primary_kpis !== undefined) {
      updates.push(`primary_kpis = $${paramIndex++}`);
      values.push(validatedSettings.primary_kpis);
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

}

module.exports = ParseCSVUseCase;

