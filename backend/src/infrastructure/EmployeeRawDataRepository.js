// Infrastructure Layer - Employee Raw Data Repository
// Handles database operations for employee_raw_data table
// Stores raw data from various sources (PDF, manual, LinkedIn, GitHub, merged)

const { Pool } = require('pg');
const config = require('../config');

class EmployeeRawDataRepository {
  constructor() {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL or database connection parameters are not configured.');
    }

    this.pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10
    });
  }

  /**
   * Create or update raw data entry
   * @param {string} employeeId - Employee UUID
   * @param {string} source - Data source: 'pdf', 'manual', 'linkedin', 'github', 'merged'
   * @param {Object} data - Raw data object (will be stored as JSONB)
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Created/updated raw data entry
   */
  async createOrUpdate(employeeId, source, data, client = null) {
    // First, try to find existing record
    const existingQuery = `
      SELECT id FROM employee_raw_data
      WHERE employee_id = $1 AND source = $2
    `;
    
    const queryRunner = client || this.pool;
    const existingResult = await queryRunner.query(existingQuery, [employeeId, source]);
    
    if (existingResult.rows.length > 0) {
      // Update existing record
      const updateQuery = `
        UPDATE employee_raw_data
        SET data = $1, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $2 AND source = $3
        RETURNING *
      `;
      
      const updateResult = await queryRunner.query(updateQuery, [
        JSON.stringify(data),
        employeeId,
        source
      ]);
      
      const row = updateResult.rows[0];
      if (row && typeof row.data === 'string') {
        row.data = JSON.parse(row.data);
      }
      return row;
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO employee_raw_data (employee_id, source, data, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const insertResult = await queryRunner.query(insertQuery, [
        employeeId,
        source,
        JSON.stringify(data)
      ]);
      
      const row = insertResult.rows[0];
      if (row && typeof row.data === 'string') {
        row.data = JSON.parse(row.data);
      }
      return row;
    }
  }

  /**
   * Find all raw data entries for an employee
   * @param {string} employeeId - Employee UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Array>} Array of raw data entries
   */
  async findByEmployeeId(employeeId, client = null) {
    const query = `
      SELECT * FROM employee_raw_data
      WHERE employee_id = $1
      ORDER BY created_at DESC
    `;

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId]);
    
    // Parse JSONB data back to objects
    return result.rows.map(row => {
      if (row.data && typeof row.data === 'string') {
        row.data = JSON.parse(row.data);
      }
      return row;
    });
  }

  /**
   * Find raw data entry by employee ID and source
   * @param {string} employeeId - Employee UUID
   * @param {string} source - Data source: 'pdf', 'manual', 'linkedin', 'github', 'merged'
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object|null>} Raw data entry or null
   */
  async findByEmployeeIdAndSource(employeeId, source, client = null) {
    const query = `
      SELECT * FROM employee_raw_data
      WHERE employee_id = $1 AND source = $2
    `;

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId, source]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    if (row.data && typeof row.data === 'string') {
      row.data = JSON.parse(row.data);
    }
    
    return row;
  }

  /**
   * Delete raw data entry by employee ID and source
   * @param {string} employeeId - Employee UUID
   * @param {string} source - Data source to delete
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteByEmployeeIdAndSource(employeeId, source, client = null) {
    const query = `
      DELETE FROM employee_raw_data
      WHERE employee_id = $1 AND source = $2
      RETURNING id
    `;

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId, source]);
    
    return result.rows.length > 0;
  }

  /**
   * Delete all raw data entries for an employee
   * @param {string} employeeId - Employee UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<number>} Number of deleted rows
   */
  async deleteByEmployeeId(employeeId, client = null) {
    const query = `
      DELETE FROM employee_raw_data
      WHERE employee_id = $1
      RETURNING id
    `;

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId]);
    
    return result.rows.length;
  }

  /**
   * Check if employee has any raw data
   * @param {string} employeeId - Employee UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<boolean>} True if employee has any raw data
   */
  async hasAnyData(employeeId, client = null) {
    const query = `
      SELECT COUNT(*) as count
      FROM employee_raw_data
      WHERE employee_id = $1
    `;

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId]);
    
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Get list of available sources for an employee
   * @param {string} employeeId - Employee UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Array<string>>} Array of source names
   */
  async getAvailableSources(employeeId, client = null) {
    const query = `
      SELECT DISTINCT source
      FROM employee_raw_data
      WHERE employee_id = $1
      ORDER BY source
    `;

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId]);
    
    return result.rows.map(row => row.source);
  }

  /**
   * Check if employee has valid enrichment sources (GitHub OR CV PDF)
   * LinkedIn is NOT considered a valid enrichment source
   * @param {string} employeeId - Employee UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<boolean>} True if employee has GitHub or PDF data
   */
  async hasValidEnrichmentSource(employeeId, client = null) {
    const queryRunner = client || this.pool;
    
    try {
      // Try to query with explicit enum casting to avoid enum mismatch errors
      const query = `
        SELECT COUNT(*) as count
        FROM employee_raw_data
        WHERE employee_id = $1 
          AND source::text IN ('github', 'pdf')
      `;

      const result = await queryRunner.query(query, [employeeId]);
      const hasNewSource = parseInt(result.rows[0].count) > 0;
      
      // Also check old OAuth data (backward compatibility)
      // Check if employee has GitHub data in employees.github_data column
      const employeeQuery = `
        SELECT github_data
        FROM employees
        WHERE id = $1
      `;
      const employeeResult = await queryRunner.query(employeeQuery, [employeeId]);
      const hasOldGitHub = employeeResult.rows.length > 0 && 
                           employeeResult.rows[0].github_data !== null &&
                           employeeResult.rows[0].github_data !== undefined;
      
      return hasNewSource || hasOldGitHub;
    } catch (error) {
      // If enum doesn't exist or query fails, fall back to checking old GitHub data only
      console.warn('[EmployeeRawDataRepository] Error checking valid enrichment source, using fallback:', error.message);
      
      const employeeQuery = `
        SELECT github_data
        FROM employees
        WHERE id = $1
      `;
      const employeeResult = await queryRunner.query(employeeQuery, [employeeId]);
      const hasOldGitHub = employeeResult.rows.length > 0 && 
                           employeeResult.rows[0].github_data !== null &&
                           employeeResult.rows[0].github_data !== undefined;
      
      return hasOldGitHub;
    }
  }
}

module.exports = EmployeeRawDataRepository;

