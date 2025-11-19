// Application Layer - Parse CSV Use Case
// Business logic for parsing and processing CSV uploads

const CSVParser = require('../infrastructure/CSVParser');
const CSVValidator = require('../infrastructure/CSVValidator');
const DatabaseConstraintValidator = require('../infrastructure/DatabaseConstraintValidator');
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
    // Verify company exists before processing
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new Error(`Company with ID ${companyId} does not exist. Please register the company first.`);
    }

    // Start transaction
    const client = await this.companyRepository.beginTransaction();

    try {
      // Update company settings from first row (with validation)
      // KPIs is mandatory, so we always update company settings
      const firstRow = validRows[0];
      await this.updateCompanySettings(companyId, firstRow, client);
      
      // Validate DECISION_MAKER requirement if approval_policy is "manual"
      const approvalPolicy = firstRow.approval_policy || 'manual';
      if (approvalPolicy === 'manual') {
        const hasDecisionMaker = validRows.some(row => {
          const roles = this.dbConstraintValidator.validateRoleType(row.role_type);
          return roles.includes('DECISION_MAKER');
        });
        
        if (!hasDecisionMaker) {
          throw new Error('When approval_policy is "manual", your CSV must include at least one employee with DECISION_MAKER role. The DECISION_MAKER role can be combined with other roles (e.g., "REGULAR_EMPLOYEE + DECISION_MAKER").');
        }
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

      // After CSV processing, ensure HR contact exists as an employee
      // This runs outside the transaction so it doesn't affect CSV processing if it fails
      await this.ensureHREmployeeExists(companyId);

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
   * Ensure HR contact from company registration exists as an employee
   * If HR email is not in employees table, create an HR employee record
   * @param {string} companyId - Company ID
   */
  async ensureHREmployeeExists(companyId) {
    try {
      // Get company info including HR contact
      const company = await this.companyRepository.findById(companyId);
      if (!company || !company.hr_contact_email) {
        console.log('[ParseCSVUseCase] No HR contact email found for company, skipping HR employee creation');
        return;
      }

      const hrEmail = company.hr_contact_email.toLowerCase().trim();
      const hrName = company.hr_contact_name || 'HR Contact';
      const hrRole = company.hr_contact_role || 'HR Manager';

      // Check if HR email already exists as an employee in this company
      const existingEmployee = await this.employeeRepository.findByEmail(hrEmail);
      if (existingEmployee && existingEmployee.company_id === companyId) {
        console.log(`[ParseCSVUseCase] HR contact ${hrEmail} already exists as employee, skipping creation`);
        return;
      }

      // HR doesn't exist - create HR employee record
      console.log(`[ParseCSVUseCase] Creating HR employee record for ${hrEmail}`);
      
      // Generate a unique employee_id for HR (HR001, HR002, etc.)
      const hrEmployeeIdResult = await this.employeeRepository.pool.query(
        `SELECT employee_id FROM employees 
         WHERE company_id = $1 AND employee_id LIKE 'HR%' 
         ORDER BY employee_id DESC LIMIT 1`,
        [companyId]
      );
      
      let hrEmployeeId = 'HR001';
      if (hrEmployeeIdResult.rows.length > 0) {
        const lastHRId = hrEmployeeIdResult.rows[0].employee_id;
        const number = parseInt(lastHRId.replace('HR', '')) || 0;
        hrEmployeeId = `HR${String(number + 1).padStart(3, '0')}`;
      }

      // Create HR employee (outside transaction - separate operation)
      const hrEmployee = await this.employeeRepository.createOrUpdate({
        company_id: companyId,
        employee_id: hrEmployeeId,
        full_name: hrName,
        email: hrEmail,
        password: 'SecurePass123', // Default password - HR should change this on first login
        current_role_in_company: hrRole,
        target_role_in_company: null,
        preferred_language: 'en',
        status: 'active'
      });

      console.log(`[ParseCSVUseCase] ✅ Created HR employee: ${hrEmployeeId} (${hrEmail})`);
    } catch (error) {
      // Log error but don't fail the CSV upload if HR creation fails
      console.error('[ParseCSVUseCase] Error ensuring HR employee exists:', error.message);
      console.error('[ParseCSVUseCase] HR employee creation failed, but CSV upload was successful');
    }
  }

  /**
   * Update company settings from CSV
   * @param {string} companyId - Company ID
   * @param {Object} row - CSV row with company data
   * @param {Object} client - Database client
   */
  async updateCompanySettings(companyId, row, client) {
    // Verify company exists before updating
    const companyCheck = await client.query('SELECT id FROM companies WHERE id = $1', [companyId]);
    if (companyCheck.rows.length === 0) {
      throw new Error(`Company with ID ${companyId} does not exist. Cannot update company settings.`);
    }

    // Validate company settings against database constraints
    // This will throw an error if KPIs is missing (mandatory field)
    const validatedSettings = this.dbConstraintValidator.validateCompanySettings(row);

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (validatedSettings.approval_policy !== undefined) {
      updates.push(`approval_policy = $${paramIndex++}`);
      values.push(validatedSettings.approval_policy);
    }

    // KPIs is mandatory, always update
    if (validatedSettings.kpis !== undefined) {
      updates.push(`kpis = $${paramIndex++}`);
      values.push(validatedSettings.kpis);
    }

    // Add logo_url if provided in CSV
    if (row.logo_url) {
      updates.push(`logo_url = $${paramIndex++}`);
      values.push(row.logo_url);
    }

    // Company settings for microservice integration - all mandatory
    if (validatedSettings.passing_grade !== undefined) {
      updates.push(`passing_grade = $${paramIndex++}`);
      values.push(validatedSettings.passing_grade);
    }

    if (validatedSettings.max_attempts !== undefined) {
      updates.push(`max_attempts = $${paramIndex++}`);
      values.push(validatedSettings.max_attempts);
    }

    if (validatedSettings.exercises_limited !== undefined) {
      updates.push(`exercises_limited = $${paramIndex++}`);
      values.push(validatedSettings.exercises_limited);
    }

    if (validatedSettings.num_of_exercises !== undefined) {
      updates.push(`num_of_exercises = $${paramIndex++}`);
      values.push(validatedSettings.num_of_exercises);
    }

    // Always update (at minimum KPIs is required)
    values.push(companyId);
    const query = `
      UPDATE companies
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
    `;
    const result = await client.query(query, values);
    
    // Verify update succeeded
    if (result.rowCount === 0) {
      throw new Error(`Failed to update company settings. Company ${companyId} may not exist.`);
    }
    
    if (row.logo_url) {
      console.log(`[ParseCSVUseCase] Updated company logo URL: ${row.logo_url.substring(0, 50)}...`);
    }
    console.log(`[ParseCSVUseCase] Updated company settings: approval_policy=${validatedSettings.approval_policy || 'manual'}, kpis=${validatedSettings.kpis ? 'provided' : 'missing'}`);
  }

}

module.exports = ParseCSVUseCase;

