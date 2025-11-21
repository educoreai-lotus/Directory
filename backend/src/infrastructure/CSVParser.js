// Infrastructure Layer - CSV Parser
// Parses CSV files and extracts company hierarchy and employee data

const csv = require('csv-parser');
const { Readable } = require('stream');

class CSVParser {
  /**
   * Parse CSV file buffer
   * @param {Buffer} fileBuffer - CSV file buffer
   * @returns {Promise<Array>} Parsed CSV rows
   */
  async parse(fileBuffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const csvText = fileBuffer.toString();
      let currentLineNumber = 1; // Start at 1 (header is line 1)
      const stream = Readable.from(csvText);

      stream
        .pipe(csv())
        .on('data', (row) => {
          currentLineNumber++; // Increment for each row (header was line 1)
          // Skip empty rows (rows where all values are empty or whitespace)
          const hasData = Object.values(row).some(value => value && String(value).trim().length > 0);
          if (hasData) {
            // Store the actual CSV line number with the row
            row._csvLineNumber = currentLineNumber;
            results.push(row);
          } else {
            // Still increment line number for empty rows, but don't add to results
            // This ensures line numbers stay accurate
          }
        })
        .on('end', () => {
          console.log(`[CSVParser] Parsed ${results.length} data rows from CSV`);
          resolve(results);
        })
        .on('error', (error) => {
          console.error('[CSVParser] Error parsing CSV:', error);
          reject(new Error(`Failed to parse CSV file: ${error.message}`));
        });
    });
  }

  /**
   * Normalize company row data (row 1 only)
   * @param {Object} row - Raw CSV row
   * @param {number} rowNumber - Row number (1-indexed, including header)
   * @returns {Object} Normalized company data
   */
  normalizeCompanyRow(row, rowNumber) {
    return {
      rowNumber,
      // Company data (only from row 1)
      company_name: this.trimValue(row.company_name),
      industry: this.trimValue(row.industry),
      approval_policy: this.normalizeApprovalPolicy(this.trimValue(row.approval_policy) || this.trimValue(row.learning_path_approval)) || 'manual',
      kpis: this.trimValue(row.KPIs) || this.trimValue(row.kpis), // Removed primary_kpis - only kpis
      logo_url: this.trimValue(row.logo_url) || this.trimValue(row.company_logo) || this.trimValue(row.logo),
      // Company settings for microservice integration
      passing_grade: this.parseIntValue(row.passing_grade),
      max_attempts: this.parseIntValue(row.max_attempts),
      exercises_limited: this.parseBoolean(row.exercises_limited),
      num_of_exercises: this.parseIntValue(row.num_of_exercises),
      learning_path_approval: this.trimValue(row.learning_path_approval)
    };
  }

  /**
   * Normalize employee row data (rows 2+)
   * @param {Object} row - Raw CSV row
   * @param {number} rowNumber - Row number (1-indexed, including header)
   * @returns {Object} Normalized employee row data
   */
  normalizeEmployeeRow(row, rowNumber) {
    // Debug logging for first employee row
    if (rowNumber === 3) {
      console.log(`[CSVParser] Normalizing employee row ${rowNumber}:`);
      console.log(`[CSVParser] Raw row keys:`, Object.keys(row));
      console.log(`[CSVParser] Raw row employee_id:`, row.employee_id);
      console.log(`[CSVParser] Raw row full_name:`, row.full_name);
      console.log(`[CSVParser] Raw row email:`, row.email);
      console.log(`[CSVParser] Raw row role_type:`, row.role_type);
      console.log(`[CSVParser] Raw row current_role_in_company:`, row.current_role_in_company);
    }

    const normalized = {
      rowNumber,
      // Department data
      department_id: this.trimValue(row.department_id),
      department_name: this.trimValue(row.department_name),
      
      // Team data
      team_id: this.trimValue(row.team_id),
      team_name: this.trimValue(row.team_name),
      
      // Employee data
      employee_id: this.trimValue(row.employee_id),
      full_name: this.trimValue(row.full_name),
      email: this.trimValue(row.email),
      role_type: this.normalizeRoleType(this.trimValue(row.role_type)),
      current_role_in_company: this.trimValue(row.current_role_in_company),
      target_role_in_company: this.trimValue(row.target_role_in_company),
      manager_id: this.trimValuePreserveEmpty(row.manager_id), // Preserve empty strings for manager_id
      password: this.trimValuePreserveEmpty(row.password) || null, // Preserve password, but allow null if empty
      preferred_language: this.trimValue(row.preferred_language),
      status: this.normalizeEmployeeStatus(this.trimValue(row.status)) || 'active',
      
      // Trainer-specific fields
      ai_enabled: this.parseBoolean(row.ai_enabled),
      public_publish_enable: this.parseBoolean(row.public_publish_enable)
    };

    // Debug logging for first employee row
    if (rowNumber === 3) {
      console.log(`[CSVParser] Normalized employee row ${rowNumber}:`);
      console.log(`[CSVParser] Normalized email:`, normalized.email);
      console.log(`[CSVParser] Normalized employee_id:`, normalized.employee_id);
      console.log(`[CSVParser] Normalized role_type:`, normalized.role_type);
    }

    return normalized;
  }

  /**
   * Normalize CSV row data (legacy method - kept for backward compatibility)
   * @param {Object} row - Raw CSV row
   * @param {number} rowNumber - Row number (1-indexed, including header)
   * @returns {Object} Normalized row data
   * @deprecated Use normalizeCompanyRow or normalizeEmployeeRow instead
   */
  normalizeRow(row, rowNumber) {
    // This method is deprecated but kept for backward compatibility
    // It combines company and employee data (old format)
    return {
      rowNumber,
      // Company data
      company_name: this.trimValue(row.company_name),
      industry: this.trimValue(row.industry),
      approval_policy: this.normalizeApprovalPolicy(this.trimValue(row.approval_policy) || this.trimValue(row.learning_path_approval)) || 'manual',
      kpis: this.trimValue(row.KPIs) || this.trimValue(row.kpis), // Removed primary_kpis
      logo_url: this.trimValue(row.logo_url) || this.trimValue(row.company_logo) || this.trimValue(row.logo),
      // Company settings for microservice integration
      passing_grade: this.parseIntValue(row.passing_grade),
      max_attempts: this.parseIntValue(row.max_attempts),
      exercises_limited: this.parseBoolean(row.exercises_limited),
      num_of_exercises: this.parseIntValue(row.num_of_exercises),
      
      // Department data
      department_id: this.trimValue(row.department_id),
      department_name: this.trimValue(row.department_name),
      
      // Team data
      team_id: this.trimValue(row.team_id),
      team_name: this.trimValue(row.team_name),
      
      // Employee data
      employee_id: this.trimValue(row.employee_id),
      full_name: this.trimValue(row.full_name),
      email: this.trimValue(row.email),
      role_type: this.normalizeRoleType(this.trimValue(row.role_type)),
      current_role_in_company: this.trimValue(row.current_role_in_company),
      target_role_in_company: this.trimValue(row.target_role_in_company),
      manager_id: this.trimValuePreserveEmpty(row.manager_id),
      password: this.trimValuePreserveEmpty(row.password) || null,
      preferred_language: this.trimValue(row.preferred_language),
      status: this.normalizeEmployeeStatus(this.trimValue(row.status)) || 'active',
      
      // Trainer-specific fields
      ai_enabled: this.parseBoolean(row.ai_enabled),
      public_publish_enable: this.parseBoolean(row.public_publish_enable)
    };
  }

  /**
   * Trim and clean string value
   * @param {string} value - Value to trim
   * @returns {string|null} Trimmed value or null if empty
   */
  trimValue(value) {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
  }

  /**
   * Trim and clean string value, preserving empty strings
   * Used for fields like manager_id where empty string is a valid value
   * @param {string} value - Value to trim
   * @returns {string} Trimmed value (empty string if empty, not null)
   */
  trimValuePreserveEmpty(value) {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).trim();
  }

  /**
   * Parse boolean value from CSV
   * @param {string} value - Value to parse
   * @returns {boolean} Parsed boolean
   */
  parseBoolean(value) {
    if (value === undefined || value === null) {
      return false;
    }
    const str = String(value).trim().toUpperCase();
    return str === 'TRUE' || str === '1' || str === 'YES';
  }

  /**
   * Parse integer value from CSV
   * @param {string} value - Value to parse
   * @returns {number|null} Parsed integer or null if invalid
   */
  parseIntValue(value) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = parseInt(String(value).trim(), 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Normalize approval_policy value
   * @param {string} value - Value to normalize
   * @returns {string|null} Normalized value ('manual' or 'auto') or null
   */
  normalizeApprovalPolicy(value) {
    if (!value) {
      return null;
    }
    const normalized = String(value).trim().toLowerCase();
    // Check for exact matches first
    if (normalized === 'manual') {
      return 'manual';
    }
    if (normalized === 'auto' || normalized === 'automatic') {
      return 'auto';
    }
    // Check for partial matches (e.g., "Manual", "AUTO", "AUTOMATIC")
    if (normalized.startsWith('manual')) {
      return 'manual';
    }
    if (normalized.startsWith('auto')) {
      return 'auto';
    }
    return null; // Invalid value, will default to 'manual' in the parser
  }

  /**
   * Normalize employee status value
   * @param {string} value - Value to normalize
   * @returns {string|null} Normalized value ('active' or 'inactive') or null
   */
  normalizeEmployeeStatus(value) {
    if (!value) {
      return null;
    }
    const normalized = String(value).trim().toLowerCase();
    // Check for exact matches
    if (normalized === 'active') {
      return 'active';
    }
    if (normalized === 'inactive') {
      return 'inactive';
    }
    // Check for common variations
    if (normalized.startsWith('active')) {
      return 'active';
    }
    if (normalized.startsWith('inactive')) {
      return 'inactive';
    }
    return null; // Invalid value, will default to 'active' in the parser
  }

  /**
   * Normalize role_type value to uppercase
   * Database constraint expects: REGULAR_EMPLOYEE, TRAINER, TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER
   * IMPORTANT: Every role must include either REGULAR_EMPLOYEE or TRAINER as base role
   * @param {string} value - Value to normalize (can be combination like "REGULAR_EMPLOYEE + TEAM_MANAGER")
   * @returns {string|null} Normalized value in uppercase or null if invalid
   */
  normalizeRoleType(value) {
    if (!value) {
      return null;
    }
    // Split by '+' to handle combinations, normalize each part, then rejoin
    const parts = value.split('+').map(part => {
      const trimmed = part.trim().toUpperCase();
      // Validate each role part
      const validRoles = [
        'REGULAR_EMPLOYEE',
        'TRAINER',
        'TEAM_MANAGER',
        'DEPARTMENT_MANAGER',
        'DECISION_MAKER'
      ];
      return validRoles.includes(trimmed) ? trimmed : null;
    }).filter(part => part !== null);
    
    if (parts.length === 0) {
      return null; // No valid roles
    }

    // CRITICAL: Every role must include either REGULAR_EMPLOYEE or TRAINER as base role
    const hasBaseRole = parts.includes('REGULAR_EMPLOYEE') || parts.includes('TRAINER');
    if (!hasBaseRole) {
      // Invalid: missing base role - return null to trigger validation error
      return null;
    }
    
    // Return joined roles (sorted: base role first, then others)
    const baseRoles = parts.filter(r => r === 'REGULAR_EMPLOYEE' || r === 'TRAINER');
    const otherRoles = parts.filter(r => r !== 'REGULAR_EMPLOYEE' && r !== 'TRAINER');
    const sortedParts = [...baseRoles, ...otherRoles];
    
    return sortedParts.join(' + ');
  }
}

module.exports = CSVParser;

