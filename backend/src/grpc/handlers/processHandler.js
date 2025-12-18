// GRPC Process Handler for Directory Service
// Handles both Real-time queries and Batch sync requests from Coordinator for RAG Service

const CompanyRepository = require('../../infrastructure/CompanyRepository');
const EmployeeRepository = require('../../infrastructure/EmployeeRepository');
const DepartmentRepository = require('../../infrastructure/DepartmentRepository');
const TeamRepository = require('../../infrastructure/TeamRepository');
const config = require('../../config');

/**
 * Process RPC Handler
 * Handles both Real-time queries and Batch sync requests
 */
class ProcessHandler {
  constructor() {
    this.companyRepository = new CompanyRepository();
    this.employeeRepository = new EmployeeRepository();
    this.departmentRepository = new DepartmentRepository();
    this.teamRepository = new TeamRepository();
  }

  /**
   * Handle Process RPC call
   * @param {Object} call - GRPC call object
   * @param {Function} callback - Response callback
   */
  async handle(call, callback) {
    const startTime = Date.now();
    let envelope;

    try {
      // 1. Parse envelope from request
      const envelopeJson = call.request.envelope_json;
      envelope = JSON.parse(envelopeJson);

      const {
        request_id,
        tenant_id, // Maps to company_id in Directory
        user_id,
        target_service,
        payload,
        metadata
      } = envelope;

      console.log('[GRPC Process] Request received', {
        service: config.coordinator.serviceName || 'directory-service',
        request_id,
        tenant_id,
        user_id,
        target_service,
        has_payload: !!payload,
        sync_type: payload?.sync_type
      });

      // 2. Detect mode: Real-time or Batch Sync
      const isBatchSync = payload?.sync_type === 'batch';

      let result;

      if (isBatchSync) {
        // ═══════════════════════════════════════
        // MODE 1: BATCH SYNC
        // ═══════════════════════════════════════
        console.log('[GRPC Process - BATCH SYNC] Processing batch request', {
          service: config.coordinator.serviceName,
          request_id,
          page: payload.page,
          limit: payload.limit,
          since: payload.since
        });

        result = await this.handleBatchSync(envelope);

      } else {
        // ═══════════════════════════════════════
        // MODE 2: REAL-TIME QUERY
        // ═══════════════════════════════════════
        console.log('[GRPC Process - REAL-TIME] Processing query', {
          service: config.coordinator.serviceName,
          request_id,
          query: payload?.query,
          context: payload?.context
        });

        result = await this.handleRealtimeQuery(envelope);
      }

      // 3. Build response envelope
      const responseEnvelope = {
        request_id,
        success: true,
        data: result.data,  // ⚠️ CRITICAL: Must be array or {items: []}
        metadata: {
          ...(result.metadata || {}),
          processed_at: new Date().toISOString(),
          service: config.coordinator.serviceName || 'directory-service',
          duration_ms: Date.now() - startTime,
          mode: isBatchSync ? 'batch' : 'realtime'
        }
      };

      console.log('[GRPC Process] Request completed', {
        service: config.coordinator.serviceName,
        request_id,
        duration_ms: Date.now() - startTime,
        mode: isBatchSync ? 'batch' : 'realtime',
        success: true,
        data_count: Array.isArray(result.data) ? result.data.length : (result.data?.items?.length || 0)
      });

      // 4. Return ProcessResponse
      callback(null, {
        success: true,
        envelope_json: JSON.stringify(responseEnvelope),
        error: ''
      });

    } catch (error) {
      console.error('[GRPC Process] Request failed', {
        service: config.coordinator.serviceName,
        request_id: envelope?.request_id,
        error: error.message,
        stack: error.stack,
        duration_ms: Date.now() - startTime
      });

      // Return error response
      callback(null, {
        success: false,
        envelope_json: JSON.stringify({
          request_id: envelope?.request_id,
          success: false,
          error: error.message,
          metadata: {
            processed_at: new Date().toISOString(),
            service: config.coordinator.serviceName || 'directory-service'
          }
        }),
        error: error.message
      });
    }
  }

