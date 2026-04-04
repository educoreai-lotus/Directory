// nAuth: optional Coordinator -> nAuth revalidation for protected Directory requests.
// Used from authMiddleware when local JWT checks are insufficient (sensitive methods or expired token).

const fetch = require('node-fetch');
const config = require('../config');

const NAUTH_VALIDATION_ACTION =
  'Route this request to nAuth service only for access token validation and session continuity decision.';

function getCoordinatorRequestUrl() {
  const base = process.env.COORDINATOR_URL || config.coordinator.baseUrl;
  const path = process.env.COORDINATOR_REQUEST_PATH || '/request';
  if (!base) {
    throw new Error('COORDINATOR_URL is not configured');
  }
  const normalizedBase = String(base).replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Non-GET requests (and HEAD/OPTIONS treated as non-sensitive for reads) require central revalidation.
 */
function isSensitiveNAuthRequest(req) {
  const m = String(req.method || 'GET').toUpperCase();
  if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') {
    return true;
  }
  const path = `${req.baseUrl || ''}${req.path || ''}`;
  if (path.includes('/admin/')) {
    return true;
  }
  return false;
}

function buildRouteLabel(req) {
  const combined = `${req.baseUrl || ''}${req.path || ''}`;
  if (combined) return combined;
  const url = req.originalUrl || req.url || '';
  return url.split('?')[0] || '/';
}

/**
 * POST the bootstrap-compatible envelope to Coordinator /request (plain JSON; matches frontend bootstrap).
 */
async function revalidateNAuthAccessTokenViaCoordinator(accessToken, req) {
  const url = getCoordinatorRequestUrl();
  const envelope = {
    requester_service: 'Directory',
    payload: {
      action: NAUTH_VALIDATION_ACTION,
      access_token: accessToken,
      route: buildRouteLabel(req),
      method: String(req.method || 'GET').toUpperCase()
    },
    response: {
      valid: false,
      reason: '',
      auth_state: '',
      directory_user_id: '',
      organization_id: '',
      new_access_token: ''
    }
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope)
  });

  const data = await resp.json().catch(() => ({}));
  const coordinatorResponse = data?.response || {};

  return {
    httpOk: resp.ok,
    status: resp.status,
    body: data,
    coordinatorResponse
  };
}

/**
 * Build req.user compatible with NAuthProvider local success shape.
 * @param {object} coordinatorResponse - nAuth-filled response template
 * @param {object|null} localUser - user from local JWT when available (e.g. sensitive + still valid)
 */
function buildUserFromCoordinatorResponse(coordinatorResponse, localUser) {
  const directoryUserId = coordinatorResponse.directory_user_id;
  const organizationId = coordinatorResponse.organization_id;
  if (!directoryUserId || !organizationId) {
    return null;
  }
  const sub = localUser?.sub != null ? localUser.sub : String(directoryUserId);
  const provider = localUser && Object.prototype.hasOwnProperty.call(localUser, 'provider')
    ? localUser.provider
    : undefined;

  return {
    sub,
    directoryUserId,
    organizationId,
    id: directoryUserId,
    companyId: organizationId,
    company_id: organizationId,
    ...(provider !== undefined ? { provider } : {})
  };
}

module.exports = {
  isSensitiveNAuthRequest,
  revalidateNAuthAccessTokenViaCoordinator,
  buildUserFromCoordinatorResponse,
  NAUTH_VALIDATION_ACTION
};
