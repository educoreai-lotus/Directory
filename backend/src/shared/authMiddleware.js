// Authentication Middleware — nAuth JWT only (Bearer).

const AuthFactory = require('../infrastructure/auth/AuthFactory');
const {
  isSensitiveNAuthRequest,
  revalidateNAuthAccessTokenViaCoordinator,
  buildUserFromCoordinatorResponse
} = require('./nAuthCoordinatorRevalidate');

let authProvider = null;

function getAuthProvider() {
  if (!authProvider) {
    authProvider = AuthFactory.create();
  }
  return authProvider;
}

function resetAuthProvider() {
  authProvider = null;
}

const authMiddleware = async (req, res, next) => {
  const authMode = process.env.AUTH_MODE || 'nauth';
  if (authMode !== 'nauth') {
    console.error('[authMiddleware] AUTH_MODE must be nauth');
    return res.status(503).json({
      requester_service: 'directory_service',
      response: {
        error: 'Server misconfiguration: AUTH_MODE must be nauth'
      }
    });
  }

  try {
    const provider = getAuthProvider();
    const token = provider.extractTokenFromHeaders(req.headers);
    const routePath = `${req.baseUrl || ''}${req.path || ''}` || req.originalUrl || req.url || 'unknown';
    const skipCoordinatorRevalidation = req.skipCoordinatorRevalidation === true;

    console.log('[authMiddleware] route:', routePath);

    if (!token) {
      return res.status(401).json({
        requester_service: 'directory_service',
        response: {
          error: 'Authentication required. Please provide a valid token.'
        }
      });
    }

    const validationResult = await provider.validateToken(token);
    const sensitive = isSensitiveNAuthRequest(req);
    console.log('[authMiddleware] local JWT valid:', validationResult.valid === true);
    if (skipCoordinatorRevalidation) {
      console.log('[authMiddleware] Coordinator revalidation skipped due to route flag');
    }

    if (validationResult.valid && (!sensitive || skipCoordinatorRevalidation)) {
      req.user = validationResult.user;
      req.token = token;
      return next();
    }

    if (!validationResult.valid && !validationResult.expired) {
      return res.status(401).json({
        requester_service: 'directory_service',
        response: {
          error: validationResult.error || 'Invalid or expired token'
        }
      });
    }

    try {
      const cr = await revalidateNAuthAccessTokenViaCoordinator(token, req);
      const coord = cr.coordinatorResponse || {};
      if (!cr.httpOk || coord.valid !== true) {
        return res.status(401).json({
          requester_service: 'directory_service',
          response: {
            error: coord.reason || 'Invalid or expired token'
          }
        });
      }

      const user = buildUserFromCoordinatorResponse(coord, validationResult.user || null);
      if (!user) {
        return res.status(401).json({
          requester_service: 'directory_service',
          response: {
            error: 'Invalid authentication response'
          }
        });
      }

      req.user = user;
      req.token = coord.new_access_token || token;
      if (coord.new_access_token) {
        res.setHeader('X-New-Access-Token', coord.new_access_token);
      }
      return next();
    } catch (coordErr) {
      console.error('[authMiddleware] nAuth Coordinator error:', coordErr.message);
      return res.status(401).json({
        requester_service: 'directory_service',
        response: {
          error: 'Authentication validation failed'
        }
      });
    }
  } catch (error) {
    console.error('[authMiddleware] Error:', error);
    return res.status(500).json({
      requester_service: 'directory_service',
      response: {
        error: 'Authentication error. Please try again.'
      }
    });
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authMode = process.env.AUTH_MODE || 'nauth';
    if (authMode !== 'nauth') {
      return next();
    }
    const provider = getAuthProvider();
    const token = provider.extractTokenFromHeaders(req.headers);
    if (token) {
      const validationResult = await provider.validateToken(token);
      if (validationResult.valid) {
        req.user = validationResult.user;
        req.token = token;
      }
    }
    next();
  } catch (error) {
    console.warn('[optionalAuthMiddleware] Warning:', error.message);
    next();
  }
};

const hrOnlyMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      requester_service: 'directory_service',
      response: {
        error: 'Authentication required'
      }
    });
  }

  if (!req.user.isSystemAdmin) {
    return res.status(403).json({
      requester_service: 'directory_service',
      response: {
        error: 'Access denied. Admin privileges required.'
      }
    });
  }

  next();
};

const adminOnlyMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      requester_service: 'directory_service',
      response: {
        error: 'Authentication required'
      }
    });
  }

  if (!req.user.isSystemAdmin) {
    return res.status(403).json({
      requester_service: 'directory_service',
      response: {
        error: 'Access denied. Admin privileges required.'
      }
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  hrOnlyMiddleware,
  adminOnlyMiddleware,
  resetAuthProvider
};
