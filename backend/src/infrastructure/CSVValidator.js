// Infrastructure Layer - CSV Validator
// Validates CSV data and identifies errors

class CSVValidator {
  /**
   * Validate parsed CSV data
   * @param {Array} rows - Parsed CSV rows (first row is company, rest are employees)
   * @param {string} companyId - Company ID (from registration)
   * @param {Object} companyRow - Normalized company row (row 1)
   * @returns {Object} Validation result with errors and warnings
   */
  validate(rows, companyId, companyRow) {
    const errors = [];
    const warnings = [];
    const validRows = [];

    if (!rows || rows.length === 0) {
      errors.push({
        type: 'empty_file',
        message: 'CSV file is empty or contains no data rows',
        row: null,
        column: null
      });
      return { errors, warnings, validRows, isValid: false };
    }

    // Validate company row (row 1) - must be first row
    const companyRowData = rows[0];
    if (companyRowData) {
      const companyErrors = this.validateCompanyRow(companyRowData, companyRow);
      if (companyErrors.length > 0) {
        errors.push(...companyErrors);
      } else {
        validRows.push(companyRowData);
      }
    }

    // Validate employee rows (rows 2+)
    const employeeRows = rows.slice(1);
    if (employeeRows.length === 0) {
      errors.push({
        type: 'missing_employees',
        message: 'CSV file must contain at least one employee row (row 2+)',
        row: null,
        column: null
      });
    }

    // Track unique identifiers for duplicate detection
    const employeeIds = new Set();
    const departmentIds = new Set();
    const teamIds = new Set();
    const emails = new Set();

    employeeRows.forEach((row, index) => {
      const rowNumber = row.rowNumber || (index + 3); // +3 because CSV is 1-indexed, has header, and company row
      const rowErrors = [];
      const rowWarnings = [];

      // Validate that company fields are NOT present in employee rows
      const companyFields = ['company_name', 'industry', 'logo_url', 'approval_policy', 'kpis', 'passing_grade', 'max_attempts', 'exercises_limited', 'num_of_exercises', 'learning_path_approval'];
      companyFields.forEach(field => {
        if (row[field] && String(row[field]).trim().length > 0) {
          rowWarnings.push({
            type: 'company_field_in_employee_row',
            message: `${field} should not be in employee rows (rows 2+). Company fields belong only in row 1`,
            row: rowNumber,
            column: field
          });
        }
      });

      // Validate mandatory employee fields
      if (!row.employee_id) {
        rowErrors.push({
          type: 'missing_field',
          message: 'employee_id is required',
          row: rowNumber,
          column: 'employee_id'
        });
      } else if (employeeIds.has(row.employee_id)) {
        rowErrors.push({
          type: 'duplicate_employee_id',
          message: `Duplicate employee_id: ${row.employee_id}`,
          row: rowNumber,
          column: 'employee_id'
        });
      } else {
        employeeIds.add(row.employee_id);
      }

      if (!row.full_name) {
        rowErrors.push({
          type: 'missing_field',
          message: 'full_name is required',
          row: rowNumber,
          column: 'full_name'
        });
      }

      if (!row.email) {
        rowErrors.push({
          type: 'missing_field',
          message: 'email is required',
          row: rowNumber,
          column: 'email'
        });
      } else if (!this.isValidEmail(row.email)) {
        rowErrors.push({
          type: 'invalid_format',
          message: `Invalid email format: ${row.email}`,
          row: rowNumber,
          column: 'email'
        });
      } else if (emails.has(row.email.toLowerCase())) {
        rowErrors.push({
          type: 'duplicate_email',
          message: `Duplicate email: ${row.email}`,
          row: rowNumber,
          column: 'email'
        });
      } else {
        emails.add(row.email.toLowerCase());
      }

      if (!row.role_type) {
        rowErrors.push({
          type: 'missing_field',
          message: 'role_type is required',
          row: rowNumber,
          column: 'role_type'
        });
      } else if (!this.isValidRoleType(row.role_type)) {
        rowErrors.push({
          type: 'invalid_format',
          message: `Invalid role_type: ${row.role_type}. Must be one of: REGULAR_EMPLOYEE, TRAINER, TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER, or combinations`,
          row: rowNumber,
          column: 'role_type'
        });
      } else if (!this.hasBaseRole(row.role_type)) {
        rowErrors.push({
          type: 'missing_base_role',
          message: `role_type must include either REGULAR_EMPLOYEE or TRAINER as base role. Current value: ${row.role_type}`,
          row: rowNumber,
          column: 'role_type'
        });
      }

      // Mandatory employee fields
      // manager_id is required but can be empty string (for employees with no manager)
      if (row.manager_id === null || row.manager_id === undefined) {
        rowErrors.push({
          type: 'missing_field',
          message: 'manager_id is required (use empty string "" if no manager)',
          row: rowNumber,
          column: 'manager_id'
        });
      }

      if (!row.password) {
        rowErrors.push({
          type: 'missing_field',
          message: 'password is required',
          row: rowNumber,
          column: 'password'
        });
      }

      if (!row.preferred_language) {
        rowErrors.push({
          type: 'missing_field',
          message: 'preferred_language is required',
          row: rowNumber,
          column: 'preferred_language'
        });
      }

      if (!row.status) {
        rowErrors.push({
          type: 'missing_field',
          message: 'status is required',
          row: rowNumber,
          column: 'status'
        });
      }

      if (!row.current_role_in_company) {
        rowErrors.push({
          type: 'missing_field',
          message: 'current_role_in_company is required',
          row: rowNumber,
          column: 'current_role_in_company'
        });
      }

      if (!row.target_role_in_company) {
        rowErrors.push({
          type: 'missing_field',
          message: 'target_role_in_company is required',
          row: rowNumber,
          column: 'target_role_in_company'
        });
      }

      if (!row.department_id || !row.department_name) {
        rowErrors.push({
          type: 'missing_field',
          message: 'department_id and department_name are required',
          row: rowNumber,
          column: 'department_id/department_name'
        });
      }

      if (!row.team_id || !row.team_name) {
        rowErrors.push({
          type: 'missing_field',
          message: 'team_id and team_name are required',
          row: rowNumber,
          column: 'team_id/team_name'
        });
      }

      // Note: manager_id, password, preferred_language, status, current_role_in_company, target_role_in_company
      // are now validated as mandatory above

      // Track department and team IDs
      if (row.department_id) {
        departmentIds.add(row.department_id);
      }
      if (row.team_id) {
        teamIds.add(row.team_id);
      }

      // If row has no errors, add to valid rows
      if (rowErrors.length === 0) {
        validRows.push({
          ...row,
          rowNumber
        });
      } else {
        errors.push(...rowErrors);
      }

      if (rowWarnings.length > 0) {
        warnings.push(...rowWarnings);
      }
    });

    // Validate manager_id references (check if manager exists in valid rows)
    const validEmployeeIds = new Set(validRows.map(r => r.employee_id));
    validRows.forEach(row => {
      if (row.manager_id && !validEmployeeIds.has(row.manager_id)) {
        warnings.push({
          type: 'invalid_manager_reference',
          message: `manager_id ${row.manager_id} does not exist in CSV`,
          row: row.rowNumber,
          column: 'manager_id'
        });
      }
    });

    return {
      errors,
      warnings,
      validRows,
      isValid: errors.length === 0,
      summary: {
        totalRows: rows.length,
        validRows: validRows.length,
        errorRows: errors.length,
        warningRows: warnings.length,
        uniqueDepartments: departmentIds.size,
        uniqueTeams: teamIds.size,
        uniqueEmployees: validRows.filter(r => r.employee_id).length // Only count employee rows
      }
    };
  }

