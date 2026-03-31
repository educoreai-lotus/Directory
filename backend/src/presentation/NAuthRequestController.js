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
    const startedAt = Date.now();
    const requestId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || req.id || '';
    const contentType = req.headers['content-type'] || '';
    const contentLength = req.headers['content-length'] || '';
    const xServiceName = req.headers['x-service-name'] || '';
    const xTargetService = req.headers['x-target-service'] || '';
    const xCoordinatorService = req.headers['x-coordinator-service'] || '';

    const shortenError = (value) => {
      if (!value) return '';
      const text = String(value);
      return text.length > 160 ? `${text.slice(0, 160)}...` : text;
    };

    // Mask known sensitive fields before printing any diagnostic object.
    const maskSensitive = (obj) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
      const clone = { ...obj };
      ['email', 'full_name', 'user_id'].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(clone, key) && typeof clone[key] === 'string') {
          clone[key] = '***';
        }
      });
      return clone;
    };

    let responseErrorMessage = '';
    res.on('finish', () => {
      console.log('[NAuthRequestController] /request response diagnostics:', maskSensitive({
        request_id: requestId,
        statusCode: res.statusCode,
        error: shortenError(responseErrorMessage),
        duration_ms: Date.now() - startedAt
      }));
    });

    try {
      console.log('[NAuthRequestController] /request inbound diagnostics:', {
        method: req.method,
        path: req.path,
        request_id: requestId,
        content_type: contentType,
        content_length: contentLength,
        x_service_name: xServiceName,
        x_target_service: xTargetService,
        x_coordinator_service: xCoordinatorService
      });

      if (typeof contentType === 'string' && contentType.includes(',')) {
        console.warn('[NAuthRequestController] Suspicious content-type received', {
          request_id: requestId,
          content_type: contentType
        });
      }

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
          responseErrorMessage = 'Invalid JSON string body.';
          console.error('[NAuthRequestController] Body parsing error:', {
            request_id: requestId,
            content_type: contentType,
            body_type: typeof req.body
          });
          return badJsonResponse;
        }
      }

      // If upstream parsing middleware extracted payload only, normalize shape.
      if ((!body || typeof body !== 'object' || Array.isArray(body)) && req.parsedBody && typeof req.parsedBody === 'object' && !Array.isArray(req.parsedBody)) {
        body = { payload: req.parsedBody };
      }

      const bodyIsObject = body && typeof body === 'object' && !Array.isArray(body);
      const bodyKeys = bodyIsObject ? Object.keys(body) : [];
      const hasRequesterService = bodyIsObject && Object.prototype.hasOwnProperty.call(body, 'requester_service');
      const hasPayload = bodyIsObject && Object.prototype.hasOwnProperty.call(body, 'payload');
      const hasResponse = bodyIsObject && Object.prototype.hasOwnProperty.call(body, 'response');

      console.log('[NAuthRequestController] /request body diagnostics:', {
        request_id: requestId,
        has_req_body: req.body !== undefined && req.body !== null,
        body_type: typeof body,
        is_array: Array.isArray(body),
        body_keys: bodyKeys,
        hasRequesterService,
        hasPayload,
        hasResponse
      });

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        responseErrorMessage = 'Invalid body. Expected JSON object with payload.';
        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            error: 'Invalid body. Expected JSON object with payload.'
          }
        });
      }

      if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
        responseErrorMessage = 'Missing payload in request body.';
        console.error('[NAuthRequestController] payload missing at Directory /request', {
          request_id: requestId,
          content_type: contentType,
          body_keys: bodyKeys
        });
        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            error: 'Missing payload in request body.'
          }
        });
      }

      const payload = body.payload;
      const payloadKeys = Object.keys(payload);
      console.log('[NAuthRequestController] /request payload diagnostics:', {
        request_id: requestId,
        payload_key_count: payloadKeys.length,
        payload_keys_sample: payloadKeys.slice(0, 10)
      });

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
        responseErrorMessage = 'No lookup fields provided. Provide payload.email or GitHub fallback fields.';
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
      responseErrorMessage = error?.message || 'Failed to process directory lookup request.';
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
