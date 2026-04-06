// Creates the nAuth access-token provider (Directory verifies nAuth JWTs only).

const config = require('../../config');
const NAuthProvider = require('./NAuthProvider');

class AuthFactory {
  static create() {
    if (config.auth.mode !== 'nauth') {
      throw new Error(
        `Invalid AUTH_MODE: "${config.auth.mode}". Directory requires AUTH_MODE=nauth.`
      );
    }
    return new NAuthProvider();
  }

  static getMode() {
    return config.auth.mode;
  }
}

module.exports = AuthFactory;
