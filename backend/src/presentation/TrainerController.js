// Presentation Layer - Trainer Controller
// Handles HTTP requests for trainer-related operations

const UpdateTrainerSettingsUseCase = require('../application/UpdateTrainerSettingsUseCase');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');

class TrainerController {
  constructor() {
    this.updateTrainerSettingsUseCase = new UpdateTrainerSettingsUseCase();
    this.employeeRepository = new EmployeeRepository();
    this.companyRepository = new CompanyRepository();
  }

  getRequesterDirectoryUserId(req) {
    return req.user?.directoryUserId || req.user?.id || null;
  }

  getRequesterCompanyId(req) {
    return req.user?.organizationId || req.user?.companyId || req.user?.company_id || null;
  }

  isSystemAdmin(req) {
    return req.user?.isSystemAdmin === true;
  }

  async isHrForCompany(req, companyId) {
    const requesterId = this.getRequesterDirectoryUserId(req);
    if (!requesterId) return false;
    const requesterEmployee = await this.employeeRepository.findById(requesterId);
    if (!requesterEmployee) return false;
    if (String(requesterEmployee.company_id) !== String(companyId)) return false;

    const company = await this.companyRepository.findById(companyId);
    if (!company || !company.hr_contact_email) return false;
    return (
      String(company.hr_contact_email).trim().toLowerCase() ===
      String(requesterEmployee.email || '').trim().toLowerCase()
    );
  }

  async canAccessEmployee(req, targetEmployeeId) {
    const target = await this.employeeRepository.findById(targetEmployeeId);
    if (!target) {
      return { allowed: false, reason: 'not_found', target: null };
    }
    if (this.isSystemAdmin(req)) {
      return { allowed: true, reason: 'system_admin', target };
    }
    const requesterId = this.getRequesterDirectoryUserId(req);
    if (requesterId && String(requesterId) === String(targetEmployeeId)) {
      return { allowed: true, reason: 'self', target };
    }
    const requesterCompanyId = this.getRequesterCompanyId(req);
    if (!requesterCompanyId || String(requesterCompanyId) !== String(target.company_id)) {
      return { allowed: false, reason: 'forbidden', target };
    }
    const hr = await this.isHrForCompany(req, target.company_id);
    if (hr) {
      return { allowed: true, reason: 'hr', target };
    }
    return { allowed: false, reason: 'forbidden', target };
  }

  /**
   * Get trainer settings
   * GET /api/v1/employees/:employeeId/trainer-settings
   * Requires authentication
   */
  async getTrainerSettings(req, res, next) {
    try {
      const { employeeId } = req.params;
      
      const access = await this.canAccessEmployee(req, employeeId);
      if (!access.allowed) {
        if (access.reason === 'not_found') {
          return res.status(404).json({
            error: 'Employee not found'
          });
        }
        return res.status(403).json({
          error: 'Access denied'
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
      
      // Extract data from envelope structure (payload) or direct body
      const requestData = req.body.payload || req.body;
      const { aiEnabled, publicPublishEnable } = requestData;
      
      const access = await this.canAccessEmployee(req, employeeId);
      if (!access.allowed) {
        if (access.reason === 'not_found') {
          return res.status(404).json({
            error: 'Employee not found'
          });
        }
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      // Validate input
      if (typeof aiEnabled !== 'boolean' || typeof publicPublishEnable !== 'boolean') {
        console.error('[TrainerController] Invalid input types:', {
          aiEnabled,
          aiEnabledType: typeof aiEnabled,
          publicPublishEnable,
          publicPublishEnableType: typeof publicPublishEnable,
          requestBody: req.body
        });
        return res.status(400).json({
          error: 'aiEnabled and publicPublishEnable must be booleans'
        });
      }

      // Update settings
      const result = await this.updateTrainerSettingsUseCase.execute(employeeId, {
        aiEnabled,
        publicPublishEnable
      });

      // Return response in expected format
      return res.status(200).json({
        requester_service: 'directory_service',
        response: {
          success: true,
          settings: result.settings || result
        }
      });
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
      
      const access = await this.canAccessEmployee(req, employeeId);
      if (!access.allowed) {
        if (access.reason === 'not_found') {
          return res.status(404).json({
            error: 'Employee not found'
          });
        }
        return res.status(403).json({
          error: 'Access denied'
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

