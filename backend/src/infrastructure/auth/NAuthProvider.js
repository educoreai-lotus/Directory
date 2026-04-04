// nAuth Authentication Provider
// Validates nAuth-minted access tokens locally; authMiddleware may escalate to Coordinator when needed.

const jwt = require('jsonwebtoken');
const AuthProvider = require('./AuthProvider');
const config = require('../../config');

class NAuthProvider extends AuthProvider {
  constructor() {
    super();
    this.issuer = config.auth.nauth.issuer;
    this.audience = config.auth.nauth.audience;
    this.publicKey = config.auth.nauth.publicKey;
    this.algorithms = config.auth.nauth.algorithms;
  }

  async authenticate() {
    throw new Error('nAuth provider does not support Directory login');
  }

  extractTokenFromHeaders(headers) {
    const headerValue = headers.authorization || headers.Authorization;
    if (!headerValue) return null;
    return String(headerValue).replace(/^Bearer\s+/i, '').trim() || null;
  }

  async validateToken(token) {
    try {
      // nAuth contract: RS256 + asymmetric RSA keypair. Verify with PUBLIC KEY only.
      if (!this.publicKey) {
        return {
          valid: false,
          error: 'nAuth JWT public key is not configured (NAUTH_JWT_PUBLIC_KEY)'
        };
      }
      if (!this.issuer) {
        return { valid: false, error: 'nAuth JWT issuer is not configured (NAUTH_JWT_ISSUER)' };
      }
      if (!this.audience) {
        return { valid: false, error: 'nAuth JWT audience is not configured (NAUTH_JWT_AUDIENCE)' };
      }

      const verifyOptions = {};
      verifyOptions.issuer = this.issuer;
      verifyOptions.audience = this.audience;
      // Lock algorithms to RS256 (per nAuth).
      verifyOptions.algorithms = ['RS256'];

      // Enforce that NAUTH_JWT_ALGORITHMS is explicitly set to RS256 (operational guard).
      if (String(this.algorithms || '').trim().toUpperCase() !== 'RS256') {
        return { valid: false, error: 'Invalid NAUTH_JWT_ALGORITHMS (must be RS256)' };
      }

      console.log('[NAuthProvider] Pre-verify config:', {
        issuer: verifyOptions.issuer,
        audience: verifyOptions.audience,
        algorithms: verifyOptions.algorithms,
        publicKeyPresent: !!this.publicKey
      });

      let decoded;
      try {
        decoded = jwt.verify(token, this.publicKey, verifyOptions);
      } catch (error) {
        console.error('[NAuthProvider] jwt.verify failed (full error):', error);
        console.error('[NAuthProvider] jwt.verify error.name:', error?.name);
        console.error('[NAuthProvider] jwt.verify error.message:', error?.message);
        if (error && error.name === 'TokenExpiredError') {
          return { valid: false, error: 'Invalid or expired token', expired: true };
        }
        return { valid: false, error: 'Invalid or expired token' };
      }

      // Required token contract fields
      const sub = decoded?.sub;
      const directoryUserId = decoded?.directoryUserId;
      const organizationId = decoded?.organizationId;

      if (!sub) {
        return { valid: false, error: 'Token missing required claim: sub' };
      }
      if (!directoryUserId) {
        return { valid: false, error: 'Token missing required claim: directoryUserId' };
      }
      if (!organizationId) {
        return { valid: false, error: 'Token missing required claim: organizationId' };
      }

      // Attach trusted context using existing Directory conventions where possible.
      // Keep the contract minimal: sub, directoryUserId, organizationId are the source of truth.
      return {
        valid: true,
        user: {
          sub,
          directoryUserId,
          organizationId,
          // Compatibility aliases for existing code paths (do not use as source of truth):
          id: directoryUserId,
          companyId: organizationId,
          company_id: organizationId,
          provider: decoded?.provider
        }
      };
    } catch (error) {
      return { valid: false, error: 'Invalid or expired token' };
    }
  }
}

module.exports = NAuthProvider;
