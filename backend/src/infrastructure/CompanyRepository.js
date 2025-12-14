// Infrastructure Layer - Company Repository
// Handles database operations for companies

const { Pool } = require('pg');
const config = require('../config');

class CompanyRepository {
  constructor() {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL or database connection parameters are not configured. Please set DATABASE_URL or individual DB_* environment variables.');
    }
    
    console.log('Connecting to database:', config.databaseUrl.replace(/:[^:@]+@/, ':****@')); // Log connection string (hide password)
    
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      // Force IPv4 to avoid IPv6 connectivity issues
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10
    });
    
    // Test connection on initialization
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  /**
   * Create a new company (with transaction support)
   * @param {Object} companyData - Company data
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Created company
   */
  async create(companyData, client = null) {
    const {
      company_name,
      industry,
      domain,
      hr_contact_name,
      hr_contact_email,
      hr_contact_role,
      verification_status
    } = companyData;

    const query = `
      INSERT INTO companies (
        company_name,
        industry,
        domain,
        hr_contact_name,
        hr_contact_email,
        hr_contact_role,
        verification_status,
        kpis
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      company_name,
      industry,
      domain,
      hr_contact_name,
      hr_contact_email,
      hr_contact_role,
      verification_status || 'pending', // Use provided status or default to 'pending'
      'Not specified' // Default KPIs - will be updated from CSV
    ];

    try {
      const queryRunner = client || this.pool;
      const result = await queryRunner.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('A company with this domain already exists');
      }
      throw error;
    }
  }

  /**
   * Delete a company by ID (for cleanup on failed registration)
   * @param {string} companyId - Company ID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<void>}
   */
  async deleteById(companyId, client = null) {
    const query = 'DELETE FROM companies WHERE id = $1';
    const queryRunner = client || this.pool;
    await queryRunner.query(query, [companyId]);
  }

  /**
   * Begin a database transaction
   * @returns {Promise<Object>} Database client for transaction
   */
  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit a database transaction
   * @param {Object} client - Database client
   * @returns {Promise<void>}
   */
  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Rollback a database transaction
   * @param {Object} client - Database client
   * @returns {Promise<void>}
   */
  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  /**
   * Find company by domain
   * @param {string} domain - Company domain
   * @returns {Promise<Object|null>} Company or null
   */
  async findByDomain(domain) {
    const query = 'SELECT * FROM companies WHERE domain = $1';
    const result = await this.pool.query(query, [domain]);
    return result.rows[0] || null;
  }

  /**
   * Check if company has completed full registration (has employees from CSV upload)
   * @param {string} companyId - Company ID
   * @returns {Promise<boolean>} True if company has employees (fully registered)
   */
  async hasCompletedRegistration(companyId) {
    const query = 'SELECT COUNT(*) as employee_count FROM employees WHERE company_id = $1';
    const result = await this.pool.query(query, [companyId]);
    const employeeCount = parseInt(result.rows[0].employee_count, 10);
    return employeeCount > 0;
  }

  /**
   * Find fully registered company by domain (only if CSV uploaded and employees exist)
   * @param {string} domain - Company domain
   * @returns {Promise<Object|null>} Fully registered company or null
   */
  async findFullyRegisteredByDomain(domain) {
    const query = `
      SELECT c.* 
      FROM companies c
      WHERE c.domain = $1
      AND EXISTS (
        SELECT 1 FROM employees e WHERE e.company_id = c.id
      )
    `;
    const result = await this.pool.query(query, [domain]);
    return result.rows[0] || null;
  }

  /**
   * Find company by ID
   * @param {string} id - Company ID
   * @returns {Promise<Object|null>} Company or null
   */
  async findById(id) {
    const query = 'SELECT * FROM companies WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update company verification status
   * @param {string} id - Company ID
   * @param {string} status - Verification status
   * @returns {Promise<Object>} Updated company
   */
  async updateVerificationStatus(id, status) {
    const query = `
      UPDATE companies
      SET verification_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, id]);
    return result.rows[0];
  }
}

module.exports = CompanyRepository;

