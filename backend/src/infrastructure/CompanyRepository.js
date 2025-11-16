// Infrastructure Layer - Company Repository
// Handles database operations for companies

const { Pool } = require('pg');
const config = require('../config');

class CompanyRepository {
  constructor() {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL or database connection parameters are not configured. Please set DATABASE_URL or individual DB_* environment variables.');
    }
    
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false
    });
  }

  /**
   * Create a new company
   * @param {Object} companyData - Company data
   * @returns {Promise<Object>} Created company
   */
  async create(companyData) {
    const {
      company_name,
      industry,
      domain,
      hr_contact_name,
      hr_contact_email,
      hr_contact_role
    } = companyData;

    const query = `
      INSERT INTO companies (
        company_name,
        industry,
        domain,
        hr_contact_name,
        hr_contact_email,
        hr_contact_role,
        verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      company_name,
      industry,
      domain,
      hr_contact_name,
      hr_contact_email,
      hr_contact_role,
      'pending' // Default verification status
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('A company with this domain already exists');
      }
      throw error;
    }
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

