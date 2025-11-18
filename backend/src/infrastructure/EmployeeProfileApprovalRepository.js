// Infrastructure Layer - Employee Profile Approval Repository
// Handles database operations for employee profile approval requests

const { Pool } = require('pg');
const config = require('../config');

class EmployeeProfileApprovalRepository {
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
   * Create a new approval request
   * @param {Object} approvalData - Approval request data
   * @returns {Promise<Object>} Created approval request
   */
  async createApprovalRequest(approvalData) {
    const {
      employee_id,
      company_id,
      enriched_at
    } = approvalData;

    const query = `
      INSERT INTO employee_profile_approvals (
        employee_id,
        company_id,
        status,
        enriched_at
      )
      VALUES ($1, $2, 'pending', $3)
      ON CONFLICT (employee_id) DO UPDATE SET
        status = 'pending',
        enriched_at = EXCLUDED.enriched_at,
        requested_at = CURRENT_TIMESTAMP,
        reviewed_at = NULL,
        reviewed_by = NULL,
        rejection_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      employee_id,
      company_id,
      enriched_at || new Date()
    ]);

    return result.rows[0];
  }

  /**
   * Find all pending approvals for a company
   * @param {string} companyId - Company UUID
   * @returns {Promise<Array>} Array of pending approval requests with employee data
   */
  async findPendingByCompanyId(companyId) {
    const query = `
      SELECT 
        apa.*,
        e.id as employee_uuid,
        e.employee_id,
        e.full_name,
        e.email,
        d.department_name as department,
        t.team_name as team,
        e.current_role_in_company,
        e.enrichment_completed_at
      FROM employee_profile_approvals apa
      INNER JOIN employees e ON apa.employee_id = e.id
      LEFT JOIN employee_teams et ON e.id = et.employee_id
      LEFT JOIN teams t ON et.team_id = t.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE apa.company_id = $1 
        AND apa.status = 'pending'
      ORDER BY apa.requested_at DESC
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Approve a profile
   * @param {string} approvalId - Approval request UUID
   * @param {string} reviewedBy - HR employee UUID
   * @returns {Promise<Object>} Updated approval request
   */
  async approveProfile(approvalId, reviewedBy) {
    const query = `
      UPDATE employee_profile_approvals
      SET 
        status = 'approved',
        reviewed_at = CURRENT_TIMESTAMP,
        reviewed_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [approvalId, reviewedBy]);
    return result.rows[0];
  }

  /**
   * Reject a profile
   * @param {string} approvalId - Approval request UUID
   * @param {string} reviewedBy - HR employee UUID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated approval request
   */
  async rejectProfile(approvalId, reviewedBy, reason) {
    const query = `
      UPDATE employee_profile_approvals
      SET 
        status = 'rejected',
        reviewed_at = CURRENT_TIMESTAMP,
        reviewed_by = $2,
        rejection_reason = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [approvalId, reviewedBy, reason]);
    return result.rows[0];
  }

  /**
   * Find approval request by employee ID
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>} Approval request or null
   */
  async findByEmployeeId(employeeId) {
    const query = `
      SELECT * FROM employee_profile_approvals
      WHERE employee_id = $1
      ORDER BY requested_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [employeeId]);
    return result.rows[0] || null;
  }

  /**
   * Find approval request by ID
   * @param {string} approvalId - Approval request UUID
   * @returns {Promise<Object|null>} Approval request or null
   */
  async findById(approvalId) {
    const query = `
      SELECT 
        apa.*,
        e.id as employee_uuid,
        e.employee_id,
        e.full_name,
        e.email,
        d.department_name as department,
        t.team_name as team,
        e.current_role_in_company
      FROM employee_profile_approvals apa
      INNER JOIN employees e ON apa.employee_id = e.id
      LEFT JOIN employee_teams et ON e.id = et.employee_id
      LEFT JOIN teams t ON et.team_id = t.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE apa.id = $1
    `;

    const result = await this.pool.query(query, [approvalId]);
    return result.rows[0] || null;
  }
}

module.exports = EmployeeProfileApprovalRepository;

