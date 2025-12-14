// Infrastructure Layer - AI Query Generator
// Uses OpenAI to generate SQL queries based on payload and response structure

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class AIQueryGenerator {
  constructor() {
    this.apiKey = config.openai?.apiKey || process.env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      console.warn('[AIQueryGenerator] ⚠️  OPENAI_API_KEY not configured. AI query generation will be disabled.');
      console.warn('[AIQueryGenerator] To enable AI query generation, set OPENAI_API_KEY in Railway.');
    } else {
      console.log('[AIQueryGenerator] ✅ Initialized with OpenAI API');
      console.log('[AIQueryGenerator] API Key configured:', !!this.apiKey);
    }
  }

  /**
   * Load migration files to provide schema context to AI
   * @returns {string} Migration file content
   */
  loadMigrationFiles() {
    try {
      const migrationPath = path.join(__dirname, '../../database/migrations/001_initial_schema.sql');
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');
      return migrationContent;
    } catch (error) {
      console.error('[AIQueryGenerator] Error loading migration files:', error);
      return '';
    }
  }

  /**
   * Generate SQL query using AI based on payload and response structure
   * @param {Object} payload - Request payload from microservice
   * @param {Object} responseTemplate - Response template structure
   * @param {string} requesterService - Name of the requesting microservice
   * @returns {Promise<string>} Generated SQL query
   */
  async generateQuery(payload, responseTemplate, requesterService) {
    if (!this.apiKey) {
      throw new Error('AI query generation is not available. OPENAI_API_KEY is not configured.');
    }

    try {
      const migrationContent = this.loadMigrationFiles();
      
      // Build prompt for AI
      const prompt = this.buildPrompt(payload, responseTemplate, requesterService, migrationContent);

      // Build OpenAI request
      const requestBody = {
        model: 'gpt-4-turbo', // Using gpt-4-turbo for better SQL generation
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.3, // Lower temperature for more deterministic SQL queries
        max_tokens: 2000 // SQL queries can be long, especially with JOINs
      };

      console.log('[AIQueryGenerator] ========== GENERATING SQL QUERY ==========');
      console.log('[AIQueryGenerator] Requester service:', requesterService);
      console.log('[AIQueryGenerator] Prompt length:', prompt.length, 'characters');
      console.log('[AIQueryGenerator] Request body size:', JSON.stringify(requestBody).length, 'bytes');

      // Call OpenAI API
      const apiUrl = `${this.baseUrl}/chat/completions`;
      const response = await axios.post(
        apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('[AIQueryGenerator] ========== API RESPONSE ==========');
      console.log('[AIQueryGenerator] Status:', response.status, response.statusText);
      console.log('[AIQueryGenerator] Response has choices:', !!response.data?.choices);

      // Extract generated text from OpenAI response
      const generatedText = response.data?.choices?.[0]?.message?.content?.trim();
      if (!generatedText) {
        console.error('[AIQueryGenerator] ❌ No SQL query in response');
        console.error('[AIQueryGenerator] Response data:', JSON.stringify(response.data, null, 2));
        throw new Error('No SQL query generated from OpenAI API');
      }

      console.log('[AIQueryGenerator] ✅ Generated text received, length:', generatedText.length, 'characters');
      console.log('[AIQueryGenerator] Generated text preview (first 300 chars):', generatedText.substring(0, 300));

      // Extract SQL query from response (AI might add explanations)
      const sqlQuery = this.extractSQL(generatedText);

      console.log('[AIQueryGenerator] ✅ Generated SQL query:', sqlQuery.substring(0, 200) + '...');
      return sqlQuery;

    } catch (error) {
      console.error('[AIQueryGenerator] Error generating query:', error);
      if (error.response) {
        console.error('[AIQueryGenerator] OpenAI API error:', error.response.status, error.response.statusText);
        console.error('[AIQueryGenerator] Error data:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Failed to generate SQL query: ${error.message}`);
    }
  }

  /**
   * Generate SQL query for batch requests with cursor-based pagination
   * @param {Object} payload - Request payload
   * @param {Object} responseTemplate - Response template
   * @param {string} requesterService - Requester service name
   * @param {string|null} cursor - Cursor for pagination (null for first page)
   * @param {number} pageSize - Number of records per page (default: 1000)
   * @returns {Promise<string>} Generated SQL query with pagination
   */
  async generateBatchQuery(payload, responseTemplate, requesterService, cursor, pageSize = 1000) {
    if (!this.apiKey) {
      throw new Error('AI query generation is not available. OPENAI_API_KEY is not configured.');
    }

    try {
      const migrationContent = this.loadMigrationFiles();
      const prompt = this.buildBatchPrompt(payload, responseTemplate, requesterService, migrationContent, cursor, pageSize);

      const requestBody = {
        model: 'gpt-4-turbo',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 2000
      };

      console.log('[AIQueryGenerator] ========== GENERATING BATCH SQL QUERY ==========');
      console.log('[AIQueryGenerator] Cursor:', cursor || 'null (first page)');
      console.log('[AIQueryGenerator] Page size:', pageSize);

      const apiUrl = `${this.baseUrl}/chat/completions`;
      const response = await axios.post(
        apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const generatedText = response.data?.choices?.[0]?.message?.content?.trim();
      if (!generatedText) {
        throw new Error('No SQL query generated from OpenAI API');
      }

      const sqlQuery = this.extractSQL(generatedText);
      console.log('[AIQueryGenerator] ✅ Generated batch SQL query:', sqlQuery.substring(0, 200) + '...');
      return sqlQuery;

    } catch (error) {
      console.error('[AIQueryGenerator] Error generating batch query:', error);
      throw new Error(`Failed to generate batch SQL query: ${error.message}`);
    }
  }

  /**
   * Generate COUNT query for total_records in batch requests
   * @param {Object} payload - Request payload
   * @param {Object} responseTemplate - Response template
   * @param {string} requesterService - Requester service name
   * @returns {Promise<string>} Generated COUNT SQL query
   */
  async generateCountQuery(payload, responseTemplate, requesterService) {
    if (!this.apiKey) {
      throw new Error('AI query generation is not available. OPENAI_API_KEY is not configured.');
    }

    try {
      const migrationContent = this.loadMigrationFiles();
      const prompt = this.buildCountPrompt(payload, responseTemplate, requesterService, migrationContent);

      const requestBody = {
        model: 'gpt-4-turbo',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 1000
      };

      console.log('[AIQueryGenerator] ========== GENERATING COUNT QUERY ==========');

      const apiUrl = `${this.baseUrl}/chat/completions`;
      const response = await axios.post(
        apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const generatedText = response.data?.choices?.[0]?.message?.content?.trim();
      if (!generatedText) {
        throw new Error('No COUNT query generated from OpenAI API');
      }

      const sqlQuery = this.extractSQL(generatedText);
      console.log('[AIQueryGenerator] ✅ Generated COUNT query:', sqlQuery.substring(0, 200) + '...');
      return sqlQuery;

    } catch (error) {
      console.error('[AIQueryGenerator] Error generating COUNT query:', error);
      throw new Error(`Failed to generate COUNT query: ${error.message}`);
    }
  }

  /**
   * Build prompt for batch query generation with cursor-based pagination
   * @param {Object} payload - Request payload
   * @param {Object} responseTemplate - Response template
   * @param {string} requesterService - Requester service name
   * @param {string} migrationContent - Database schema
   * @param {string|null} cursor - Cursor for pagination
   * @param {number} pageSize - Page size
   * @returns {string} Prompt text
   */
  buildBatchPrompt(payload, responseTemplate, requesterService, migrationContent, cursor, pageSize) {
    const migrationJsonPath = path.join(__dirname, '../../migrations/directory-migration.json');
    let migrationJsonContent = '';
    try {
      if (fs.existsSync(migrationJsonPath)) {
        migrationJsonContent = fs.readFileSync(migrationJsonPath, 'utf8');
      }
    } catch (error) {
      console.warn('[AIQueryGenerator] Could not load migration JSON:', error.message);
    }

    const cursorClause = cursor 
      ? `WHERE id > $1 ORDER BY id ASC LIMIT ${pageSize}`
      : `ORDER BY id ASC LIMIT ${pageSize}`;

    const businessRules = this.getBusinessRules();

    return `You are an AI Query Builder for PostgreSQL. Generate ONLY a SELECT SQL query (no explanations, no markdown).

SCHEMA (SQL Migration):
${migrationContent}

SCHEMA (JSON Migration):
${migrationJsonContent}

REQUEST:
${JSON.stringify({ requester_service: requesterService, payload, response: responseTemplate }, null, 2)}

${businessRules}

BATCH PAGINATION REQUIREMENTS:
- This is a BATCH request with cursor-based pagination
- Cursor: ${cursor || 'null (first page)'}
- Page size: ${pageSize} records
- Use cursor-based pagination: ${cursor ? `WHERE id > '${cursor}'` : 'No cursor (first page)'}
- Order by primary key (typically 'id') ASC
- Limit to ${pageSize} records
- Return all fields needed to fill the response template

CRITICAL REQUIREMENTS:
1. Use parameterized queries with $1, $2, etc. for payload values
2. ${cursor ? `Use $1 for cursor value: '${cursor}'` : 'No cursor parameter needed (first page)'}
3. Add ORDER BY id ASC (or appropriate primary key)
4. Add LIMIT ${pageSize}
5. ${cursor ? 'Add WHERE id > $1 (or appropriate primary key comparison)' : 'No WHERE clause for cursor (first page)'}
6. Map response template fields to database columns using business rules
7. Use proper JOINs when needed
8. Return ONLY the SQL query, nothing else

Generate the SQL query now:`;
  }

  /**
   * Build prompt for COUNT query generation
   * @param {Object} payload - Request payload
   * @param {Object} responseTemplate - Response template
   * @param {string} requesterService - Requester service name
   * @param {string} migrationContent - Database schema
   * @returns {string} Prompt text
   */
  buildCountPrompt(payload, responseTemplate, requesterService, migrationContent) {
    const migrationJsonPath = path.join(__dirname, '../../migrations/directory-migration.json');
    let migrationJsonContent = '';
    try {
      if (fs.existsSync(migrationJsonPath)) {
        migrationJsonContent = fs.readFileSync(migrationJsonPath, 'utf8');
      } else {
        console.warn('[AIQueryGenerator] Migration JSON file not found at:', migrationJsonPath);
      }
    } catch (error) {
      console.warn('[AIQueryGenerator] Could not load migration JSON:', error.message);
      console.warn('[AIQueryGenerator] Error details:', error.code, error.path);
    }

    const businessRules = this.getBusinessRules();

    return `You are an AI Query Builder for PostgreSQL. Generate ONLY a SELECT COUNT SQL query (no explanations, no markdown).

SCHEMA (SQL Migration):
${migrationContent}

SCHEMA (JSON Migration):
${migrationJsonContent}

REQUEST:
${JSON.stringify({ requester_service: requesterService, payload, response: responseTemplate }, null, 2)}

${businessRules}

COUNT QUERY REQUIREMENTS:
- Generate a SELECT COUNT(*) query
- Count all records that match the payload filters (if any)
- Use the same WHERE conditions as the data query (but without cursor or LIMIT)
- DO NOT use nested aggregate functions (e.g., COUNT(COUNT(*)) or COUNT(json_agg(...)))
- DO NOT use json_agg, array_agg, or any aggregation functions inside COUNT
- Simply count the base records: SELECT COUNT(*) FROM table WHERE conditions
- If the data query uses JOINs, count from the main table only (not aggregated results)
- Return ONLY the SQL query, nothing else

CRITICAL: The COUNT query must be simple - just COUNT(*) from the base table(s) with WHERE conditions. Do NOT wrap aggregate functions in COUNT.

Generate the COUNT query now:`;
  }

  /**
   * Get business rules for query generation
   * @returns {string} Business rules text
   */
  getBusinessRules() {
    return `
BUSINESS RULES:
1. Field Mappings:
   - user_id → employee_id (employees table)
   - employee_id → employee_id (employees table)
   - company_id → company_id (companies table)
   - learner_id → employee_id (employees table)
   - name → full_name (employees table)
   - employee_name → full_name (employees table)
   - current_role → current_role_in_company (employees table)
   - target_role → target_role_in_company (employees table)
   - role_type → role_type (employee_roles table, may need JOIN)
   - approver → employee_id of employee with DECISION_MAKER role (employee_roles table)
   - primary_hr_contact → hr_contact_name, hr_contact_email (companies table)
   - company_size → Calculate from COUNT of employees in companies table
   - date_registered → created_at (companies table)
   - website_url → domain (companies table, may need to format as URL)
   - max_test_attempts → max_attempts (companies table)
   - passing_grade → passing_grade (companies table)
   - exercises_limit → exercises_limited (companies table)

2. Hierarchy Queries:
   - For hierarchy (departments → teams → employees):
     * Query departments with LEFT JOIN to teams
     * Query teams with LEFT JOIN to employees
     * Use JSON aggregation (json_agg) to build nested structure
     * Example structure: departments array, each with teams array, each with employees array
   - Department manager: Find employee with DEPARTMENT_MANAGER role in employee_roles
   - Team manager: Find employee with TEAM_MANAGER role in employee_roles

3. Employee Data:
   - role_type: JOIN with employee_roles table, may have multiple roles (use array_agg)
   - completed_courses: Query from external service or leave empty array if not in DB
   - courses_taught: Query from external service or leave empty array if not in DB
   - manager_id: Query from employee_managers table (relationship_type = 'team_manager' or 'department_manager')

4. Company Data:
   - approver: Find employee with DECISION_MAKER role in employee_roles for the company
   - If no approver found, set to null or empty string

5. Query Patterns:
   - Single company: WHERE companies.id = $1 (from payload.company_id)
   - All companies: Omit WHERE clause or use WHERE 1=1
   - Single employee: WHERE employees.employee_id = $1 (from payload.employee_id)
   - Multiple employees: WHERE employees.employee_id = ANY($1::text[]) or IN clause

6. Aggregations:
   - Use json_agg() for arrays (hierarchy, employees, teams)
   - Use array_agg() for simple arrays (role_types)
   - Use COUNT() for company_size
   - Use COALESCE() for NULL handling

7. Response Structure:
   - If response template has "hierarchy" array, build nested JSON structure
   - If response template has single object, return single row
   - If response template has array at root, return multiple rows
`;
  }

  /**
   * Build prompt for AI query generation
   * @param {Object} payload - Request payload
   * @param {Object} responseTemplate - Response template
   * @param {string} requesterService - Requester service name
   * @param {string} migrationContent - Database schema
   * @returns {string} Prompt text
   */
  buildPrompt(payload, responseTemplate, requesterService, migrationContent) {
    // Load migration JSON for better schema context
    const migrationJsonPath = path.join(__dirname, '../../migrations/directory-migration.json');
    let migrationJsonContent = '';
    try {
      if (fs.existsSync(migrationJsonPath)) {
        migrationJsonContent = fs.readFileSync(migrationJsonPath, 'utf8');
      }
    } catch (error) {
      console.warn('[AIQueryGenerator] Could not load migration JSON:', error.message);
    }

    const businessRules = this.getBusinessRules();

    return `You are an AI Query Builder for PostgreSQL. Generate ONLY a SELECT SQL query (no explanations, no markdown).

SCHEMA (SQL Migration):
${migrationContent}

SCHEMA (JSON Migration):
${migrationJsonContent}

REQUEST:
${JSON.stringify({ requester_service: requesterService, payload, response: responseTemplate }, null, 2)}

${businessRules}

TASK: Generate a PostgreSQL SELECT query to find data based on payload in the coordinator request and fill the response template fields.

CRITICAL REQUIREMENTS:
1. Use parameterized queries with $1, $2, etc. for payload values
2. Map response template fields to database columns using business rules above
3. Use proper JOINs: employees → companies, departments → companies, teams → departments, employee_roles → employees, employee_teams → employees/teams, employee_managers → employees
4. For hierarchy structures, use json_agg() to build nested JSON
5. Handle NULL values with COALESCE() where appropriate
6. Return ONLY the SQL query, nothing else
7. Query must start with SELECT
8. Use proper WHERE clauses based on payload filters (company_id, employee_id, etc.)

Generate the SQL query now:`;
  }

  /**
   * Extract SQL query from AI response (removes markdown, explanations, etc.)
   * @param {string} aiResponse - Raw AI response
   * @returns {string} Clean SQL query
   */
  extractSQL(aiResponse) {
    // Remove markdown code blocks
    let sql = aiResponse.replace(/```sql\n?/gi, '').replace(/```\n?/g, '');
    
    // Remove explanations before/after query
    const sqlMatch = sql.match(/(SELECT.*?;)/is);
    if (sqlMatch) {
      sql = sqlMatch[1];
    }

    // Clean up whitespace
    sql = sql.trim();

    // If no semicolon, add one
    if (!sql.endsWith(';')) {
      sql += ';';
    }

    return sql;
  }

  /**
   * Validate generated SQL query for safety
   * @param {string} sql - SQL query to validate
   * @returns {boolean} True if valid
   */
  validateSQL(sql) {
    // Basic validation - prevent dangerous operations
    const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE'];
    const upperSQL = sql.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperSQL.includes(keyword)) {
        console.error(`[AIQueryGenerator] ⚠️  Dangerous keyword detected: ${keyword}`);
        return false;
      }
    }

    // Must be a SELECT query
    if (!upperSQL.trim().startsWith('SELECT')) {
      console.error('[AIQueryGenerator] ⚠️  Query must start with SELECT');
      return false;
    }

    return true;
  }
}

module.exports = AIQueryGenerator;

