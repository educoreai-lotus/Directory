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

    // Normalize email to lowercase
    const normalizedEmail = email ? email.toLowerCase().trim() : email;

    // Hash password (use default if not provided)
    // CRITICAL: Password is required for employees, but we allow default for testing
    const passwordToHash = password && password.trim().length > 0 ? password : 'default123';
    if (!passwordToHash || passwordToHash.trim().length === 0) {
      throw new Error('Password is required for employee creation');
    }
    const password_hash = await bcrypt.hash(passwordToHash, 10);
    console.log(`[EmployeeRepository] Creating employee ${email} with password hash (length: ${password_hash.length})`);

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
      normalizedEmail,
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
    // Normalize email for case-insensitive lookup
    const normalizedEmail = email ? email.toLowerCase().trim() : email;
    const query = 'SELECT * FROM employees WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))';
    const result = await this.pool.query(query, [normalizedEmail]);
    return result.rows[0] || null;
  }

  /**
   * Find employee by email and company
   * @param {string} email - Email address
   * @param {string} companyId - Company ID
   * @returns {Promise<Object|null>} Employee or null
   */
  async findByEmailAndCompany(email, companyId) {
    // Normalize email for case-insensitive lookup
    const normalizedEmail = email ? email.toLowerCase().trim() : email;
    const query = 'SELECT * FROM employees WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND company_id = $2';
    const result = await this.pool.query(query, [normalizedEmail, companyId]);
    return result.rows[0] || null;
  }

  /**
   * Check if email exists in any company
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} Employee with company_id or null
   */
  async findEmailOwner(email) {
    // Normalize email for case-insensitive lookup
    const normalizedEmail = email ? email.toLowerCase().trim() : email;
    const query = 'SELECT id, email, company_id, full_name FROM employees WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))';
    const result = await this.pool.query(query, [normalizedEmail]);
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

    // Normalize email to lowercase
    const normalizedEmail = email ? email.toLowerCase().trim() : email;

    // Check if email is reserved for Directory Admin
    const CSVValidator = require('../infrastructure/CSVValidator');
    const csvValidator = new CSVValidator();
    if (csvValidator.isReservedAdminEmail(normalizedEmail)) {
      throw new Error(`Email "${normalizedEmail}" is reserved for Directory Admin and cannot be used. Please use a different email address.`);
    }

    const queryRunner = client || this.pool;

    // Check if email already exists
    const existingEmailOwner = await this.findEmailOwner(normalizedEmail);
    
    if (existingEmailOwner) {
      // Email exists - check if it's for the same company
      if (existingEmailOwner.company_id === company_id) {
        // Same company - UPDATE the employee
        // Only update password if it's provided (not null/undefined/empty)
        const updateData = {
          employee_id,
          full_name,
          current_role_in_company,
          target_role_in_company,
          preferred_language,
          status
        };
        // Only include password in update if it's provided
        if (password && password.trim().length > 0) {
          updateData.password = password;
        }
        return await this.updateByEmail(normalizedEmail, company_id, updateData, client);
      } else {
        // Different company - REJECT
        throw new Error(`Email address "${normalizedEmail}" is already registered to another company. Each email must be unique across all companies.`);
      }
    }

    // Email doesn't exist - check if employee_id exists for this company
    const existingEmployee = await this.findByCompanyAndEmployeeId(company_id, employee_id);
    
    if (existingEmployee) {
      // Employee ID exists - UPDATE
      // Only update password if it's provided (not null/undefined/empty)
      const updateData = {
        full_name,
        email: normalizedEmail,
        current_role_in_company,
        target_role_in_company,
        preferred_language,
        status
      };
      // Only include password in update if it's provided
      if (password && password.trim().length > 0) {
        updateData.password = password;
      }
      return await this.updateByEmployeeId(company_id, employee_id, updateData, client);
    }

    // Neither email nor employee_id exists - INSERT
    return await this.create({ ...employeeData, email: normalizedEmail }, client);
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
    // Normalize email for case-insensitive lookup
    const normalizedEmail = email ? email.toLowerCase().trim() : email;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Normalize email if it's being updated
    if (updateData.email !== undefined) {
      const normalizedUpdateEmail = updateData.email ? updateData.email.toLowerCase().trim() : updateData.email;
      updates.push(`email = $${paramIndex++}`);
      values.push(normalizedUpdateEmail);
    }

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
      return await this.findByEmailAndCompany(normalizedEmail, companyId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(normalizedEmail, companyId);

    const query = `
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE LOWER(TRIM(email)) = LOWER(TRIM($${paramIndex++})) AND company_id = $${paramIndex}
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
    // First check if the role already exists
    const checkQuery = `
      SELECT * FROM employee_roles 
      WHERE employee_id = $1 AND role_type = $2
    `;
    const queryRunner = client || this.pool;
    const checkResult = await queryRunner.query(checkQuery, [employeeId, roleType]);
    
    if (checkResult.rows.length > 0) {
      // Role already exists, return it
      console.log(`[EmployeeRepository] Role ${roleType} already exists for employee ${employeeId}`);
      return checkResult.rows[0];
    }
    
    // Role doesn't exist, insert it
    const insertQuery = `
      INSERT INTO employee_roles (employee_id, role_type)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await queryRunner.query(insertQuery, [employeeId, roleType]);
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
   * Get project summaries for an employee
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Array>} Array of project summaries
   */
  async getProjectSummaries(employeeId) {
    const query = `
      SELECT repository_name, repository_url, summary
      FROM employee_project_summaries
      WHERE employee_id = $1
      ORDER BY repository_name
    `;
    const result = await this.pool.query(query, [employeeId]);
    return result.rows;
  }

  /**
   * Update employee profile status
   * @param {string} employeeId - Employee UUID
   * @param {string} status - Profile status ('basic', 'enriched', 'approved', 'rejected')
   * @param {Object} client - Optional database client
   * @returns {Promise<Object>} Updated employee
   */
  async updateProfileStatus(employeeId, status, client = null) {
    // Defensive check: ensure we have a valid database client
    const queryRunner = client || this.pool;
    
    if (!queryRunner || typeof queryRunner.query !== 'function') {
      console.error('[EmployeeRepository] ⚠️  Invalid database client provided to updateProfileStatus');
      console.error('[EmployeeRepository] queryRunner type:', typeof queryRunner);
      console.error('[EmployeeRepository] this.pool type:', typeof this.pool);
      throw new Error('Database client is not properly initialized');
    }
    
    // Validate status
    const validStatuses = ['basic', 'enrichment_pending', 'enriched', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid profile status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const query = `
      UPDATE employees
      SET profile_status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await queryRunner.query(query, [status, employeeId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }
    
    console.log(`[EmployeeRepository] ✅ Updated profile status for employee ${employeeId} to: ${status}`);
    return result.rows[0];
  }

  /**
   * Get trainer settings for an employee
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Trainer settings or null
   */
  async getTrainerSettings(employeeId) {
    const query = 'SELECT * FROM trainer_settings WHERE employee_id = $1';
    const result = await this.pool.query(query, [employeeId]);
    return result.rows[0] || null;
  }

  /**
   * Update trainer settings
   * @param {string} employeeId - Employee UUID
   * @param {boolean} aiEnabled - AI enabled flag
   * @param {boolean} publicPublishEnable - Public publish flag
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Updated settings
   */
  async updateTrainerSettings(employeeId, aiEnabled, publicPublishEnable, client = null) {
    const query = `
      UPDATE trainer_settings
      SET ai_enabled = $1,
          public_publish_enable = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $3
      RETURNING *
    `;
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [aiEnabled, publicPublishEnable, employeeId]);
    
    if (result.rows.length === 0) {
      // If no settings exist, create them
      return await this.createTrainerSettings(employeeId, aiEnabled, publicPublishEnable, client);
    }
    
    return result.rows[0];
  }

  /**
   * Check if employee is a trainer
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<boolean>} True if employee has TRAINER role
   */
  async isTrainer(employeeId) {
    const query = `
      SELECT COUNT(*) as count
      FROM employee_roles
      WHERE employee_id = $1 AND role_type = 'TRAINER'
    `;
    const result = await this.pool.query(query, [employeeId]);
    return parseInt(result.rows[0].count) > 0;
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
    // Extract profile photo URL from LinkedIn data
    // Priority: picture (OpenID Connect) > profilePicture.displayImage (legacy) > profilePicture (string)
    // LinkedIn photo always takes priority (overwrites existing GitHub photo if any)
    let profilePhotoUrl = null;
    
    if (linkedinData.picture) {
      // OpenID Connect endpoint returns picture as URL string
      profilePhotoUrl = linkedinData.picture;
      console.log(`[EmployeeRepository] ✅ Extracted LinkedIn photo from 'picture' field: ${profilePhotoUrl.substring(0, 50)}...`);
    } else if (linkedinData.profilePicture) {
      // Legacy endpoint may return profilePicture as object or string
      if (typeof linkedinData.profilePicture === 'string') {
        profilePhotoUrl = linkedinData.profilePicture;
        console.log(`[EmployeeRepository] ✅ Extracted LinkedIn photo from 'profilePicture' (string): ${profilePhotoUrl.substring(0, 50)}...`);
      } else if (linkedinData.profilePicture.displayImage) {
        // Object with displayImage property
        profilePhotoUrl = linkedinData.profilePicture.displayImage;
        console.log(`[EmployeeRepository] ✅ Extracted LinkedIn photo from 'profilePicture.displayImage': ${profilePhotoUrl.substring(0, 50)}...`);
      } else if (linkedinData.profilePicture.url) {
        // Object with url property
        profilePhotoUrl = linkedinData.profilePicture.url;
        console.log(`[EmployeeRepository] ✅ Extracted LinkedIn photo from 'profilePicture.url': ${profilePhotoUrl.substring(0, 50)}...`);
      }
    } else {
      console.log('[EmployeeRepository] ⚠️  No LinkedIn photo found in profile data');
    }

    // LinkedIn photo always takes priority - overwrite existing photo
    const query = `
      UPDATE employees
      SET linkedin_url = $1,
          linkedin_data = $2,
          profile_photo_url = COALESCE($4, profile_photo_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [
      linkedinUrl,
      JSON.stringify(linkedinData),
      employeeId,
      profilePhotoUrl
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
    // Extract profile photo URL from GitHub data (avatar_url)
    // GitHub photo is only used as fallback if LinkedIn photo doesn't exist
    // COALESCE(profile_photo_url, $4) means: keep existing photo if it exists, otherwise use GitHub photo
    const profilePhotoUrl = githubData.avatar_url || null;
    
    if (profilePhotoUrl) {
      console.log(`[EmployeeRepository] 📸 GitHub photo available: ${profilePhotoUrl.substring(0, 50)}... (will be used only if LinkedIn photo doesn't exist)`);
    } else {
      console.log('[EmployeeRepository] ⚠️  No GitHub photo found in profile data');
    }

    const query = `
      UPDATE employees
      SET github_url = $1,
          github_data = $2,
          profile_photo_url = COALESCE(profile_photo_url, $4),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const queryRunner = client || this.pool;
    
    // Validate queryRunner has query method
    if (!queryRunner || typeof queryRunner.query !== 'function') {
      console.error('[EmployeeRepository] ❌ Invalid queryRunner:', {
        hasQueryRunner: !!queryRunner,
        queryRunnerType: typeof queryRunner,
        hasQueryMethod: queryRunner ? typeof queryRunner.query : 'N/A',
        poolType: typeof this.pool,
        poolHasQuery: this.pool ? typeof this.pool.query : 'N/A'
      });
      throw new Error('Database query runner is not properly initialized. queryRunner.query is not a function.');
    }
    
    const result = await queryRunner.query(query, [
      githubUrl,
      JSON.stringify(githubData),
      employeeId,
      profilePhotoUrl
    ]);
    return result.rows[0];
  }

  /**
   * Update employee profile with enrichment data (bio and project summaries)
   * @param {string} employeeId - Employee UUID
   * @param {string} bio - AI-generated bio
   * @param {Array} projectSummaries - Array of project summaries
   * @param {Object} client - Optional database client
   * @returns {Promise<Object>} Updated employee
   */
  async updateEnrichment(employeeId, bio, projectSummaries, valueProposition = null, markAsCompleted = true, client = null) {
    const queryRunner = client || this.pool;
    
    // Validate queryRunner has query method
    if (!queryRunner || typeof queryRunner.query !== 'function') {
      console.error('[EmployeeRepository] ❌ Invalid queryRunner in updateEnrichment:', {
        hasQueryRunner: !!queryRunner,
        queryRunnerType: typeof queryRunner,
        hasQueryMethod: queryRunner ? typeof queryRunner.query : 'N/A',
        poolType: typeof this.pool,
        poolHasQuery: this.pool ? typeof this.pool.query : 'N/A',
        clientProvided: !!client
      });
      throw new Error('Database query runner is not properly initialized. queryRunner.query is not a function.');
    }
    
    // Start transaction if using client
    const needsTransaction = !client;
    if (needsTransaction) {
      await queryRunner.query('BEGIN');
    }

    try {
      // Update employee bio, value proposition, enrichment flags, and profile status
      // State transition: basic/enrichment_pending -> enriched
      // Only mark as completed if Gemini succeeded (markAsCompleted = true)
      const updateQuery = markAsCompleted ? `
        UPDATE employees
        SET bio = $1,
            value_proposition = $3,
            enrichment_completed = TRUE,
            enrichment_completed_at = CURRENT_TIMESTAMP,
            profile_status = 'enriched',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      ` : `
        UPDATE employees
        SET bio = $1,
            value_proposition = $3,
            profile_status = 'enriched',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const updateResult = await queryRunner.query(updateQuery, [bio, employeeId, valueProposition]);
      const updatedEmployee = updateResult.rows[0];
      
      if (!markAsCompleted) {
        console.log('[EmployeeRepository] ⚠️  Enrichment updated but NOT marked as completed (mock data used)');
      }

      // Delete existing project summaries
      await queryRunner.query(
        'DELETE FROM employee_project_summaries WHERE employee_id = $1',
        [employeeId]
      );

      // Insert new project summaries
      if (projectSummaries && projectSummaries.length > 0) {
        // Use parameterized query to prevent SQL injection
        for (const ps of projectSummaries) {
          await queryRunner.query(
            `INSERT INTO employee_project_summaries (employee_id, repository_name, repository_url, summary)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (employee_id, repository_name) DO UPDATE SET
               repository_url = EXCLUDED.repository_url,
               summary = EXCLUDED.summary`,
            [
              employeeId,
              ps.repository_name,
              ps.repository_url || null,
              ps.summary
            ]
          );
        }
      }

      if (needsTransaction) {
        await queryRunner.query('COMMIT');
      }

      return updatedEmployee;
    } catch (error) {
      if (needsTransaction) {
        await queryRunner.query('ROLLBACK');
      }
      throw error;
    }
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

