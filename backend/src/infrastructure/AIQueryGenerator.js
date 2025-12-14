// Infrastructure Layer - AI Query Generator
// Uses Gemini AI to generate SQL queries based on payload and response structure

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class AIQueryGenerator {
  constructor() {
    this.apiKey = config.gemini?.apiKey;
    if (!this.apiKey) {
      console.warn('[AIQueryGenerator] ⚠️  GEMINI_API_KEY not configured. AI query generation will be disabled.');
      this.genAI = null;
    } else {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        console.log('[AIQueryGenerator] ✅ Initialized with Gemini API');
      } catch (error) {
        console.error('[AIQueryGenerator] ❌ Failed to initialize Gemini:', error);
        this.genAI = null;
      }
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
    if (!this.genAI) {
      throw new Error('AI query generation is not available. GEMINI_API_KEY is not configured.');
    }

    try {
      const migrationContent = this.loadMigrationFiles();
      
      // Build prompt for AI
      const prompt = this.buildPrompt(payload, responseTemplate, requesterService, migrationContent);

      // Get model
      const model = this.genAI.getModel('gemini-1.5-flash'); // Using flash for faster responses

      // Generate query
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();

      // Extract SQL query from response (AI might add explanations)
      const sqlQuery = this.extractSQL(generatedText);

      console.log('[AIQueryGenerator] ✅ Generated SQL query:', sqlQuery.substring(0, 200) + '...');
      return sqlQuery;

    } catch (error) {
      console.error('[AIQueryGenerator] Error generating query:', error);
      throw new Error(`Failed to generate SQL query: ${error.message}`);
    }
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

    // Business rules for field mappings and query patterns
    const businessRules = `
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

