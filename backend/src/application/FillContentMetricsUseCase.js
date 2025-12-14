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

    // Map each field in template
    Object.keys(template).forEach(templateKey => {
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
      } else if (typeof template[templateKey] === 'object' && !Array.isArray(template[templateKey])) {
        // Nested object - recurse
        mapped[templateKey] = this.mapRowToObject(row, template[templateKey]);
      } else if (Array.isArray(template[templateKey])) {
        // Array field - return empty array
        mapped[templateKey] = [];
      } else {
        // Keep template default
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
}

module.exports = FillContentMetricsUseCase;

