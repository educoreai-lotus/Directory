// Presentation Layer - Trainer Controller
// Handles HTTP requests for trainer-related operations

const UpdateTrainerSettingsUseCase = require('../application/UpdateTrainerSettingsUseCase');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const { authMiddleware } = require('../shared/authMiddleware');

class TrainerController {
  constructor() {
    this.updateTrainerSettingsUseCase = new UpdateTrainerSettingsUseCase();
    this.employeeRepository = new EmployeeRepository();
  }

  /**
   * Get trainer settings
   * GET /api/v1/employees/:employeeId/trainer-settings
   * Requires authentication
   */
  async getTrainerSettings(req, res, next) {
    try {
      const { employeeId } = req.params;
      
      // Verify employee ID matches authenticated user (unless HR)
      const authenticatedEmployeeId = req.user?.id || req.user?.employeeId;
      const isHR = req.user?.isHR || false;
      
      if (!isHR && authenticatedEmployeeId !== employeeId) {
        return res.status(403).json({
          error: 'You can only view your own trainer settings'
        });
      }

      // Check if employee is a trainer
      const isTrainer = await this.employeeRepository.isTrainer(employeeId);
      if (!isTrainer) {
        return res.status(404).json({
          error: 'Employee is not a trainer'
        });
      }

      // Get trainer settings
      const settings = await this.employeeRepository.getTrainerSettings(employeeId);
      
      if (!settings) {
        // Return default settings if none exist
        return res.status(200).json({
          settings: {
            employee_id: employeeId,
            ai_enabled: false,
            public_publish_enable: false
          }
        });
      }

      return res.status(200).json({
        settings
      });
    } catch (error) {
      console.error('[TrainerController] Error fetching trainer settings:', error);
      return res.status(500).json({
        error: 'An error occurred while fetching trainer settings'
      });
    }
  }

  /**
   * Update trainer settings
   * PUT /api/v1/employees/:employeeId/trainer-settings
   * Requires authentication
   */
  async updateTrainerSettings(req, res, next) {
    try {
      const { employeeId } = req.params;
      const { aiEnabled, publicPublishEnable } = req.body;
      
      // Verify employee ID matches authenticated user (unless HR)
      const authenticatedEmployeeId = req.user?.id || req.user?.employeeId;
      const isHR = req.user?.isHR || false;
      
      if (!isHR && authenticatedEmployeeId !== employeeId) {
        return res.status(403).json({
          error: 'You can only update your own trainer settings'
        });
      }

      // Validate input
      if (typeof aiEnabled !== 'boolean' || typeof publicPublishEnable !== 'boolean') {
        return res.status(400).json({
          error: 'aiEnabled and publicPublishEnable must be booleans'
        });
      }

      // Update settings
      const result = await this.updateTrainerSettingsUseCase.execute(employeeId, {
        aiEnabled,
        publicPublishEnable
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('[TrainerController] Error updating trainer settings:', error);
      
      if (error.message === 'Employee is not a trainer') {
        return res.status(404).json({
          error: error.message
        });
      }

      return res.status(500).json({
        error: 'An error occurred while updating trainer settings'
      });
    }
  }

  /**
   * Get courses taught by trainer
   * GET /api/v1/employees/:employeeId/courses-taught
   * Requires authentication
   * 
   * Note: This will be populated from Content Studio integration in the future
   * For now, returns empty array or mock data
   */
  async getCoursesTaught(req, res, next) {
    try {
      const { employeeId } = req.params;
      
      // Verify employee ID matches authenticated user (unless HR)
      const authenticatedEmployeeId = req.user?.id || req.user?.employeeId;
      const isHR = req.user?.isHR || false;
      
      if (!isHR && authenticatedEmployeeId !== employeeId) {
        return res.status(403).json({
          error: 'You can only view your own courses'
        });
      }

      // Check if employee is a trainer
      const isTrainer = await this.employeeRepository.isTrainer(employeeId);
      if (!isTrainer) {
        return res.status(404).json({
          error: 'Employee is not a trainer'
        });
      }

      // TODO: Fetch courses from Content Studio integration
      // For now, return empty array
      // In the future, this will query a courses table populated by Content Studio
      
      return res.status(200).json({
        courses: []
      });
    } catch (error) {
      console.error('[TrainerController] Error fetching courses taught:', error);
      return res.status(500).json({
        error: 'An error occurred while fetching courses taught'
      });
    }
  }
}

module.exports = TrainerController;

