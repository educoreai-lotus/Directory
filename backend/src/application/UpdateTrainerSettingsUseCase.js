// Application Layer - Update Trainer Settings Use Case
// Handles updating trainer-specific settings (AI enabled, public publish)

const EmployeeRepository = require('../infrastructure/EmployeeRepository');

class UpdateTrainerSettingsUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
  }

  /**
   * Update trainer settings
   * @param {string} employeeId - Employee UUID
   * @param {Object} settings - Settings object with aiEnabled and publicPublishEnable
   * @returns {Promise<Object>} Updated settings
   */
  async execute(employeeId, settings) {
    try {
      // Verify employee is a trainer
      const isTrainer = await this.employeeRepository.isTrainer(employeeId);
      if (!isTrainer) {
        throw new Error('Employee is not a trainer');
      }

      // Validate settings
      const { aiEnabled, publicPublishEnable } = settings;
      
      if (typeof aiEnabled !== 'boolean') {
        throw new Error('aiEnabled must be a boolean');
      }
      
      if (typeof publicPublishEnable !== 'boolean') {
        throw new Error('publicPublishEnable must be a boolean');
      }

      // Update trainer settings
      const updatedSettings = await this.employeeRepository.updateTrainerSettings(
        employeeId,
        aiEnabled,
        publicPublishEnable
      );

      return {
        success: true,
        settings: updatedSettings
      };
    } catch (error) {
      console.error('[UpdateTrainerSettingsUseCase] Error:', error);
      throw error;
    }
  }
}

module.exports = UpdateTrainerSettingsUseCase;

