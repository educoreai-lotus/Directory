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
   * Find employee by email and company
   * @param {string} email - Email address
   * @param {string} companyId - Company ID
   * @returns {Promise<Object|null>} Employee or null
   */
  async findByEmailAndCompany(email, companyId) {
    const query = 'SELECT * FROM employees WHERE email = $1 AND company_id = $2';
    const result = await this.pool.query(query, [email, companyId]);
    return result.rows[0] || null;
  }

  /**
   * Check if email exists in any company
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} Employee with company_id or null
   */
  async findEmailOwner(email) {
    const query = 'SELECT id, email, company_id, full_name FROM employees WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Create or update employee (handles email uniqueness)
   * If email exists for same company → UPDATE
   * If email exists for different company → THROW error
   * If email doesn't exist → INSERT
   * @param {Object} employeeData - Employee data
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Created or updated employee
   */
  async createOrUpdate(employeeData, client = null) {
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

    const queryRunner = client || this.pool;

    // Check if email already exists
    const existingEmailOwner = await this.findEmailOwner(email);
    
    if (existingEmailOwner) {
      // Email exists - check if it's for the same company
      if (existingEmailOwner.company_id === company_id) {
        // Same company - UPDATE the employee
        return await this.updateByEmail(email, company_id, {
          employee_id,
          full_name,
          password,
          current_role_in_company,
          target_role_in_company,
          preferred_language,
          status
        }, client);
      } else {
        // Different company - REJECT
        throw new Error(`Email address "${email}" is already registered to another company. Each email must be unique across all companies.`);
      }
    }

    // Email doesn't exist - check if employee_id exists for this company
    const existingEmployee = await this.findByCompanyAndEmployeeId(company_id, employee_id);
    
    if (existingEmployee) {
      // Employee ID exists - UPDATE
      return await this.updateByEmployeeId(company_id, employee_id, {
        full_name,
        email,
        password,
        current_role_in_company,
        target_role_in_company,
        preferred_language,
        status
      }, client);
    }

    // Neither email nor employee_id exists - INSERT
    return await this.create(employeeData, client);
  }

  /**
   * Update employee by email
   * @param {string} email - Email address
   * @param {string} companyId - Company ID
   * @param {Object} updateData - Data to update
   * @param {Object} client - Optional database client
   * @returns {Promise<Object>} Updated employee
   */
  async updateByEmail(email, companyId, updateData, client = null) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(updateData.full_name);
    }
    if (updateData.employee_id !== undefined) {
      updates.push(`employee_id = $${paramIndex++}`);
      values.push(updateData.employee_id);
    }
    if (updateData.password !== undefined) {
      const password_hash = await bcrypt.hash(updateData.password || 'default123', 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(password_hash);
    }
    if (updateData.current_role_in_company !== undefined) {
      updates.push(`current_role_in_company = $${paramIndex++}`);
      values.push(updateData.current_role_in_company);
    }
    if (updateData.target_role_in_company !== undefined) {
      updates.push(`target_role_in_company = $${paramIndex++}`);
      values.push(updateData.target_role_in_company);
    }
    if (updateData.preferred_language !== undefined) {
      updates.push(`preferred_language = $${paramIndex++}`);
      values.push(updateData.preferred_language);
    }
    if (updateData.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
    }

    if (updates.length === 0) {
      // No updates - just return existing employee
      return await this.findByEmailAndCompany(email, companyId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(email, companyId);

    const query = `
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE email = $${paramIndex++} AND company_id = $${paramIndex}
      RETURNING *
    `;

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, values);
    return result.rows[0];
  }

  /**
   * Update employee by employee_id
   * @param {string} companyId - Company ID
   * @param {string} employeeId - Employee ID
   * @param {Object} updateData - Data to update
   * @param {Object} client - Optional database client
   * @returns {Promise<Object>} Updated employee
   */
  async updateByEmployeeId(companyId, employeeId, updateData, client = null) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(updateData.full_name);
    }
    if (updateData.email !== undefined) {
      // Check if new email already exists
      const emailOwner = await this.findEmailOwner(updateData.email);
      if (emailOwner && emailOwner.company_id !== companyId) {
        throw new Error(`Email address "${updateData.email}" is already registered to another company.`);
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(updateData.email);
    }
    if (updateData.password !== undefined) {
      const password_hash = await bcrypt.hash(updateData.password || 'default123', 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(password_hash);
    }
    if (updateData.current_role_in_company !== undefined) {
      updates.push(`current_role_in_company = $${paramIndex++}`);
      values.push(updateData.current_role_in_company);
    }
    if (updateData.target_role_in_company !== undefined) {
      updates.push(`target_role_in_company = $${paramIndex++}`);
      values.push(updateData.target_role_in_company);
    }
    if (updateData.preferred_language !== undefined) {
      updates.push(`preferred_language = $${paramIndex++}`);
      values.push(updateData.preferred_language);
    }
    if (updateData.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
    }

    if (updates.length === 0) {
      return await this.findByCompanyAndEmployeeId(companyId, employeeId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(companyId, employeeId);

    const query = `
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE company_id = $${paramIndex++} AND employee_id = $${paramIndex}
      RETURNING *
    `;

    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, values);
    return result.rows[0];
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

  /**
   * Find employee by UUID
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Employee or null
   */
  async findById(employeeId) {
    const query = 'SELECT * FROM employees WHERE id = $1';
    const result = await this.pool.query(query, [employeeId]);
    return result.rows[0] || null;
  }

  /**
   * Update LinkedIn data for an employee
   * @param {string} employeeId - Employee UUID
   * @param {string} linkedinUrl - LinkedIn profile URL
   * @param {Object} linkedinData - LinkedIn profile data (JSON)
   * @param {Object} client - Optional database client
   * @returns {Promise<Object>} Updated employee
   */
  async updateLinkedInData(employeeId, linkedinUrl, linkedinData, client = null) {
    const query = `
      UPDATE employees
      SET linkedin_url = $1,
          linkedin_data = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [
      linkedinUrl,
      JSON.stringify(linkedinData),
      employeeId
    ]);
    return result.rows[0];
  }

  /**
   * Update GitHub data for an employee
   * @param {string} employeeId - Employee UUID
   * @param {string} githubUrl - GitHub profile URL
   * @param {Object} githubData - GitHub profile data (JSON)
   * @param {Object} client - Optional database client
   * @returns {Promise<Object>} Updated employee
   */
  async updateGitHubData(employeeId, githubUrl, githubData, client = null) {
    const query = `
      UPDATE employees
      SET github_url = $1,
          github_data = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [
      githubUrl,
      JSON.stringify(githubData),
      employeeId
    ]);
    return result.rows[0];
  }

  /**
   * Find all employees for a company with their roles and teams
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} Array of employees with roles and teams
   */
  async findByCompanyId(companyId) {
    const query = `
      SELECT 
        e.*,
        COALESCE(
          json_agg(DISTINCT er.role_type) FILTER (WHERE er.role_type IS NOT NULL),
          '[]'::json
        ) as roles,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'team_id', t.team_id, 'team_name', t.team_name)) 
          FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as teams
      FROM employees e
      LEFT JOIN employee_roles er ON e.id = er.employee_id
      LEFT JOIN employee_teams et ON e.id = et.employee_id
      LEFT JOIN teams t ON et.team_id = t.id
      WHERE e.company_id = $1
      GROUP BY e.id
      ORDER BY e.full_name
    `;
    const result = await this.pool.query(query, [companyId]);
    return result.rows.map(row => ({
      ...row,
      roles: row.roles || [],
      teams: row.teams || []
    }));
  }
}

module.exports = EmployeeRepository;

