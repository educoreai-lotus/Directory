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

    console.log('[EmployeeRequestRepository] Creating request with data:', {
      employee_id,
      company_id,
      company_id_type: typeof company_id,
      request_type,
      title
    });

    const query = `
      INSERT INTO employee_requests (
        employee_id, company_id, request_type, title, description, status
      )
      VALUES ($1, $2::uuid, $3, $4, $5, 'pending')
      RETURNING *
    `;

    const values = [employee_id, company_id, request_type, title, description || null];
    const queryRunner = client || this.pool;
    
    try {
      const result = await queryRunner.query(query, values);
      const createdRequest = result.rows[0];
      console.log('[EmployeeRequestRepository] ✅ Request created successfully:', {
        id: createdRequest.id,
        employee_id: createdRequest.employee_id,
        company_id: createdRequest.company_id,
        company_id_type: typeof createdRequest.company_id,
        company_id_string: String(createdRequest.company_id),
        request_type: createdRequest.request_type,
        status: createdRequest.status,
        title: createdRequest.title
      });
      
      // Immediately verify it can be found by ID
      const verifyQuery = 'SELECT * FROM employee_requests WHERE id = $1';
      const verifyResult = await queryRunner.query(verifyQuery, [createdRequest.id]);
      console.log('[EmployeeRequestRepository] Verification by ID:', verifyResult.rows.length > 0 ? 'Found' : 'NOT FOUND');
      
      // Also verify it can be found by company_id (the actual query we'll use)
      const verifyByCompanyQuery = 'SELECT * FROM employee_requests WHERE company_id = $1::uuid AND status = $2';
      const verifyByCompanyResult = await queryRunner.query(verifyByCompanyQuery, [company_id, 'pending']);
      console.log('[EmployeeRequestRepository] Verification by company_id:', {
        found: verifyByCompanyResult.rows.length > 0,
        count: verifyByCompanyResult.rows.length,
        company_id_used: company_id,
        company_id_type: typeof company_id,
        company_id_string: String(company_id)
      });
      
      if (verifyByCompanyResult.rows.length > 0) {
        console.log('[EmployeeRequestRepository] ✅ Request found by company_id query:', {
          id: verifyByCompanyResult.rows[0].id,
          company_id: String(verifyByCompanyResult.rows[0].company_id),
          status: verifyByCompanyResult.rows[0].status
        });
      } else {
        console.error('[EmployeeRequestRepository] ⚠️ WARNING: Request created but NOT found by company_id query!');
        console.error('[EmployeeRequestRepository] This suggests a company_id mismatch or UUID casting issue.');
      }
      
      return createdRequest;
    } catch (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        console.error('[EmployeeRequestRepository] ❌ Table employee_requests does not exist. Please run the migration script.');
        throw new Error('Database table employee_requests does not exist. Please contact your administrator to run the database migration.');
      }
      console.error('[EmployeeRequestRepository] Error creating request:', error);
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
    try {
      console.log(`[EmployeeRequestRepository] Finding requests for company ${companyId} (type: ${typeof companyId}) with status: ${status || 'all'}`);
      
      // First, verify data exists with a direct query (no JOINs)
      const directQuery = status 
        ? 'SELECT * FROM employee_requests WHERE company_id = $1::uuid AND status = $2'
        : 'SELECT * FROM employee_requests WHERE company_id = $1::uuid';
      const directValues = status ? [companyId, status] : [companyId];
      
      console.log(`[EmployeeRequestRepository] Direct query (no JOINs): ${directQuery}`);
      console.log(`[EmployeeRequestRepository] Direct query values:`, directValues);
      
      const directResult = await this.pool.query(directQuery, directValues);
      console.log(`[EmployeeRequestRepository] Direct query found ${directResult.rows.length} requests (no JOINs)`);
      
      if (directResult.rows.length > 0) {
        console.log(`[EmployeeRequestRepository] Sample direct request:`, {
          id: directResult.rows[0].id,
          company_id: directResult.rows[0].company_id,
          company_id_type: typeof directResult.rows[0].company_id,
          company_id_string: String(directResult.rows[0].company_id),
          employee_id: directResult.rows[0].employee_id,
          employee_id_type: typeof directResult.rows[0].employee_id,
          status: directResult.rows[0].status,
          title: directResult.rows[0].title
        });
        
        // Check if employee exists for the JOIN
        const employeeCheckQuery = 'SELECT id, full_name, email FROM employees WHERE id = $1';
        const employeeCheckResult = await this.pool.query(employeeCheckQuery, [directResult.rows[0].employee_id]);
        console.log(`[EmployeeRequestRepository] Employee check for ${directResult.rows[0].employee_id}:`, employeeCheckResult.rows.length > 0 ? 'Found' : 'NOT FOUND');
        if (employeeCheckResult.rows.length > 0) {
          console.log(`[EmployeeRequestRepository] Employee details:`, employeeCheckResult.rows[0]);
        }
      } else {
        console.log(`[EmployeeRequestRepository] ⚠️ No requests found with direct query. Checking if any requests exist in table...`);
        // Check total requests in table
        const totalQuery = 'SELECT COUNT(*) as total FROM employee_requests';
        const totalResult = await this.pool.query(totalQuery);
        console.log(`[EmployeeRequestRepository] Total requests in table: ${totalResult.rows[0].total}`);
        
        // Check requests for this company (any status)
        const companyQuery = status
          ? 'SELECT COUNT(*) as total FROM employee_requests WHERE company_id = $1::uuid AND status = $2'
          : 'SELECT COUNT(*) as total FROM employee_requests WHERE company_id = $1::uuid';
        const companyResult = await this.pool.query(companyQuery, status ? [companyId, status] : [companyId]);
        console.log(`[EmployeeRequestRepository] Total requests for company ${companyId}: ${companyResult.rows[0].total}`);
        
        // Check all company_ids in table for debugging
        const allCompaniesQuery = 'SELECT DISTINCT company_id, COUNT(*) as count FROM employee_requests GROUP BY company_id';
        const allCompaniesResult = await this.pool.query(allCompaniesQuery);
        console.log(`[EmployeeRequestRepository] All company_ids in requests table:`, allCompaniesResult.rows.map(r => ({ company_id: String(r.company_id), count: r.count })));
        
        // Check all pending requests regardless of company
        const allPendingQuery = 'SELECT id, company_id, employee_id, status, title FROM employee_requests WHERE status = $1 LIMIT 10';
        const allPendingResult = await this.pool.query(allPendingQuery, [status || 'pending']);
        console.log(`[EmployeeRequestRepository] All pending requests (first 10):`, allPendingResult.rows.map(r => ({
          id: r.id,
          company_id: String(r.company_id),
          employee_id: String(r.employee_id),
          status: r.status,
          title: r.title
        })));
      }
      
      // Now run the actual query with JOINs
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
        WHERE er.company_id = $1::uuid
      `;

      const values = [companyId];
      if (status) {
        query += ' AND er.status = $2';
        values.push(status);
      }

      query += ' ORDER BY er.requested_at DESC';

      console.log(`[EmployeeRequestRepository] Main query (with JOINs): ${query}`);
      console.log(`[EmployeeRequestRepository] Main query values:`, values);
      
      const result = await this.pool.query(query, values);
      console.log(`[EmployeeRequestRepository] ✅ Main query found ${result.rows.length} requests for company ${companyId} with status ${status || 'all'}`);
      
      if (result.rows.length > 0) {
        console.log(`[EmployeeRequestRepository] Sample request from main query:`, {
          id: result.rows[0].id,
          company_id: result.rows[0].company_id,
          company_id_type: typeof result.rows[0].company_id,
          company_id_string: String(result.rows[0].company_id),
          employee_id: result.rows[0].employee_id,
          employee_name: result.rows[0].employee_name,
          status: result.rows[0].status,
          title: result.rows[0].title
        });
      } else if (directResult.rows.length > 0) {
        console.error(`[EmployeeRequestRepository] ⚠️ WARNING: Direct query found ${directResult.rows.length} requests but JOIN query found 0! This indicates a JOIN issue.`);
        console.error(`[EmployeeRequestRepository] This likely means the employee_id in employee_requests doesn't match any employee.id`);
        console.error(`[EmployeeRequestRepository] Returning direct query results without employee details as fallback`);
        
        // Return direct query results with null employee fields (fallback)
        return directResult.rows.map(row => ({
          ...row,
          employee_name: null,
          employee_email: null,
          employee_identifier: null,
          reviewer_name: null
        }));
      }
      
      return result.rows;
    } catch (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        console.error('[EmployeeRequestRepository] ❌ Table employee_requests does not exist. Please run the migration script.');
        throw new Error('Database table employee_requests does not exist. Please contact your administrator to run the database migration.');
      }
      console.error('[EmployeeRequestRepository] Error fetching company requests:', error);
      console.error('[EmployeeRequestRepository] Error stack:', error.stack);
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

