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
   * Normalize CSV row data
   * @param {Object} row - Raw CSV row
   * @param {number} rowNumber - Row number (1-indexed, including header)
   * @returns {Object} Normalized row data
   */
  normalizeRow(row, rowNumber) {
    return {
      rowNumber,
      // Company data
      company_name: this.trimValue(row.company_name),
      industry: this.trimValue(row.industry),
      learning_path_approval: this.normalizeLearningPathApproval(this.trimValue(row.learning_path_approval)) || 'manual',
      primary_kpis: this.trimValue(row.primary_KPIs) || this.trimValue(row.primary_kpis),
      
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
      role_type: this.trimValue(row.role_type),
      current_role_in_company: this.trimValue(row.current_role_in_company),
      target_role_in_company: this.trimValue(row.target_role_in_company),
      manager_id: this.trimValue(row.manager_id),
      password: this.trimValue(row.password),
      preferred_language: this.trimValue(row.preferred_language),
      status: this.trimValue(row.status) || 'active',
      
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
   * Normalize learning_path_approval value
   * @param {string} value - Value to normalize
   * @returns {string|null} Normalized value ('manual' or 'automatic') or null
   */
  normalizeLearningPathApproval(value) {
    if (!value) {
      return null;
    }
    const normalized = String(value).trim().toLowerCase();
    // Check for exact matches first
    if (normalized === 'manual') {
      return 'manual';
    }
    if (normalized === 'automatic') {
      return 'automatic';
    }
    // Check for partial matches (e.g., "Manual", "AUTOMATIC")
    if (normalized.startsWith('manual')) {
      return 'manual';
    }
    if (normalized.startsWith('automatic')) {
      return 'automatic';
    }
    return null; // Invalid value, will default to 'manual' in the parser
  }
}

module.exports = CSVParser;

