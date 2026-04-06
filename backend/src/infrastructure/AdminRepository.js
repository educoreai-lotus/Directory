// Infrastructure Layer - Admin Repository
// Handles database operations for directory admins

const { Pool } = require('pg');
const config = require('../config');
const bcrypt = require('bcrypt');

class AdminRepository {
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
   * Find admin by email
   * @param {string} email - Admin email
   * @returns {Promise<Object|null>} Admin or null
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM directory_admins WHERE email = $1 AND is_active = TRUE';
    const result = await this.pool.query(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  }

  /**
   * Find admin by ID
   * @param {string} id - Admin UUID
   * @returns {Promise<Object|null>} Admin or null
   */
  async findById(id) {
    const query = 'SELECT * FROM directory_admins WHERE id = $1 AND is_active = TRUE';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create a new admin (for initial setup)
   * @param {Object} adminData - Admin data
   * @returns {Promise<Object>} Created admin
   */
  async create(adminData) {
    const { email, password, full_name } = adminData;
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO directory_admins (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'DIRECTORY_ADMIN')
      RETURNING id, email, full_name, role, created_at
    `;
    
    const result = await this.pool.query(query, [
      email.toLowerCase(),
      passwordHash,
      full_name
    ]);
    
    return result.rows[0];
  }
}

module.exports = AdminRepository;

