// Infrastructure Layer - Database Constraint Validator
// Validates data against database constraints BEFORE insert/update
// Prevents database constraint violations from reaching the user

class DatabaseConstraintValidator {
  /**
   * Validate approval_policy value
   * @param {string|null|undefined} value - Value to validate
   * @returns {string} Valid value ('manual' or 'auto')
   * @throws {Error} If value cannot be normalized
   */
  validateApprovalPolicy(value) {
    if (!value) {
      return 'manual'; // Default
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'manual' || normalized.startsWith('manual')) {
      return 'manual';
    }
    if (normalized === 'auto' || normalized === 'automatic' || normalized.startsWith('auto')) {
      return 'auto';
    }
    // Invalid value - return default
    return 'manual';
  }

  /**
   * Validate employee status value
   * @param {string|null|undefined} value - Value to validate
   * @returns {string} Valid value ('active' or 'inactive')
   */
  validateEmployeeStatus(value) {
    if (!value) {
      return 'active'; // Default
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'active' || normalized.startsWith('active')) {
      return 'active';
    }
    if (normalized === 'inactive' || normalized.startsWith('inactive')) {
      return 'inactive';
    }
    // Invalid value - return default
    return 'active';
  }

  /**
   * Validate role type value
   * @param {string|null|undefined} value - Role type string
   * @returns {Array<string>} Array of valid role types
   * @throws {Error} If no valid roles found
   */
  validateRoleType(value) {
    if (!value) {
      return ['REGULAR_EMPLOYEE']; // Default
    }

    const validRoles = [
      'REGULAR_EMPLOYEE',
      'TRAINER',
      'TEAM_MANAGER',
      'DEPARTMENT_MANAGER',
      'DECISION_MAKER'
    ];

    // Split by '+' to handle combinations
    const parts = value.split('+').map(part => {
      const trimmed = part.trim().toUpperCase();
      return validRoles.includes(trimmed) ? trimmed : null;
    }).filter(part => part !== null);

    if (parts.length === 0) {
      return ['REGULAR_EMPLOYEE']; // Default if no valid roles
    }

    return parts;
  }

  /**
   * Validate relationship type
   * @param {string|null|undefined} value - Relationship type
   * @returns {string} Valid value ('team_manager' or 'department_manager')
   */
  validateRelationshipType(value) {
    if (!value) {
      return 'team_manager'; // Default
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'team_manager' || normalized.startsWith('team')) {
      return 'team_manager';
    }
    if (normalized === 'department_manager' || normalized.startsWith('department')) {
      return 'department_manager';
    }
    return 'team_manager'; // Default
  }

  /**
   * Validate and normalize employee row data
   * Ensures all values match database constraints
   * @param {Object} row - Employee row data
   * @returns {Object} Validated and normalized row
   */
  validateEmployeeRow(row) {
    const validatedRoles = this.validateRoleType(row.role_type);
    return {
      ...row,
      status: this.validateEmployeeStatus(row.status),
      role_type: validatedRoles.join(' + '), // Convert back to string for compatibility
      validatedRoles, // Keep array for easy access
      // Other fields are validated by CSVValidator
    };
  }

  /**
   * Validate company settings update
   * @param {Object} row - Row with company settings
   * @returns {Object} Validated company settings
   * @throws {Error} If mandatory fields are missing
   */
  validateCompanySettings(row) {
    const validated = {};
    
    if (row.approval_policy !== undefined && row.approval_policy !== null) {
      validated.approval_policy = this.validateApprovalPolicy(row.approval_policy);
    }
    
    // KPIs is mandatory
    const kpisValue = row.kpis || row.KPIs; // Removed primary_kpis - only kpis is used
    if (!kpisValue || String(kpisValue).trim() === '') {
      throw new Error('KPIs field is mandatory. Please provide company KPIs in the first row of your CSV.');
    }
    validated.kpis = String(kpisValue).trim();

    // Company settings for microservice integration - all mandatory
    if (row.passing_grade === null || row.passing_grade === undefined || row.passing_grade === '') {
      throw new Error('passing_grade is mandatory. Please provide a passing grade (e.g., 70) in the first row of your CSV.');
    }
    const passingGrade = parseInt(row.passing_grade, 10);
    if (isNaN(passingGrade) || passingGrade < 0 || passingGrade > 100) {
      throw new Error('passing_grade must be a number between 0 and 100.');
    }
    validated.passing_grade = passingGrade;

    if (row.max_attempts === null || row.max_attempts === undefined || row.max_attempts === '') {
      throw new Error('max_attempts is mandatory. Please provide maximum attempts (e.g., 3) in the first row of your CSV.');
    }
    const maxAttempts = parseInt(row.max_attempts, 10);
    if (isNaN(maxAttempts) || maxAttempts < 1) {
      throw new Error('max_attempts must be a positive number.');
    }
    validated.max_attempts = maxAttempts;

    if (row.exercises_limited === null || row.exercises_limited === undefined || row.exercises_limited === '') {
      throw new Error('exercises_limited is mandatory. Please provide true or false in the first row of your CSV.');
    }
    const exercisesLimited = String(row.exercises_limited).trim().toUpperCase();
    if (exercisesLimited !== 'TRUE' && exercisesLimited !== 'FALSE' && exercisesLimited !== '1' && exercisesLimited !== '0') {
      throw new Error('exercises_limited must be true or false.');
    }
    validated.exercises_limited = exercisesLimited === 'TRUE' || exercisesLimited === '1';

    // num_of_exercises is mandatory if exercises_limited is true
    if (validated.exercises_limited) {
      if (row.num_of_exercises === null || row.num_of_exercises === undefined || row.num_of_exercises === '') {
        throw new Error('num_of_exercises is mandatory when exercises_limited is true. Please provide the number of exercises in the first row of your CSV.');
      }
      const numOfExercises = parseInt(row.num_of_exercises, 10);
      if (isNaN(numOfExercises) || numOfExercises < 1) {
        throw new Error('num_of_exercises must be a positive number.');
      }
      validated.num_of_exercises = numOfExercises;
    } else {
      validated.num_of_exercises = null;
    }

    return validated;
  }
}

module.exports = DatabaseConstraintValidator;