  /**
   * Validate company row (row 1)
   * @param {Object} row - Company row data
   * @param {Object} companyRow - Normalized company row
   * @returns {Array} Array of validation errors
   */
  validateCompanyRow(row, companyRow) {
    const errors = [];
    const rowNumber = row.rowNumber || 2; // Row 2 in CSV (after header)

    // Validate required company fields
    if (!companyRow.kpis) {
      errors.push({
        type: 'missing_field',
        message: 'kpis is required in row 1 (company-level field)',
        row: rowNumber,
        column: 'kpis'
      });
    }

    if (companyRow.passing_grade === null || companyRow.passing_grade === undefined) {
      errors.push({
        type: 'missing_field',
        message: 'passing_grade is required in row 1 (company-level field)',
        row: rowNumber,
        column: 'passing_grade'
      });
    }

    if (companyRow.max_attempts === null || companyRow.max_attempts === undefined) {
      errors.push({
        type: 'missing_field',
        message: 'max_attempts is required in row 1 (company-level field)',
        row: rowNumber,
        column: 'max_attempts'
      });
    }

    if (companyRow.exercises_limited === null || companyRow.exercises_limited === undefined) {
      errors.push({
        type: 'missing_field',
        message: 'exercises_limited is required in row 1 (company-level field)',
        row: rowNumber,
        column: 'exercises_limited'
      });
    }

    if (companyRow.exercises_limited === true && (companyRow.num_of_exercises === null || companyRow.num_of_exercises === undefined)) {
      errors.push({
        type: 'missing_field',
        message: 'num_of_exercises is required in row 1 when exercises_limited is true',
        row: rowNumber,
        column: 'num_of_exercises'
      });
    }

    // Validate that employee-specific fields are NOT present in company row
    // Note: normalizedCompanyRow doesn't have employee fields, so we check the raw row data
    // But since we're using normalizedCompanyRow, employee fields won't exist, so this check is safe
    // We only check if somehow employee fields got into the normalized company row (shouldn't happen)
    const employeeFields = ['employee_id', 'full_name', 'email', 'department_id', 'department_name', 'team_id', 'team_name'];
    employeeFields.forEach(field => {
      // Check both the raw row and normalized companyRow
      const hasEmployeeField = (row[field] && typeof row[field] === 'string' && row[field].trim().length > 0) ||
                               (companyRow[field] && typeof companyRow[field] === 'string' && companyRow[field].trim().length > 0);
      if (hasEmployeeField) {
        errors.push({
          type: 'invalid_field_in_company_row',
          message: `${field} should not be in row 1 (company row). Employee fields belong in rows 2+`,
          row: rowNumber,
          column: field
        });
      }
    });

    return errors;
  }

  /**
   * Check if role_type includes base role (REGULAR_EMPLOYEE or TRAINER)
   * @param {string} roleType - Role type to check
   * @returns {boolean} True if has base role
   */
  hasBaseRole(roleType) {
    if (!roleType) {
      return false;
    }
    const roles = roleType.split('+').map(r => r.trim().toUpperCase());
    return roles.includes('REGULAR_EMPLOYEE') || roles.includes('TRAINER');
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate role type
   * @param {string} roleType - Role type to validate
   * @returns {boolean} True if valid
   */
  isValidRoleType(roleType) {
    if (!roleType || typeof roleType !== 'string') {
      return false;
    }

    const validRoles = [
      'REGULAR_EMPLOYEE',
      'TRAINER',
      'TEAM_MANAGER',
      'DEPARTMENT_MANAGER',
      'DECISION_MAKER'
    ];

    // Check if it's a single role
    if (validRoles.includes(roleType.trim())) {
      return true;
    }

    // Check if it's a combination (e.g., "REGULAR_EMPLOYEE + TEAM_MANAGER")
    const roles = roleType.split('+').map(r => r.trim());
    return roles.every(role => validRoles.includes(role));
  }
}

module.exports = CSVValidator;

