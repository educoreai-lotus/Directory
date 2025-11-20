// Infrastructure Layer - Employee Request Repository
// Handles database operations for employee requests

const { Pool } = require('pg');
const config = require('../config');

class EmployeeRequestRepository {
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
   * Create a new employee request
   * @param {Object} requestData - Request data
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Created request
   */
  async create(requestData, client = null) {
    const {
      employee_id,
      company_id,
      request_type,
      title,
      description
    } = requestData;

    const query = `
      INSERT INTO employee_requests (
        employee_id, company_id, request_type, title, description, status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;

    const values = [employee_id, company_id, request_type, title, description || null];
    const queryRunner = client || this.pool;
    
    try {
      const result = await queryRunner.query(query, values);
      console.log('[EmployeeRequestRepository] ✅ Request created successfully:', result.rows[0]?.id);
      return result.rows[0];
    } catch (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        console.error('[EmployeeRequestRepository] ❌ Table employee_requests does not exist. Please run the migration script.');
        throw new Error('Database table employee_requests does not exist. Please contact your administrator to run the database migration.');
      }
      throw error;
    }
  }

  /**
   * Find requests by employee ID
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Array>} Array of requests
   */
  async findByEmployeeId(employeeId) {
    const query = `
      SELECT 
        er.*,
        e.full_name as employee_name,
        e.email as employee_email,
        reviewer.full_name as reviewer_name
      FROM employee_requests er
      LEFT JOIN employees e ON er.employee_id = e.id
      LEFT JOIN employees reviewer ON er.reviewed_by = reviewer.id
      WHERE er.employee_id = $1
      ORDER BY er.requested_at DESC
    `;

    try {
      const result = await this.pool.query(query, [employeeId]);
      return result.rows;
    } catch (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        console.error('[EmployeeRequestRepository] ❌ Table employee_requests does not exist. Please run the migration script.');
        throw new Error('Database table employee_requests does not exist. Please contact your administrator to run the database migration.');
      }
      throw error;
    }
  }

  /**
   * Find requests by company ID (for HR/manager view)
   * @param {string} companyId - Company UUID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Array of requests
   */
  async findByCompanyId(companyId, status = null) {
    let query = `
      SELECT 
        er.*,
        e.full_name as employee_name,
        e.email as employee_email,
        e.employee_id as employee_identifier,
        reviewer.full_name as reviewer_name
      FROM employee_requests er
      LEFT JOIN employees e ON er.employee_id = e.id
      LEFT JOIN employees reviewer ON er.reviewed_by = reviewer.id
      WHERE er.company_id = $1
    `;

    const values = [companyId];
    if (status) {
      query += ' AND er.status = $2';
      values.push(status);
    }

    query += ' ORDER BY er.requested_at DESC';

    try {
      const result = await this.pool.query(query, values);
      console.log(`[EmployeeRequestRepository] ✅ Found ${result.rows.length} requests for company ${companyId} with status ${status || 'all'}`);
      return result.rows;
    } catch (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        console.error('[EmployeeRequestRepository] ❌ Table employee_requests does not exist. Please run the migration script.');
        throw new Error('Database table employee_requests does not exist. Please contact your administrator to run the database migration.');
      }
      console.error('[EmployeeRequestRepository] Error fetching company requests:', error);
      throw error;
    }
  }

  /**
   * Find request by ID
   * @param {string} requestId - Request UUID
   * @returns {Promise<Object|null>} Request or null
   */
  async findById(requestId) {
    const query = `
      SELECT 
        er.*,
        e.full_name as employee_name,
        e.email as employee_email,
        reviewer.full_name as reviewer_name
      FROM employee_requests er
      LEFT JOIN employees e ON er.employee_id = e.id
      LEFT JOIN employees reviewer ON er.reviewed_by = reviewer.id
      WHERE er.id = $1
    `;

    const result = await this.pool.query(query, [requestId]);
    return result.rows[0] || null;
  }

  /**
   * Update request status
   * @param {string} requestId - Request UUID
   * @param {string} status - New status
   * @param {string} reviewedBy - Reviewer employee UUID
   * @param {string} rejectionReason - Optional rejection reason
   * @param {string} responseNotes - Optional response notes
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<Object>} Updated request
   */
  async updateStatus(requestId, status, reviewedBy = null, rejectionReason = null, responseNotes = null, client = null) {
    const query = `
      UPDATE employee_requests
      SET 
        status = $1,
        reviewed_by = $2,
        reviewed_at = CURRENT_TIMESTAMP,
        rejection_reason = $3,
        response_notes = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const values = [status, reviewedBy, rejectionReason, responseNotes, requestId];
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete request (soft delete by setting status to 'cancelled' or hard delete)
   * @param {string} requestId - Request UUID
   * @param {Object} client - Optional database client for transaction
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(requestId, client = null) {
    const query = 'DELETE FROM employee_requests WHERE id = $1';
    const queryRunner = client || this.pool;
    const result = await queryRunner.query(query, [requestId]);
    return result.rowCount > 0;
  }
}

module.exports = EmployeeRequestRepository;

