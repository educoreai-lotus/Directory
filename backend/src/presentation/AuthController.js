// Presentation Layer - Authentication Controller
// Handles HTTP requests for authentication

const AuthenticateUserUseCase = require('../application/AuthenticateUserUseCase');

class AuthController {
  constructor() {
    this.authenticateUserUseCase = new AuthenticateUserUseCase();
  }

  /**
   * Handle login request
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      const result = await this.authenticateUserUseCase.execute(email, password);

      if (result.success) {
        return res.status(200).json({
          success: true,
          token: result.token,
          user: result.user
        });
      } else {
        return res.status(401).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('[AuthController] Login error:', error);
      return res.status(500).json({
        error: 'An error occurred during login. Please try again.'
      });
    }
  }

  /**
   * Handle logout request (optional - for future use)
   * POST /api/v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      // In dummy mode, logout is just clearing the token on client side
      // In real auth mode, we might invalidate the token on server
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('[AuthController] Logout error:', error);
      return res.status(500).json({
        error: 'An error occurred during logout. Please try again.'
      });
    }
  }

  /**
   * Get current user info (validate token)
   * GET /api/v1/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      // This endpoint requires authentication middleware
      // req.user should be set by authMiddleware
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      return res.status(200).json({
        user: req.user
      });
    } catch (error) {
      console.error('[AuthController] Get current user error:', error);
      return res.status(500).json({
        error: 'An error occurred. Please try again.'
      });
    }
  }
}

module.exports = AuthController;

