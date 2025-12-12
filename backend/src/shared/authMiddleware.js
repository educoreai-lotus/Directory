// Authentication Middleware
// Validates authentication tokens on protected routes
// Works with both dummy and real Auth Service modes

const AuthFactory = require('../infrastructure/auth/AuthFactory');

// Create auth provider instance (singleton pattern)
let authProvider = null;

/**
 * Get or create auth provider instance
 * @returns {AuthProvider}
 */
function getAuthProvider() {
  if (!authProvider) {
    authProvider = AuthFactory.create();
  }
  return authProvider;
}

/**
 * Reset auth provider (useful for testing or mode changes)
 */
function resetAuthProvider() {
  authProvider = null;
}

/**
 * Skip Authentication in Dummy Mode Middleware
 * When AUTH_MODE=dummy, skip all authentication checks and treat caller as authenticated
 * This allows CSV uploads and other operations to work without tokens in dummy mode
 */
const skipAuthInDummyMode = (req, res, next) => {
  if (process.env.AUTH_MODE === 'dummy') {
    console.log('[skipAuthInDummyMode] AUTH_MODE=dummy, skipping authentication for:', req.path);
    req.user = { id: 'dummy-user', isHR: true, isAdmin: false };
    req.token = 'dummy-token';
    return next();
  }
  next();
};

/**
 * Authentication Middleware
 * Validates JWT token from request headers and attaches user to request
 * 
 * Usage:
 *   app.get('/protected-route', authMiddleware, (req, res) => {
 *     // req.user is available here
 *     res.json({ user: req.user });
 *   });
 */
const authMiddleware = async (req, res, next) => {
  // Skip authentication if AUTH_MODE=dummy
  if (process.env.AUTH_MODE === 'dummy') {
    console.log('[authMiddleware] AUTH_MODE=dummy, skipping authentication for:', req.path);
    
    // Extract companyId from request params or body for dummy user
    // This allows enrollment and other company-scoped operations to work
    const companyId = req.params?.companyId || req.params?.id || req.body?.companyId || req.parsedBody?.companyId;
    
    req.user = { 
      id: 'dummy-user', 
      isHR: true, 
      isAdmin: false,
      companyId: companyId, // Set companyId from request for company-scoped operations
      company_id: companyId // Also set company_id for compatibility
    };
    req.token = 'dummy-token';
    
    console.log('[authMiddleware] Dummy user created with companyId:', companyId);
    return next();
  }

  try {
    const provider = getAuthProvider();
    const token = provider.extractTokenFromHeaders(req.headers);

    console.log('[authMiddleware] Request path:', req.path);
    console.log('[authMiddleware] Authorization header:', req.headers.authorization ? 'present' : 'missing');
    console.log('[authMiddleware] Extracted token:', token ? `${token.substring(0, 20)}...` : 'null');

    if (!token) {
      console.log('[authMiddleware] No token found in request');
      return res.status(401).json({
        requester_service: 'directory_service',
        response: {
          error: 'Authentication required. Please provide a valid token.'
        }
      });
    }

    // Validate token
    console.log('[authMiddleware] Validating token...');
    const validationResult = await provider.validateToken(token);
    console.log('[authMiddleware] Validation result:', validationResult.valid ? 'valid' : 'invalid', validationResult.error || '');
    console.log("[authMiddleware] RAW token from header:", token);
    console.log("[authMiddleware] Decoded user payload:", validationResult.user);
    console.log("[authMiddleware] typeof user:", typeof validationResult.user);
    console.log("[authMiddleware] user.isHR:", validationResult.user?.isHR);
    console.log("[authMiddleware] user.companyId:", validationResult.user?.companyId);

    if (!validationResult.valid) {
      return res.status(401).json({
        requester_service: 'directory_service',
        response: {
          error: validationResult.error || 'Invalid or expired token'
        }
      });
    }

    // Attach user to request
    req.user = validationResult.user;
    req.token = token;
    console.log('[authMiddleware] User authenticated:', req.user.email, 'ID:', req.user.id);
    console.log("[authMiddleware] AUTH OK → Passing request to next middleware");

    next();
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

/**
 * Optional Authentication Middleware
 * Validates token if present, but doesn't fail if missing
 * Useful for routes that work with or without authentication
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
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
    // Don't fail on optional auth errors, just continue
    console.warn('[optionalAuthMiddleware] Warning:', error.message);
    next();
  }
};

/**
 * HR-only Middleware
 * Ensures user is HR before allowing access
 * Must be used after authMiddleware
 */
const hrOnlyMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      requester_service: 'directory_service',
      response: {
        error: 'Authentication required'
      }
    });
  }

  if (!req.user.isHR) {
    return res.status(403).json({
      requester_service: 'directory_service',
      response: {
        error: 'Access denied. HR privileges required.'
      }
    });
  }

  next();
};

/**
 * Admin-only Middleware
 * Ensures user is a platform-level admin before allowing access
 * Must be used after authMiddleware
 */
const adminOnlyMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      requester_service: 'directory_service',
      response: {
        error: 'Authentication required'
      }
    });
  }

  if (!req.user.isAdmin && req.user.role !== 'DIRECTORY_ADMIN') {
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
  skipAuthInDummyMode,
  resetAuthProvider
};

