// Shared Layer - Error Translator
// Translates technical database errors into human-friendly messages

class ErrorTranslator {
  /**
   * Translate PostgreSQL error to human-friendly message
   * @param {Error} error - Database error
   * @returns {string} Human-friendly error message
   */
  static translateDatabaseError(error) {
    // PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
    if (!error || !error.code) {
      return 'An unexpected error occurred. Please try again.';
    }

    switch (error.code) {
      case '23505': // Unique violation
        if (error.constraint === 'employees_email_key') {
          return 'This email address is already registered. Each employee must have a unique email address.';
        }
        if (error.constraint && error.constraint.includes('employee_id')) {
          return 'An employee with this ID already exists in your company.';
        }
        if (error.constraint && error.constraint.includes('department_id')) {
          return 'A department with this ID already exists in your company.';
        }
        if (error.constraint && error.constraint.includes('team_id')) {
          return 'A team with this ID already exists in your company.';
        }
        return 'This record already exists. Please check for duplicates.';

      case '23503': // Foreign key violation
        return 'A referenced record does not exist. Please check your data relationships.';

      case '23514': // Check constraint violation
        if (error.constraint === 'companies_approval_policy_check') {
          return 'Approval policy must be either "manual" or "auto".';
        }
        if (error.constraint === 'companies_learning_path_approval_check') {
          // Legacy constraint name (for backward compatibility during migration)
          return 'Approval policy must be either "manual" or "auto".';
        }
        if (error.constraint === 'employees_status_check') {
          return 'Employee status must be either "active" or "inactive".';
        }
        if (error.constraint && error.constraint.includes('role_type')) {
          return 'Invalid role type. Valid roles are: REGULAR_EMPLOYEE, TRAINER, TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER.';
        }
        if (error.constraint && error.constraint.includes('relationship_type')) {
          return 'Invalid relationship type. Must be either "team_manager" or "department_manager".';
        }
        return 'One of the fields has an invalid value. Please check your data.';

      case '23502': // Not null violation
        if (error.column === 'email') {
          return 'Email address is required for all employees.';
        }
        if (error.column === 'full_name') {
          return 'Full name is required for all employees.';
        }
        if (error.column === 'employee_id') {
          return 'Employee ID is required for all employees.';
        }
        if (error.column === 'kpis') {
          return 'KPIs field is mandatory. Please provide company KPIs in the first row of your CSV.';
        }
        return `The field "${error.column}" is required but was not provided.`;

      case '42P01': // Undefined table
        return 'A database error occurred. Please contact support.';

      case '42703': // Undefined column
        return 'A database configuration error occurred. Please contact support.';

      default:
        // Try to extract meaningful message from error
        if (error.message) {
          // Check for common patterns in error message
          if (error.message.includes('violates check constraint')) {
            return 'One of the fields has an invalid value. Please check your data and try again.';
          }
          if (error.message.includes('violates unique constraint')) {
            return 'A record with this information already exists. Please check for duplicates.';
          }
          if (error.message.includes('violates not-null constraint')) {
            return 'A required field is missing. Please check your data.';
          }
        }
        return 'An error occurred while processing your request. Please try again.';
    }
  }

  /**
   * Translate validation error to human-friendly message
   * @param {Object} validationError - Validation error object
   * @returns {string} Human-friendly error message
   */
  static translateValidationError(validationError) {
    if (!validationError || !validationError.type) {
      return 'A validation error occurred.';
    }

    switch (validationError.type) {
      case 'missing_field':
        return `The field "${validationError.column}" is required but is missing in row ${validationError.row}.`;

      case 'invalid_format':
        return `The field "${validationError.column}" in row ${validationError.row} has an invalid format: ${validationError.message}`;

      case 'duplicate_email':
        return `The email address "${validationError.message.split(': ')[1]}" appears multiple times in your CSV file. Each employee must have a unique email address.`;

      case 'duplicate_employee_id':
        return `The employee ID "${validationError.message.split(': ')[1]}" appears multiple times in your CSV file. Each employee must have a unique ID.`;

      case 'empty_file':
        return 'The CSV file is empty or contains no data. Please upload a file with employee information.';

      case 'invalid_manager_reference':
        return `The manager ID "${validationError.message.split(' ')[1]}" in row ${validationError.row} does not exist in your CSV file. Please ensure all manager IDs reference existing employees.`;

      default:
        return validationError.message || 'A validation error occurred.';
    }
  }

  /**
   * Translate generic error to user-friendly message
   * @param {Error|string} error - Error object or message
   * @returns {string} Human-friendly error message
   */
  static translateError(error) {
    if (typeof error === 'string') {
      return error;
    }

    if (error && error.code) {
      return this.translateDatabaseError(error);
    }

    if (error && error.type) {
      return this.translateValidationError(error);
    }

    if (error && error.message) {
      // Check if it's already a user-friendly message
      if (!error.message.includes('violates') && 
          !error.message.includes('constraint') &&
          !error.message.includes('key') &&
          !error.message.includes('ERROR')) {
        return error.message;
      }
      return this.translateDatabaseError(error);
    }

    return 'An unexpected error occurred. Please try again.';
  }
}

module.exports = ErrorTranslator;

