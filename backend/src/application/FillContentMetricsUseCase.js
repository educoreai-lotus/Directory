// Application Layer - Fill Content Metrics Use Case
// Handles requests from other microservices to fill response templates with Directory data

const AIQueryGenerator = require('../infrastructure/AIQueryGenerator');
const { Pool } = require('pg');
const config = require('../config');

class FillContentMetricsUseCase {
  constructor() {
    this.aiQueryGenerator = new AIQueryGenerator();
    
    // Initialize database pool
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
   * Fill response template with data from Directory database
   * @param {Object} envelope - Full Coordinator request envelope { requester_service, payload, response }
   * @returns {Promise<Object>} Full envelope with filled response (preserves original payload)
   */
  async execute(envelope) {
    try {
      // Extract components from envelope
      const { requester_service, payload, response: responseTemplate } = envelope;
      
      console.log('[FillContentMetricsUseCase] Processing request from:', requester_service);
      console.log('[FillContentMetricsUseCase] Payload:', JSON.stringify(payload));
      console.log('[FillContentMetricsUseCase] Response template:', JSON.stringify(responseTemplate));

      // Normalize requester service name for comparisons
      const requester = (requester_service || '').toString();

      // Special-case handling for ManagementReporting to avoid fragile AI SQL issues
      const isManagementReporting =
        requester.toLowerCase() === 'managementreporting'.toLowerCase() ||
        requester.toLowerCase() === 'management-reporting'.toLowerCase();

      if (isManagementReporting) {
        console.log('[FillContentMetricsUseCase] 🔎 Detected ManagementReporting request - using dedicated handler');
        return await this.handleManagementReporting(envelope);
      }

      // Check if this is a batch request from Learning Analytics
      const isBatchRequest = payload?.type === 'batch' && 
                           (requester === 'LearningAnalytics' || requester === 'learning-analytics');
      
      if (isBatchRequest) {
        console.log('[FillContentMetricsUseCase] 🔄 Detected BATCH request from Learning Analytics');
        console.log('[FillContentMetricsUseCase] Cursor:', payload.cursor || 'null (first page)');
        return await this.handleBatchRequest(envelope);
      }

      // Step 1: Generate SQL query using AI
      let sqlQuery;
      try {
        sqlQuery = await this.aiQueryGenerator.generateQuery(payload, responseTemplate, requester_service);
        
        // Validate SQL for safety
        if (!this.aiQueryGenerator.validateSQL(sqlQuery)) {
          throw new Error('Generated SQL query failed safety validation');
        }
      } catch (error) {
        console.error('[FillContentMetricsUseCase] AI query generation failed:', error);
        // Return envelope with empty response template on AI failure
        return this.buildEnvelopeWithEmptyResponse(envelope);
      }

      // Step 2: Extract parameters from payload for parameterized query
      const parameters = this.extractParameters(payload, sqlQuery);

      // Step 3: Execute query
      let queryResult;
      try {
        queryResult = await this.pool.query(sqlQuery, parameters);
        console.log('[FillContentMetricsUseCase] Query executed successfully. Rows:', queryResult.rows.length);
      } catch (error) {
        console.error('[FillContentMetricsUseCase] SQL execution failed:', error);
        // Return envelope with empty response template on SQL error
        return this.buildEnvelopeWithEmptyResponse(envelope);
      }

      // Step 4: Map query results to response template
      const filledResponse = this.mapResultsToTemplate(queryResult.rows, responseTemplate, payload);

      // Step 5: Return FULL envelope with original payload + filled response
      const filledEnvelope = {
        requester_service: requester_service,
        payload: payload, // Preserve original payload
        response: filledResponse // Return filled response
      };

      console.log('[FillContentMetricsUseCase] ✅ Response filled successfully');
      console.log('[FillContentMetricsUseCase] Returning full envelope with original payload preserved');
      return filledEnvelope;

    } catch (error) {
      console.error('[FillContentMetricsUseCase] Error:', error);
      // Return envelope with empty response template on any error
      return this.buildEnvelopeWithEmptyResponse(envelope);
    }
  }

  /**
   * Extract parameters from payload for parameterized SQL query
   * @param {Object} payload - Request payload
   * @param {string} sqlQuery - SQL query with $1, $2, etc.
   * @returns {Array} Parameter values
   */
  extractParameters(payload, sqlQuery) {
    const parameters = [];
    
    // Common field mappings
    const fieldMappings = {
      'user_id': 'employee_id',
      'employee_id': 'employee_id',
      'company_id': 'company_id',
      'employee_type': 'employee_type',
      'role_type': 'role_type'
    };

    // Extract parameter placeholders from SQL ($1, $2, etc.)
    const paramMatches = sqlQuery.match(/\$(\d+)/g);
    if (!paramMatches) {
      return parameters;
    }

    // Map payload fields to parameters
    // This is a simplified approach - AI should generate queries that use payload fields
    const payloadKeys = Object.keys(payload);
    for (let i = 0; i < paramMatches.length; i++) {
      const paramIndex = parseInt(paramMatches[i].substring(1)) - 1;
      if (paramIndex < payloadKeys.length) {
        const key = payloadKeys[paramIndex];
        let value = payload[key];
        
        // Handle field name mapping (e.g., user_id → employee_id)
        if (fieldMappings[key]) {
          // Use the mapped field name, but keep the value
          value = payload[fieldMappings[key]] || value;
        }
        
        parameters.push(value);
      }
    }

    return parameters;
  }

  /**
   * Map database query results to response template structure
   * @param {Array} rows - Query result rows
   * @param {Object} template - Response template
   * @param {Object} payload - Original payload
   * @returns {Object} Filled response object
   */
  mapResultsToTemplate(rows, template, payload) {
    // Deep clone template
    const filled = JSON.parse(JSON.stringify(template));

    // If template is an object with arrays, handle array fields
    if (Array.isArray(template)) {
      // Template is an array - return rows directly mapped
      return rows.map(row => this.mapRowToObject(row, template[0] || {}));
    }

    // Template is an object - map fields
    if (rows.length === 0) {
      return filled; // Return empty template
    }

    if (rows.length === 1) {
      // Single row - map to object
      return this.mapRowToObject(rows[0], filled);
    }

    // Multiple rows - check if template expects an array
    const templateKeys = Object.keys(template);
    const arrayFields = templateKeys.filter(key => Array.isArray(template[key]));

    if (arrayFields.length > 0) {
      // Map rows to array fields
      arrayFields.forEach(field => {
        filled[field] = rows.map(row => this.mapRowToObject(row, template[field][0] || {}));
      });
    } else {
      // Return first row mapped to object
      return this.mapRowToObject(rows[0], filled);
    }

    return filled;
  }

  /**
   * Map a single database row to an object matching the template structure
   * @param {Object} row - Database row
   * @param {Object} template - Template object
   * @returns {Object} Mapped object
   */
  mapRowToObject(row, template) {
    const mapped = {};

    // Guard against unexpected null/undefined inputs
    if (!template || typeof template !== 'object') {
      console.warn(
        '[FillContentMetricsUseCase] ⚠️ mapRowToObject called with invalid template. Template type:',
        typeof template
      );
      return {};
    }

    // Common field mappings (Directory → Other services)
    const fieldMappings = {
      'employee_id': ['user_id', 'employee_id'],
      'company_id': ['company_id'],
      'full_name': ['name', 'full_name', 'employee_name'],
      'email': ['email'],
      'current_role_in_company': ['role', 'current_role'],
      'target_role_in_company': ['target_role'],
      'preferred_language': ['language', 'preferred_language'],
      'status': ['status', 'employee_status'],
      'bio': ['bio', 'biography', 'description'],
      'profile_photo_url': ['photo_url', 'avatar_url', 'profile_picture'],
      'linkedin_url': ['linkedin'],
      'github_url': ['github'],
      'linkedin_data': ['linkedin_data'],
      'github_data': ['github_data']
    };

    const templateKeys = Object.keys(template || {});

    // Map each field in template
    templateKeys.forEach(templateKey => {
      // Try to find matching column in row
      let value = null;

      // Direct match
      if (row[templateKey] !== undefined) {
        value = row[templateKey];
      } else {
        // Try field mappings
        for (const [dbField, possibleNames] of Object.entries(fieldMappings)) {
          if (possibleNames.includes(templateKey) && row[dbField] !== undefined) {
            value = row[dbField];
            break;
          }
        }
      }

      // Set value (or keep template default structure)
      if (value !== null && value !== undefined) {
        mapped[templateKey] = value;
      } else if (template[templateKey] && typeof template[templateKey] === 'object' && !Array.isArray(template[templateKey])) {
        // Nested object - recurse, ensure we pass a valid object
        mapped[0] = this.isPlainObject(template[templateKey])
          ? this.mapRowToObject(row, template[templateKey])
          : template[templateKey];
      } else if (Array.isArray(template[templateKey])) {
        // Array field - return empty array
        mapped[templateKey] = [];
      } else {
        // Keep template default, but log when we have no matching DB field
        const hasRow = row && typeof row === 'object';
        const isDefaultEmpty =
          template[templateKey] === null ||
          template[templateKey] === '' ||
          (Array.isArray(template[templateKey]) && template[templateKey].length === 0);

        if (isDefaultEmpty && hasRow) {
          try {
            console.warn(
              '[FillContentMetricsUseCase] ⚠️ No database value found for template field:',
              templateKey,
              'Available columns in row:',
              Object.keys(row || {})
            );
          } catch (logErr) {
            console.warn(
              '[FillContentMetricsUseCase] ⚠️ Failed to inspect row keys for field:',
              templateKey,
              'Error:',
              logErr.message
            );
          }
        }

        mapped[templateKey] = template[templateKey];
      }
    });

    return mapped;
  }

  /**
   * Build empty response matching template structure
   * @param {Object} template - Response template
   * @returns {Object} Empty response
   */
  buildEmptyResponse(template) {
    // Return template as-is (with default/empty values)
    return JSON.parse(JSON.stringify(template));
  }

  /**
   * Helper to check if a value is a plain object (and not null/array)
   * @param {any} value
   * @returns {boolean}
   */
  isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Build envelope with empty response (preserves original payload)
   * @param {Object} envelope - Original envelope
   * @returns {Object} Envelope with empty response
   */
  buildEnvelopeWithEmptyResponse(envelope) {
    return {
      requester_service: envelope.requester_service,
      payload: envelope.payload, // Preserve original payload
      response: this.buildEmptyResponse(envelope.response) // Empty response matching template
    };
  }

  /**
   * Dedicated handler for ManagementReporting requests.
   * Uses a deterministic SQL query to fetch company-level management data
   * instead of relying solely on AI-generated SQL (which can fail with complex aggregates).
   * @param {Object} envelope - Full Coordinator request envelope
   * @returns {Promise<Object>} Filled envelope
   */
  async handleManagementReporting(envelope) {
    const { requester_service, payload, response: responseTemplate } = envelope;

    try {
      // Static, safe SQL for management overview across all companies
      const sqlQuery = `
        SELECT 
          c.id AS company_id,
          c.company_name,
          c.industry,
          COUNT(e.id) AS company_size,
          c.created_at AS date_registered,
          CONCAT(c.hr_contact_name, ', ', c.hr_contact_email) AS primary_hr_contact,
          c.approval_policy,
          (
            SELECT CONCAT(dm.full_name, ', ', dm.email)
            FROM employees dm
            JOIN employee_roles er ON dm.id = er.employee_id
            WHERE dm.company_id = c.id
              AND er.role_type = 'DECISION_MAKER'
            LIMIT 1
          ) AS decision_maker,
          c.kpis,
          c.max_attempts AS max_test_attempts,
          c.domain AS website_url,
          c.verification_status,
          NULL::jsonb AS hierarchy
        FROM companies c
        LEFT JOIN employees e ON e.company_id = c.id
        GROUP BY 
          c.id,
          c.company_name,
          c.industry,
          c.created_at,
          c.hr_contact_name,
          c.hr_contact_email,
          c.approval_policy,
          c.kpis,
          c.max_attempts,
          c.domain,
          c.verification_status
        ORDER BY c.created_at DESC;
      `;

      console.log('[FillContentMetricsUseCase] [ManagementReporting] Executing static management query');
      const queryResult = await this.pool.query(sqlQuery, []);
      console.log('[FillContentMetricsUseCase] [ManagementReporting] Rows:', queryResult.rows.length);

      const filledResponse = this.mapResultsToTemplate(queryResult.rows, responseTemplate, payload);

      return {
        requester_service,
        payload,
        response: filledResponse
      };
    } catch (error) {
      console.error('[FillContentMetricsUseCase] [ManagementReporting] Error executing static query:', error);
      return this.buildEnvelopeWithEmptyResponse(envelope);
    }
  }

  /**
   * Handle batch request from Learning Analytics (via Coordinator)
   * Implements cursor-based pagination as per BATCH_PAGINATION_GUIDE.md
   * @param {Object} envelope - Full Coordinator request envelope
   * @returns {Promise<Object>} Full envelope with paginated response
   */
  async handleBatchRequest(envelope) {
    const { requester_service, payload, response: responseTemplate } = envelope;
    const cursor = payload.cursor || null; // null for first page
    const pageSize = 1000; // Standard page size for batch requests

    console.log('[FillContentMetricsUseCase] ========== BATCH REQUEST HANDLING ==========');
    console.log('[FillContentMetricsUseCase] Cursor:', cursor || 'null (first page)');
    console.log('[FillContentMetricsUseCase] Page size:', pageSize);

    try {
      // Step 1: Generate SQL query for data (with pagination)
      let dataQuery;
      try {
        // Generate query with cursor-based pagination
        dataQuery = await this.aiQueryGenerator.generateBatchQuery(
          payload,
          responseTemplate,
          requester_service,
          cursor,
          pageSize
        );
        
        if (!this.aiQueryGenerator.validateSQL(dataQuery)) {
          throw new Error('Generated SQL query failed safety validation');
        }
      } catch (error) {
        console.error('[FillContentMetricsUseCase] AI query generation failed:', error);
        return this.buildEnvelopeWithEmptyResponse(envelope);
      }

      // Step 2: Generate COUNT query for total_records
      let countQuery;
      try {
        countQuery = await this.aiQueryGenerator.generateCountQuery(
          payload,
          responseTemplate,
          requester_service
        );
        
        if (!this.aiQueryGenerator.validateSQL(countQuery)) {
          throw new Error('Generated COUNT query failed safety validation');
        }
      } catch (error) {
        console.error('[FillContentMetricsUseCase] COUNT query generation failed:', error);
        // Continue without total count if COUNT query fails
        countQuery = null;
      }

      // Step 3: Extract parameters from payload
      // For batch requests, cursor is the first parameter if present
      let parameters = [];
      if (cursor) {
        parameters.push(cursor); // Cursor is $1
        // Then add other payload parameters (they will be $2, $3, etc.)
        // We need to extract parameters but skip the first one since cursor is $1
        const otherParams = this.extractParameters(payload, dataQuery);
        // If the query has $1 for cursor, other params start at $2
        // Otherwise, just use otherParams as-is
        parameters = parameters.concat(otherParams);
      } else {
        // No cursor, extract parameters normally
        parameters = this.extractParameters(payload, dataQuery);
      }

      // Step 4: Execute data query
      let queryResult;
      try {
        queryResult = await this.pool.query(dataQuery, parameters);
        console.log('[FillContentMetricsUseCase] Data query executed. Rows:', queryResult.rows.length);
      } catch (error) {
        console.error('[FillContentMetricsUseCase] SQL execution failed:', error);
        return this.buildEnvelopeWithEmptyResponse(envelope);
      }

      // Step 5: Execute COUNT query (if available)
      let totalRecords = 0;
      if (countQuery) {
        try {
          const countParams = this.extractParameters(payload, countQuery);
          const countResult = await this.pool.query(countQuery, countParams);
          // COUNT(*) returns a column named 'count' (lowercase)
          totalRecords = parseInt(countResult.rows[0]?.count || countResult.rows[0]?.COUNT || 0, 10);
          console.log('[FillContentMetricsUseCase] Total records:', totalRecords);
        } catch (error) {
          console.error('[FillContentMetricsUseCase] COUNT query failed:', error.message);
          console.error('[FillContentMetricsUseCase] COUNT query:', countQuery);
          console.error('[FillContentMetricsUseCase] COUNT params:', countParams);
          console.warn('[FillContentMetricsUseCase] Using returned_records as total (COUNT query failed)');
          // If COUNT fails, use returned_records as total (not ideal but better than 0)
          totalRecords = queryResult.rows.length;
        }
      } else {
        // If no COUNT query, use returned_records as total
        console.log('[FillContentMetricsUseCase] No COUNT query generated, using returned_records as total');
        totalRecords = queryResult.rows.length;
      }

      // Step 6: Map query results to response template
      const filledResponse = this.mapResultsToTemplate(queryResult.rows, responseTemplate, payload);

      // Step 7: Calculate pagination metadata
      const returnedRecords = queryResult.rows.length;
      const lastRecord = queryResult.rows[returnedRecords - 1];
      
      // Determine next_cursor (last record's primary key - typically 'id' or first UUID field)
      let nextCursor = null;
      if (returnedRecords > 0 && lastRecord) {
        // Try to find the primary key (usually 'id' or first UUID field)
        if (lastRecord.id) {
          nextCursor = lastRecord.id;
        } else {
          // Find first UUID field
          const uuidFields = Object.keys(lastRecord).filter(key => {
            const value = lastRecord[key];
            return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
          });
          if (uuidFields.length > 0) {
            nextCursor = lastRecord[uuidFields[0]];
          }
        }
      }

      // Determine has_more: true if returned_records equals page size AND next_cursor is not null
      const hasMore = returnedRecords === pageSize && nextCursor !== null;

      // If this is the last page, set next_cursor to null
      if (!hasMore) {
        nextCursor = null;
      }

      // Step 8: Add pagination metadata to response
      filledResponse.pagination = {
        total_records: totalRecords,
        returned_records: returnedRecords,
        next_cursor: nextCursor,
        has_more: hasMore
      };

      // Add version and fetched_at if not present
      if (!filledResponse.version) {
        filledResponse.version = '2025-01-27'; // Current version
      }
      if (!filledResponse.fetched_at) {
        filledResponse.fetched_at = new Date().toISOString();
      }

      console.log('[FillContentMetricsUseCase] ✅ Batch response prepared:');
      console.log('[FillContentMetricsUseCase]   - Total records:', totalRecords);
      console.log('[FillContentMetricsUseCase]   - Returned records:', returnedRecords);
      console.log('[FillContentMetricsUseCase]   - Next cursor:', nextCursor || 'null (last page)');
      console.log('[FillContentMetricsUseCase]   - Has more:', hasMore);

      // Step 9: Return FULL envelope with original payload + filled response
      const filledEnvelope = {
        requester_service: requester_service,
        payload: payload, // Preserve original payload
        response: filledResponse // Return filled response with pagination
      };

      return filledEnvelope;

    } catch (error) {
      console.error('[FillContentMetricsUseCase] Error handling batch request:', error);
      return this.buildEnvelopeWithEmptyResponse(envelope);
    }
  }
}

module.exports = FillContentMetricsUseCase;