  /**
   * Handle Batch Sync request
   * Returns organizational data (companies, employees, departments, teams) with pagination
   * @param {Object} envelope - Request envelope
   * @returns {Promise<Object>} Result with data
   */
  async handleBatchSync(envelope) {
    const {
      tenant_id, // Maps to company_id in Directory
      payload
    } = envelope;

    const {
      page = 1,
      limit = 1000,
      since
    } = payload;

    console.log('[Batch Sync] Fetching Directory data', {
      service: config.coordinator.serviceName,
      tenant_id,
      page,
      limit,
      since
    });

    const offset = (page - 1) * limit;
    
    // Query all organizational data for the company (tenant_id = company_id)
    const data = await this.queryDatabase({
      company_id: tenant_id,
      limit,
      offset,
      since
    });

    // Get total count
    const totalCount = await this.getTotalCount({
      company_id: tenant_id,
      since
    });
    const hasMore = (page * limit) < totalCount;

    console.log('[Batch Sync] Data fetched', {
      service: config.coordinator.serviceName,
      tenant_id,
      page,
      records: data.length,
      total: totalCount,
      has_more: hasMore
    });

    // ⚠️ CRITICAL: Return format MUST be { items: [...] }
    return {
      data: {
        items: data,        // ⭐ Your actual data array
        page,
        limit,
        total: totalCount
      },
      metadata: {
        has_more: hasMore,
        page,
        total_pages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Handle Real-time Query
   * Returns specific organizational data based on query
   * @param {Object} envelope - Request envelope
   * @returns {Promise<Object>} Result with data
   */
  async handleRealtimeQuery(envelope) {
    const {
      tenant_id, // Maps to company_id in Directory
      user_id,
      payload
    } = envelope;

    const query = payload?.query || '';
    const queryLower = query.toLowerCase();

    console.log('[Real-time Query] Processing', {
      service: config.coordinator.serviceName,
      tenant_id,
      user_id,
      query
    });

    let data = [];

    // Parse query and return appropriate data
    if (queryLower.includes('company') || queryLower.includes('companies')) {
      // Return company information
      if (tenant_id) {
        const company = await this.companyRepository.findById(tenant_id);
        data = company ? [this.formatCompanyData(company)] : [];
      } else {
        // Return all companies (if no tenant_id specified)
        data = await this.getAllCompanies();
      }
      
    } else if (queryLower.includes('employee') || queryLower.includes('employees')) {
      // Return employee information
      if (tenant_id) {
        if (queryLower.includes('id') || queryLower.includes('show')) {
          // Get specific employee by ID
          const employeeId = this.extractId(query);
          if (employeeId) {
            const employee = await this.employeeRepository.findById(employeeId);
            data = employee ? [this.formatEmployeeData(employee)] : [];
          }
        } else {
          // Get recent/active employees
          data = await this.getRecentEmployees(tenant_id, user_id);
        }
      }
      
    } else if (queryLower.includes('department') || queryLower.includes('departments')) {
      // Return department information
      if (tenant_id) {
        const departments = await this.departmentRepository.findByCompanyId(tenant_id);
        data = departments.map(dept => this.formatDepartmentData(dept));
      }
      
    } else if (queryLower.includes('team') || queryLower.includes('teams')) {
      // Return team information
      if (tenant_id) {
        const teams = await this.teamRepository.findByCompanyId(tenant_id);
        data = teams.map(team => this.formatTeamData(team));
      }
      
    } else {
      // Default: Return organizational overview
      data = await this.getDefaultData(tenant_id, user_id);
    }

    console.log('[Real-time Query] Data fetched', {
      service: config.coordinator.serviceName,
      tenant_id,
      user_id,
      records: Array.isArray(data) ? data.length : 1
    });

    // ⚠️ CRITICAL: Return data as direct array (not wrapped!)
    return {
      data: data,  // ⭐ Direct array of items
      metadata: {
        query_type: this.detectQueryType(query)
      }
    };
  }

  /**
   * Query database with pagination (for Batch Sync)
   * Returns all organizational data for a company
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of data items
   */
  async queryDatabase({ company_id, limit, offset, since }) {
    const results = [];

    try {
      // 1. Get company data
      if (company_id) {
        const company = await this.companyRepository.findById(company_id);
        if (company) {
          results.push({
            type: 'company',
            ...this.formatCompanyData(company)
          });
        }
      }

      // 2. Get departments
      if (company_id) {
        const departments = await this.departmentRepository.findByCompanyId(company_id);
        departments.forEach(dept => {
          results.push({
            type: 'department',
            ...this.formatDepartmentData(dept)
          });
        });
      }

      // 3. Get teams
      if (company_id) {
        const teams = await this.teamRepository.findByCompanyId(company_id);
        teams.forEach(team => {
          results.push({
            type: 'team',
            ...this.formatTeamData(team)
          });
        });
      }

      // 4. Get employees (with pagination and since filter)
      if (company_id) {
        let employeeQuery = `
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
        `;
        
        const queryParams = [company_id];
        
        if (since) {
          employeeQuery += ` AND e.updated_at >= $2`;
          queryParams.push(since);
        }
        
        employeeQuery += ` GROUP BY e.id ORDER BY e.updated_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);
        
        const employeeResult = await this.employeeRepository.pool.query(employeeQuery, queryParams);
        employeeResult.rows.forEach(emp => {
          results.push({
            type: 'employee',
            ...this.formatEmployeeData(emp)
          });
        });
      }

      // Apply pagination to combined results
      const paginatedResults = results.slice(offset, offset + limit);

      return paginatedResults;

    } catch (error) {
      console.error('[queryDatabase] Error querying database', {
        service: config.coordinator.serviceName,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get total count (for Batch Sync pagination)
   * @param {Object} params - Query parameters
   * @returns {Promise<number>} Total count
   */
  async getTotalCount({ company_id, since }) {
    try {
      const queryParams = [company_id];
      let employeeFilter = '';
      
      if (since) {
        employeeFilter = ' AND e.updated_at >= $2';
        queryParams.push(since);
      }
      
      // Count all organizational entities for the company
      const countQuery = `
        SELECT 
          (SELECT COUNT(*) FROM companies WHERE id = $1) +
          (SELECT COUNT(*) FROM departments WHERE company_id = $1) +
          (SELECT COUNT(*) FROM teams WHERE company_id = $1) +
          (SELECT COUNT(*) FROM employees e WHERE e.company_id = $1${employeeFilter}) as total
      `;
      
      const result = await this.companyRepository.pool.query(countQuery, queryParams);
      return parseInt(result.rows[0].total, 10);
    } catch (error) {
      console.error('[getTotalCount] Error getting count', {
        service: config.coordinator.serviceName,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get recent employees (for Real-time queries)
   * @param {string} company_id - Company ID
   * @param {string} user_id - User ID (optional)
   * @returns {Promise<Array>} Array of employees
   */
  async getRecentEmployees(company_id, user_id) {
    try {
      const employees = await this.employeeRepository.findByCompanyId(company_id);
      // Return most recent 20 employees
      return employees
        .slice(0, 20)
        .map(emp => this.formatEmployeeData(emp));
    } catch (error) {
      console.error('[getRecentEmployees] Error', {
        service: config.coordinator.serviceName,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get all companies (for Real-time queries when no tenant_id)
   * @returns {Promise<Array>} Array of companies
   */
  async getAllCompanies() {
    try {
      const query = 'SELECT * FROM companies ORDER BY company_name LIMIT 50';
      const result = await this.companyRepository.pool.query(query);
      return result.rows.map(company => this.formatCompanyData(company));
    } catch (error) {
      console.error('[getAllCompanies] Error', {
        service: config.coordinator.serviceName,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get default data (for Real-time queries)
   * Returns organizational overview
   * @param {string} company_id - Company ID
   * @param {string} user_id - User ID (optional)
   * @returns {Promise<Array>} Array of organizational data
   */
  async getDefaultData(company_id, user_id) {
    const data = [];
    
    try {
      if (company_id) {
        // Return company overview
        const company = await this.companyRepository.findById(company_id);
        if (company) {
          data.push(this.formatCompanyData(company));
        }
        
        // Return summary counts
        const [departments, teams, employees] = await Promise.all([
          this.departmentRepository.findByCompanyId(company_id),
          this.teamRepository.findByCompanyId(company_id),
          this.employeeRepository.findByCompanyId(company_id)
        ]);
        
        data.push({
          type: 'organizational_summary',
          company_id: company_id,
          departments_count: departments.length,
          teams_count: teams.length,
          employees_count: employees.length
        });
      }
    } catch (error) {
      console.error('[getDefaultData] Error', {
        service: config.coordinator.serviceName,
        error: error.message
      });
    }
    
    return data;
  }

  /**
   * Format company data for response
   * @param {Object} company - Company record
   * @returns {Object} Formatted company data
   */
  formatCompanyData(company) {
    return {
      company_id: company.id,
      company_name: company.company_name,
      industry: company.industry,
      domain: company.domain,
      hr_contact_name: company.hr_contact_name,
      hr_contact_email: company.hr_contact_email,
      hr_contact_role: company.hr_contact_role,
      verification_status: company.verification_status,
      approval_policy: company.approval_policy,
      kpis: company.kpis,
      logo_url: company.logo_url,
      passing_grade: company.passing_grade,
      max_attempts: company.max_attempts,
      exercises_limited: company.exercises_limited,
      num_of_exercises: company.num_of_exercises,
      created_at: company.created_at,
      updated_at: company.updated_at
    };
  }

  /**
   * Format employee data for response
   * @param {Object} employee - Employee record
   * @returns {Object} Formatted employee data
   */
  formatEmployeeData(employee) {
    return {
      employee_id: employee.id,
      company_id: employee.company_id,
      employee_identifier: employee.employee_id, // CSV employee_id
      full_name: employee.full_name,
      email: employee.email,
      current_role_in_company: employee.current_role_in_company,
      target_role_in_company: employee.target_role_in_company,
      preferred_language: employee.preferred_language,
      status: employee.status,
      profile_status: employee.profile_status,
      roles: employee.roles || [],
      teams: employee.teams || [],
      bio: employee.bio,
      value_proposition: employee.value_proposition,
      enrichment_completed: employee.enrichment_completed,
      enrichment_completed_at: employee.enrichment_completed_at,
      created_at: employee.created_at,
      updated_at: employee.updated_at
    };
  }

  /**
   * Format department data for response
   * @param {Object} department - Department record
   * @returns {Object} Formatted department data
   */
  formatDepartmentData(department) {
    return {
      department_id: department.id,
      company_id: department.company_id,
      department_identifier: department.department_id, // CSV department_id
      department_name: department.department_name,
      created_at: department.created_at,
      updated_at: department.updated_at
    };
  }

  /**
   * Format team data for response
   * @param {Object} team - Team record
   * @returns {Object} Formatted team data
   */
  formatTeamData(team) {
    return {
      team_id: team.id,
      company_id: team.company_id,
      department_id: team.department_id,
      team_identifier: team.team_id, // CSV team_id
      team_name: team.team_name,
      created_at: team.created_at,
      updated_at: team.updated_at
    };
  }

  /**
   * Extract ID from query text
   * @param {string} query - Query text
   * @returns {string|null} Extracted ID or null
   */
  extractId(query) {
    // Try to extract UUID
    const uuidMatch = query.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      return uuidMatch[0];
    }
    // Try to extract numeric ID
    const numericMatch = query.match(/\d+/);
    return numericMatch ? numericMatch[0] : null;
  }

  /**
   * Detect query type
   * @param {string} query - Query text
   * @returns {string} Query type
   */
  detectQueryType(query) {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('company')) return 'company';
    if (queryLower.includes('employee')) return 'employee';
    if (queryLower.includes('department')) return 'department';
    if (queryLower.includes('team')) return 'team';
    return 'default';
  }
}

module.exports = new ProcessHandler();

