// Infrastructure Layer - Employee Career Path Competencies Repository
// Handles database operations for employee_career_path_competencies table
// Stores career path competencies received from Skills Engine via Coordinator

const { Pool } = require('pg');
const config = require('../config');

class EmployeeCareerPathRepository {
  constructor() {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL or database connection parameters are not configured.');
    }

    this.pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10  // Limit concurrent connections to prevent pool exhaustion
    });
  }

  /**
   * Save or update employee career path competencies from Skills Engine
   * @param {string} employeeId - Employee UUID
   * @param {Array} competencies - Array of { competency_id, competency_name }
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Saved competencies data
   */
  async saveOrUpdate(employeeId, competencies, client = null) {
    const query = `
      INSERT INTO employee_career_path_competencies (employee_id, competencies, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (employee_id)
      DO UPDATE SET
        competencies = EXCLUDED.competencies,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      employeeId,
      JSON.stringify(competencies || [])
    ];

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, values);
    
    // Parse JSONB data back to object
    const row = result.rows[0];
    if (row && typeof row.competencies === 'string') {
      row.competencies = JSON.parse(row.competencies);
    }
    
    return row;
  }

  /**
   * Get employee career path competencies from database
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Competencies data or null if not found
   */
  async findByEmployeeId(employeeId) {
    try {
      const query = `
        SELECT * FROM employee_career_path_competencies
        WHERE employee_id = $1
      `;

      const result = await this.pool.query(query, [employeeId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      // Parse JSONB data back to object
      if (row && typeof row.competencies === 'string') {
        row.competencies = JSON.parse(row.competencies);
      }
      
      return row;
    } catch (error) {
      // If table doesn't exist (migration not run), return null
      if (error.code === '42P01') { // relation does not exist
        console.warn('[EmployeeCareerPathRepository] employee_career_path_competencies table does not exist. Run migration 007_add_employee_career_path_competencies_table.sql');
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete employee career path competencies (when employee is deleted)
   * @param {string} employeeId - Employee UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<void>}
   */
  async deleteByEmployeeId(employeeId, client = null) {
    const query = `DELETE FROM employee_career_path_competencies WHERE employee_id = $1`;
    const queryRunner = client || this.pool;
    await queryRunner.query(query, [employeeId]);
  }
}

module.exports = EmployeeCareerPathRepository;

