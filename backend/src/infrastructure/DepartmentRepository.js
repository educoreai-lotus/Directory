// Infrastructure Layer - Department Repository
// Handles database operations for departments

const { Pool } = require('pg');
const config = require('../config');

class DepartmentRepository {
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
   * Create or get department
   * @param {string} companyId - Company ID
   * @param {string} departmentId - Department ID from CSV
   * @param {string} departmentName - Department name
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Department record
   */
  async createOrGet(companyId, departmentId, departmentName, client = null) {
    const queryRunner = client || this.pool;

    // Check if department already exists
    const checkQuery = 'SELECT * FROM departments WHERE company_id = $1 AND department_id = $2';
    const checkResult = await queryRunner.query(checkQuery, [companyId, departmentId]);

    if (checkResult.rows.length > 0) {
      return checkResult.rows[0];
    }

    // Create new department
    const insertQuery = `
      INSERT INTO departments (company_id, department_id, department_name)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await queryRunner.query(insertQuery, [companyId, departmentId, departmentName]);
    return result.rows[0];
  }

  /**
   * Find department by company and department ID
   * @param {string} companyId - Company ID
   * @param {string} departmentId - Department ID
   * @returns {Promise<Object|null>} Department or null
   */
  async findByCompanyAndDepartmentId(companyId, departmentId) {
    const query = 'SELECT * FROM departments WHERE company_id = $1 AND department_id = $2';
    const result = await this.pool.query(query, [companyId, departmentId]);
    return result.rows[0] || null;
  }
}

module.exports = DepartmentRepository;

