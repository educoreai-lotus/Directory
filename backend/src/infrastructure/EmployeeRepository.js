// Infrastructure Layer - Employee Repository
// Handles database operations for employees

const { Pool } = require('pg');
const config = require('../config');
const bcrypt = require('bcrypt');

class EmployeeRepository {
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
   * Create employee
   * @param {Object} employeeData - Employee data
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Created employee
   */
  async create(employeeData, client = null) {
    const {
      company_id,
      employee_id,
      full_name,
      email,
      password,
      current_role_in_company,
      target_role_in_company,
      preferred_language,
      status
    } = employeeData;

    // Hash password (use default if not provided)
    const passwordToHash = password || 'default123';
    const password_hash = await bcrypt.hash(passwordToHash, 10);

    const query = `
      INSERT INTO employees (
        company_id,
        employee_id,
        full_name,
        email,
        password_hash,
        current_role_in_company,
        target_role_in_company,
        preferred_language,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      company_id,
      employee_id,
      full_name,
      email,
      password_hash,
      current_role_in_company,
      target_role_in_company,
      preferred_language || null,
      status || 'active'
    ];

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, values);
    return result.rows[0];
  }

  /**
   * Find employee by company and employee ID
   * @param {string} companyId - Company ID
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Object|null>} Employee or null
   */
  async findByCompanyAndEmployeeId(companyId, employeeId) {
    const query = 'SELECT * FROM employees WHERE company_id = $1 AND employee_id = $2';
    const result = await this.pool.query(query, [companyId, employeeId]);
    return result.rows[0] || null;
  }

  /**
   * Find employee by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} Employee or null
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM employees WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Create employee role
   * @param {string} employeeId - Employee UUID
   * @param {string} roleType - Role type
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Created role
   */
  async createRole(employeeId, roleType, client = null) {
    const query = `
      INSERT INTO employee_roles (employee_id, role_type)
      VALUES ($1, $2)
      ON CONFLICT (employee_id, role_type) DO NOTHING
      RETURNING *
    `;
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId, roleType]);
    return result.rows[0];
  }

  /**
   * Create employee-team relationship
   * @param {string} employeeId - Employee UUID
   * @param {string} teamId - Team UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Created relationship
   */
  async assignToTeam(employeeId, teamId, client = null) {
    const query = `
      INSERT INTO employee_teams (employee_id, team_id)
      VALUES ($1, $2)
      ON CONFLICT (employee_id, team_id) DO NOTHING
      RETURNING *
    `;
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId, teamId]);
    return result.rows[0];
  }

  /**
   * Create employee-manager relationship
   * @param {string} employeeId - Employee UUID
   * @param {string} managerId - Manager employee UUID
   * @param {string} relationshipType - 'team_manager' or 'department_manager'
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Created relationship
   */
  async assignManager(employeeId, managerId, relationshipType, client = null) {
    const query = `
      INSERT INTO employee_managers (employee_id, manager_id, relationship_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (employee_id, manager_id, relationship_type) DO NOTHING
      RETURNING *
    `;
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId, managerId, relationshipType]);
    return result.rows[0];
  }

  /**
   * Create trainer settings
   * @param {string} employeeId - Employee UUID
   * @param {boolean} aiEnabled - AI enabled flag
   * @param {boolean} publicPublishEnable - Public publish flag
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Created settings
   */
  async createTrainerSettings(employeeId, aiEnabled, publicPublishEnable, client = null) {
    const query = `
      INSERT INTO trainer_settings (employee_id, ai_enabled, public_publish_enable)
      VALUES ($1, $2, $3)
      ON CONFLICT (employee_id) DO UPDATE
      SET ai_enabled = $2, public_publish_enable = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [employeeId, aiEnabled, publicPublishEnable]);
    return result.rows[0];
  }
}

module.exports = EmployeeRepository;

