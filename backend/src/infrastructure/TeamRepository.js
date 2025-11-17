// Infrastructure Layer - Team Repository
// Handles database operations for teams

const { Pool } = require('pg');
const config = require('../config');

class TeamRepository {
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
   * Create or get team
   * @param {string} companyId - Company ID
   * @param {string} teamId - Team ID from CSV
   * @param {string} teamName - Team name
   * @param {string} departmentId - Department UUID (not CSV department_id)
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Team record
   */
  async createOrGet(companyId, teamId, teamName, departmentId, client = null) {
    const queryRunner = client || this.pool;

    // Check if team already exists
    const checkQuery = 'SELECT * FROM teams WHERE company_id = $1 AND team_id = $2';
    const checkResult = await queryRunner.query(checkQuery, [companyId, teamId]);

    if (checkResult.rows.length > 0) {
      return checkResult.rows[0];
    }

    // Create new team
    const insertQuery = `
      INSERT INTO teams (company_id, team_id, team_name, department_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await queryRunner.query(insertQuery, [companyId, teamId, teamName, departmentId]);
    return result.rows[0];
  }

  /**
   * Find team by company and team ID
   * @param {string} companyId - Company ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Object|null>} Team or null
   */
  async findByCompanyAndTeamId(companyId, teamId) {
    const query = 'SELECT * FROM teams WHERE company_id = $1 AND team_id = $2';
    const result = await this.pool.query(query, [companyId, teamId]);
    return result.rows[0] || null;
  }
}

module.exports = TeamRepository;

