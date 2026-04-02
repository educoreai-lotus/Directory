// Authentication Factory
// Creates the appropriate authentication provider based on configuration

const config = require('../../config');
const DummyAuthProvider = require('./DummyAuthProvider');
const AuthServiceProvider = require('./AuthServiceProvider');
const NAuthProvider = require('./NAuthProvider');

/**
 * Authentication Factory
 * Creates the appropriate authentication provider based on AUTH_MODE
 */
class AuthFactory {
  /**
   * Create authentication provider based on configuration
   * @returns {AuthProvider} - DummyAuthProvider or AuthServiceProvider
   */
  static create() {
    if (config.auth.mode === 'dummy') {
      console.log('🔐 Using Dummy Authentication Provider (Testing Only)');
      return new DummyAuthProvider();
    } else if (config.auth.mode === 'auth-service') {
      console.log('🔐 Using Auth Service Provider (Production)');
      
      // Validate required configuration
      if (!config.auth.authService.baseUrl) {
        throw new Error('AUTH_SERVICE_URL is required when AUTH_MODE=auth-service');
      }
      
      return new AuthServiceProvider();
    } else if (config.auth.mode === 'nauth') {
      console.log('🔐 Using nAuth Access Token Provider (Production)');
      return new NAuthProvider();
    } else {
      throw new Error(`Invalid AUTH_MODE: ${config.auth.mode}. Must be 'dummy' or 'auth-service'`);
    }
  }

  /**
   * Get current authentication mode
   * @returns {string} - 'dummy' or 'auth-service'
   */
  static getMode() {
    return config.auth.mode;
  }
}

module.exports = AuthFactory;

