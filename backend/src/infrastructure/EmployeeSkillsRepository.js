// Infrastructure Layer - Employee Skills Repository
// Handles database operations for employee_skills table
// Stores Skills Engine response to avoid duplicate calls

const { Pool } = require('pg');
const config = require('../config');

class EmployeeSkillsRepository {
  constructor() {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL or database connection parameters are not configured.');
    }

    this.pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Save or update employee skills from Skills Engine response
   * @param {string} employeeId - Employee UUID
   * @param {Object} skillsData - Skills data from Skills Engine
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Saved skills data
   */
  async saveOrUpdate(employeeId, skillsData, client = null) {
    const query = `
      INSERT INTO employee_skills (employee_id, competencies, relevance_score, gap, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (employee_id)
      DO UPDATE SET
        competencies = EXCLUDED.competencies,
        relevance_score = EXCLUDED.relevance_score,
        gap = EXCLUDED.gap,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      employeeId,
      JSON.stringify(skillsData.competencies || []),
      skillsData.relevance_score || 0,
      skillsData.gap ? JSON.stringify(skillsData.gap) : null
    ];

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, values);
    
    // Parse JSONB data back to object
    const row = result.rows[0];
    if (row && typeof row.competencies === 'string') {
      row.competencies = JSON.parse(row.competencies);
    }
    if (row && row.gap && typeof row.gap === 'string') {
      row.gap = JSON.parse(row.gap);
    }
    
    return row;
  }

  /**
   * Get employee skills from database
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Skills data or null if not found
   */
  async findByEmployeeId(employeeId) {
    try {
      const query = `
        SELECT * FROM employee_skills
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
      if (row && row.gap && typeof row.gap === 'string') {
        row.gap = JSON.parse(row.gap);
      }
      
      return row;
    } catch (error) {
      // If table doesn't exist (migration not run), return null to trigger fallback
      if (error.code === '42P01') { // relation does not exist
        console.warn('[EmployeeSkillsRepository] employee_skills table does not exist. Run migration 003_add_employee_skills_table.sql');
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete employee skills (when employee is deleted)
   * @param {string} employeeId - Employee UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<void>}
   */
  async deleteByEmployeeId(employeeId, client = null) {
    const query = `DELETE FROM employee_skills WHERE employee_id = $1`;
    const queryRunner = client || this.pool;
    await queryRunner.query(query, [employeeId]);
  }
}

module.exports = EmployeeSkillsRepository;

