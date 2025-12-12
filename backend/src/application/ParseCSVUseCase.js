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
    console.log(`[ParseCSVUseCase] ========== EXECUTE START ==========`);
    console.log(`[ParseCSVUseCase] Company ID: ${companyId}`);
    console.log(`[ParseCSVUseCase] File buffer size: ${fileBuffer ? fileBuffer.length : 0} bytes`);
    
    try {
      // Step 1: Parse CSV
    const rawRows = await this.csvParser.parse(fileBuffer);
    console.log(`[ParseCSVUseCase] Parsed ${rawRows.length} rows from CSV`);

    if (rawRows.length === 0) {
      throw new Error('CSV file is empty or contains no data rows');
    }

    // Step 2: Separate company row (row 1) from employee rows (rows 2+)
    const companyRow = rawRows[0];
    const employeeRows = rawRows.slice(1);

    if (employeeRows.length === 0) {
      throw new Error('CSV file must contain at least one employee row (row 2+)');
    }

    // Step 3: Normalize company row (row 1)
    const companyRowNumber = companyRow._csvLineNumber || 2; // Row 2 in CSV (after header)
    const normalizedCompanyRow = this.csvParser.normalizeCompanyRow(companyRow, companyRowNumber);
    console.log(`[ParseCSVUseCase] Normalized company row from CSV row ${companyRowNumber}`);

    // Step 4: Normalize employee rows (rows 2+)
    const normalizedEmployeeRows = employeeRows.map((row) => {
      // Use the actual CSV line number if stored during parsing, otherwise fall back to index + 3
      const rowNumber = row._csvLineNumber || (employeeRows.indexOf(row) + 3);
      return this.csvParser.normalizeEmployeeRow(row, rowNumber);
    });
    console.log(`[ParseCSVUseCase] Normalized ${normalizedEmployeeRows.length} employee rows`);

    // Step 5: Validate CSV data (company row + employee rows)
    const allRows = [normalizedCompanyRow, ...normalizedEmployeeRows];
    const validationResult = this.csvValidator.validate(allRows, companyId, normalizedCompanyRow);
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

    // Step 6: Process valid rows and create database records
    // Separate company row from employee rows
    const validCompanyRow = validationResult.validRows.find(r => r.rowNumber === companyRowNumber);
    const validEmployeeRows = validationResult.validRows.filter(r => r.rowNumber !== companyRowNumber);
    
    if (!validCompanyRow) {
      throw new Error('Company row (row 1) validation failed. Please check company-level fields.');
    }

    const processingResult = await this.processValidRows(validCompanyRow, validEmployeeRows, companyId);

      console.log(`[ParseCSVUseCase] ✅ CSV processing completed successfully`);
      return {
        success: true,
        validation: validationResult,
        created: processingResult,
        message: `Successfully processed ${validEmployeeRows.length} employees, ${processingResult.departments} departments, and ${processingResult.teams} teams.`
      };
    } catch (error) {
      console.error(`[ParseCSVUseCase] ❌ ERROR in execute():`);
      console.error(`[ParseCSVUseCase] Error message:`, error.message);
      console.error(`[ParseCSVUseCase] Error code:`, error.code);
      console.error(`[ParseCSVUseCase] Error constraint:`, error.constraint);
      console.error(`[ParseCSVUseCase] Error detail:`, error.detail);
      console.error(`[ParseCSVUseCase] Error stack:`, error.stack);
      console.error(`[ParseCSVUseCase] Error name:`, error.name);
      
      // Re-throw to be handled by controller
      throw error;
    }
  }

  /**
   * Process valid CSV rows and create database records
   * @param {Object} companyRow - Validated company row (row 1)
   * @param {Array} employeeRows - Validated employee rows (rows 2+)
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Processing statistics
   */
  async processValidRows(companyRow, employeeRows, companyId) {
    // Verify company exists before processing
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new Error(`Company with ID ${companyId} does not exist. Please register the company first.`);
    }

    // Start transaction
    console.log(`[ParseCSVUseCase] Starting transaction for company ${companyId}`);
    const client = await this.companyRepository.beginTransaction();
    console.log(`[ParseCSVUseCase] ✅ Transaction started`);

    try {
      // Update company settings from company row (row 1) only
      console.log(`[ParseCSVUseCase] Step 1: Updating company settings...`);
      await this.updateCompanySettings(companyId, companyRow, client);
      console.log(`[ParseCSVUseCase] ✅ Step 1 complete: Company settings updated`);
      
      // Validate DECISION_MAKER requirement if approval_policy is "manual"
      const approvalPolicy = companyRow.approval_policy || 'manual';
      if (approvalPolicy === 'manual') {
        const hasDecisionMaker = employeeRows.some(row => {
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
      console.log(`[ParseCSVUseCase] Pre-validating ${employeeRows.length} employee emails for conflicts...`);
      const emailConflicts = [];
      for (const row of employeeRows) {
        try {
          const emailOwner = await this.employeeRepository.findEmailOwner(row.email);
          if (emailOwner && emailOwner.company_id !== companyId) {
            emailConflicts.push({
              email: row.email,
              row: row.rowNumber,
              existingCompany: emailOwner.company_id
            });
            console.log(`[ParseCSVUseCase] ⚠️ Email conflict detected: ${row.email} (row ${row.rowNumber}) already exists in company ${emailOwner.company_id}`);
          }
        } catch (error) {
          console.error(`[ParseCSVUseCase] Error checking email ${row.email}:`, error);
          throw error;
        }
      }

      if (emailConflicts.length > 0) {
        const conflictMessages = emailConflicts.map(c => 
          `Row ${c.row}: Email "${c.email}" is already registered to another company.`
        );
        throw new Error(`Email conflicts detected:\n${conflictMessages.join('\n')}`);
      }

      // Process employee rows in order
      for (const row of employeeRows) {
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
        // Ensure password is provided (required field from CSV)
        const employeePassword = validatedRow.password && validatedRow.password.trim().length > 0 
          ? validatedRow.password 
          : 'SecurePass123'; // Default password if not provided in CSV
        
        console.log(`[ParseCSVUseCase] Creating/updating employee: ${validatedRow.employee_id} (${validatedRow.email})`);
        
        let employee;
        try {
          employee = await this.employeeRepository.createOrUpdate({
            company_id: companyId,
            employee_id: validatedRow.employee_id,
            full_name: validatedRow.full_name,
            email: validatedRow.email,
            password: employeePassword, // Always provide a password (hashed in repository)
            current_role_in_company: validatedRow.current_role_in_company,
            target_role_in_company: validatedRow.target_role_in_company,
            preferred_language: validatedRow.preferred_language,
            status: validatedRow.status
          }, client);
          
          console.log(`[ParseCSVUseCase] ✅ Created/updated employee ${validatedRow.email} (ID: ${employee.id})`);
        } catch (employeeError) {
          console.error(`[ParseCSVUseCase] ❌ ERROR creating employee ${validatedRow.employee_id} (${validatedRow.email}):`);
          console.error('  - Error message:', employeeError.message);
          console.error('  - Error code:', employeeError.code);
          console.error('  - Error constraint:', employeeError.constraint);
          console.error('  - Error detail:', employeeError.detail);
          console.error('  - Error stack:', employeeError.stack);
          throw employeeError; // Re-throw to trigger transaction rollback
        }

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
      for (const row of employeeRows) {
        if (row.manager_id) {
          const employeeUuid = employeeIdToUuid.get(row.employee_id);
          const managerUuid = employeeIdToUuid.get(row.manager_id);

          if (employeeUuid && managerUuid) {
            // Determine relationship type based on manager's roles
            const managerRow = employeeRows.find(r => r.employee_id === row.manager_id);
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
      console.error('[ParseCSVUseCase] ❌ ERROR processing CSV - starting rollback');
      try {
        await this.companyRepository.rollbackTransaction(client);
        console.error('[ParseCSVUseCase] ✅ Transaction rolled back successfully');
      } catch (rollbackError) {
        console.error('[ParseCSVUseCase] ❌ ERROR during rollback:', rollbackError);
      }
      
      // Log comprehensive error details
      console.error('[ParseCSVUseCase] Error details:');
      console.error('  - Message:', error.message);
      console.error('  - Code:', error.code);
      console.error('  - Constraint:', error.constraint);
      console.error('  - Detail:', error.detail);
      console.error('  - Stack:', error.stack);
      
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

    // Always validate and set approval_policy (even if not in CSV, use default 'manual')
    // This ensures we never send an invalid value to the database
    console.log(`[ParseCSVUseCase] updateCompanySettings - Row approval_policy: "${row.approval_policy}", validatedSettings.approval_policy: "${validatedSettings.approval_policy}"`);
    
    const approvalPolicy = validatedSettings.approval_policy !== undefined 
      ? validatedSettings.approval_policy 
      : this.dbConstraintValidator.validateApprovalPolicy(row.approval_policy || row.learning_path_approval || 'manual');
    
    // CRITICAL: Ensure the value is exactly 'manual' or 'auto' with no whitespace
    // Trim and normalize to prevent any whitespace issues
    const cleanApprovalPolicy = String(approvalPolicy).trim().toLowerCase();
    
    console.log(`[ParseCSVUseCase] Approval policy - raw: "${approvalPolicy}", cleaned: "${cleanApprovalPolicy}" (type: ${typeof cleanApprovalPolicy}, length: ${cleanApprovalPolicy.length})`);
    
    // Ensure the value is exactly 'manual' or 'auto' (database constraint requirement)
    if (cleanApprovalPolicy !== 'manual' && cleanApprovalPolicy !== 'auto') {
      console.error(`[ParseCSVUseCase] ❌ Invalid approval_policy value: "${cleanApprovalPolicy}" (type: ${typeof cleanApprovalPolicy}, length: ${cleanApprovalPolicy.length})`);
      throw new Error(`Invalid approval_policy value: "${cleanApprovalPolicy}". Must be either "manual" or "auto".`);
    }
    
    console.log(`[ParseCSVUseCase] ✅ Setting approval_policy to: "${cleanApprovalPolicy}"`);
    updates.push(`approval_policy = $${paramIndex++}`);
    values.push(cleanApprovalPolicy); // Use the cleaned value

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
    
    console.log(`[ParseCSVUseCase] Executing UPDATE query with ${updates.length} fields`);
    console.log(`[ParseCSVUseCase] Query: ${query}`);
    console.log(`[ParseCSVUseCase] Values:`, values.map((v, i) => {
      const valueStr = String(v);
      const charCodes = Array.from(valueStr).map(c => c.charCodeAt(0)).join(',');
      return `$${i+1}="${valueStr}" (length: ${valueStr.length}, codes: [${charCodes}])`;
    }).join(', '));
    
    try {
      const result = await client.query(query, values);
      
      // Verify update succeeded
      if (result.rowCount === 0) {
        throw new Error(`Failed to update company settings. Company ${companyId} may not exist.`);
      }
      
      console.log(`[ParseCSVUseCase] ✅ Successfully updated company settings`);
    } catch (error) {
      console.error(`[ParseCSVUseCase] ❌ Database error updating company settings:`, error);
      console.error(`[ParseCSVUseCase] Error code: ${error.code}, constraint: ${error.constraint}`);
      
      // If it's a constraint violation for approval_policy, provide a clearer error
      if (error.code === '23514' && (error.constraint === 'companies_approval_policy_check' || error.constraint === 'companies_learning_path_approval_check')) {
        console.error(`[ParseCSVUseCase] Approval policy constraint violation - value sent: "${approvalPolicy}"`);
        console.error(`[ParseCSVUseCase] Error details:`, {
          code: error.code,
          constraint: error.constraint,
          message: error.message,
          detail: error.detail,
          hint: error.hint
        });
        // Check if the value has any hidden characters
        console.error(`[ParseCSVUseCase] Value length: ${approvalPolicy.length}, char codes:`, Array.from(approvalPolicy).map(c => c.charCodeAt(0)));
        throw new Error(`Approval policy must be either "manual" or "auto". Received value: "${approvalPolicy}". Please check your CSV file.`);
      }
      
      // Re-throw the original error
      throw error;
    }
    
    if (row.logo_url) {
      console.log(`[ParseCSVUseCase] Updated company logo URL: ${row.logo_url.substring(0, 50)}...`);
    }
    console.log(`[ParseCSVUseCase] Updated company settings: approval_policy=${validatedSettings.approval_policy || 'manual'}, kpis=${validatedSettings.kpis ? 'provided' : 'missing'}`);
  }

}

module.exports = ParseCSVUseCase;

