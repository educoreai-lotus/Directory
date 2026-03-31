const EmployeeRepository = require('../infrastructure/EmployeeRepository');

class NAuthRequestController {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
  }

  buildNotFoundResponse() {
    return {
      requester_service: 'directory_service',
      response: {
        user_exists: false,
        user_id: '',
        full_name: '',
        organization_id: '',
        organization_name: ''
      }
    };
  }

  buildFoundResponse(employee) {
    return {
      requester_service: 'directory_service',
      response: {
        user_exists: true,
        user_id: employee.id || '',
        full_name: employee.full_name || '',
        organization_id: employee.company_id || '',
        organization_name: employee.organization_name || ''
      }
    };
  }

  async findByEmail(email) {
    const query = `
      SELECT
        e.id,
        e.company_id,
        e.full_name,
        c.company_name AS organization_name
      FROM employees e
      LEFT JOIN companies c ON c.id = e.company_id
      WHERE LOWER(TRIM(e.email)) = LOWER(TRIM($1))
      ORDER BY CASE WHEN e.status = 'active' THEN 0 ELSE 1 END, e.updated_at DESC
      LIMIT 1
    `;
    const result = await this.employeeRepository.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async findByGithubUrl(githubUrl) {
    const query = `
      SELECT
        e.id,
        e.company_id,
        e.full_name,
        c.company_name AS organization_name
      FROM employees e
      LEFT JOIN companies c ON c.id = e.company_id
      WHERE LOWER(TRIM(e.github_url)) = LOWER(TRIM($1))
      ORDER BY CASE WHEN e.status = 'active' THEN 0 ELSE 1 END, e.updated_at DESC
      LIMIT 1
    `;
    const result = await this.employeeRepository.pool.query(query, [githubUrl]);
    return result.rows[0] || null;
  }

  async handleRequest(req, res) {
    try {
      let body = req.body;

      // Support raw JSON-string bodies in addition to normal parsed objects.
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (parseError) {
          return res.status(400).json({
            requester_service: 'directory_service',
            response: {
              error: 'Invalid JSON string body.'
            }
          });
        }
      }

      // If upstream parsing middleware extracted payload only, normalize shape.
      if ((!body || typeof body !== 'object' || Array.isArray(body)) && req.parsedBody && typeof req.parsedBody === 'object' && !Array.isArray(req.parsedBody)) {
        body = { payload: req.parsedBody };
      }

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            error: 'Invalid body. Expected JSON object with payload.'
          }
        });
      }

      if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            error: 'Missing payload in request body.'
          }
        });
      }

      const payload = body.payload;
      const email = typeof payload.email === 'string' ? payload.email.trim() : '';
      const provider = typeof payload.provider === 'string' ? payload.provider.trim().toLowerCase() : '';
      const githubProfileUrl = typeof payload.github_profile_url === 'string' ? payload.github_profile_url.trim() : '';

      let employee = null;

      // Mandatory primary strategy: direct employees.email lookup whenever email exists.
      if (email) {
        employee = await this.findByEmail(email);
      } else if (provider === 'github' && githubProfileUrl) {
        // Fallback strategy only when email is absent.
        employee = await this.findByGithubUrl(githubProfileUrl);
      } else {
        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            error: 'No lookup fields provided. Provide payload.email or GitHub fallback fields.'
          }
        });
      }

      if (!employee) {
        return res.status(200).json(this.buildNotFoundResponse());
      }

      return res.status(200).json(this.buildFoundResponse(employee));
    } catch (error) {
      console.error('[NAuthRequestController] Error handling /request:', error.message);
      return res.status(500).json({
        requester_service: 'directory_service',
        response: {
          error: 'Failed to process directory lookup request.'
        }
      });
    }
  }
}

module.exports = NAuthRequestController;
