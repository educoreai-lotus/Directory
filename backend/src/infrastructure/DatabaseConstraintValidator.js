// Infrastructure Layer - Database Constraint Validator
// Validates data against database constraints BEFORE insert/update
// Prevents database constraint violations from reaching the user

class DatabaseConstraintValidator {
  /**
   * Validate learning_path_approval value
   * @param {string|null|undefined} value - Value to validate
   * @returns {string} Valid value ('manual' or 'automatic')
   * @throws {Error} If value cannot be normalized
   */
  validateLearningPathApproval(value) {
    if (!value) {
      return 'manual'; // Default
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'manual' || normalized.startsWith('manual')) {
      return 'manual';
    }
    if (normalized === 'automatic' || normalized.startsWith('automatic')) {
      return 'automatic';
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
   */
  validateCompanySettings(row) {
    const validated = {};
    
    if (row.learning_path_approval !== undefined && row.learning_path_approval !== null) {
      validated.learning_path_approval = this.validateLearningPathApproval(row.learning_path_approval);
    }
    
    if (row.primary_kpis !== undefined && row.primary_kpis !== null) {
      validated.primary_kpis = String(row.primary_kpis).trim();
    }

    return validated;
  }
}

module.exports = DatabaseConstraintValidator;

