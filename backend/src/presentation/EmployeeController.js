// Presentation Layer - Employee Controller
// Handles HTTP requests for employee CRUD operations

const AddEmployeeUseCase = require('../application/AddEmployeeUseCase');
const UpdateEmployeeUseCase = require('../application/UpdateEmployeeUseCase');
const DeleteEmployeeUseCase = require('../application/DeleteEmployeeUseCase');
const GetEmployeeSkillsUseCase = require('../application/GetEmployeeSkillsUseCase');
const GetEmployeeCareerPathCompetenciesUseCase = require('../application/GetEmployeeCareerPathCompetenciesUseCase');
const GetEmployeeCoursesUseCase = require('../application/GetEmployeeCoursesUseCase');
const GetEmployeeLearningPathUseCase = require('../application/GetEmployeeLearningPathUseCase');
const GetEmployeeDashboardUseCase = require('../application/GetEmployeeDashboardUseCase');
const GetManagerHierarchyUseCase = require('../application/GetManagerHierarchyUseCase');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const ErrorTranslator = require('../shared/ErrorTranslator');

class EmployeeController {
  constructor() {
    this.addEmployeeUseCase = new AddEmployeeUseCase();
    this.updateEmployeeUseCase = new UpdateEmployeeUseCase();
    this.deleteEmployeeUseCase = new DeleteEmployeeUseCase();
    this.getEmployeeSkillsUseCase = new GetEmployeeSkillsUseCase();
    this.getEmployeeCareerPathCompetenciesUseCase = new GetEmployeeCareerPathCompetenciesUseCase();
    this.getEmployeeCoursesUseCase = new GetEmployeeCoursesUseCase();
    this.getEmployeeLearningPathUseCase = new GetEmployeeLearningPathUseCase();
    this.getEmployeeDashboardUseCase = new GetEmployeeDashboardUseCase();
    this.getManagerHierarchyUseCase = new GetManagerHierarchyUseCase();
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

  async canAccessEmployee(req, companyId, targetEmployeeId) {
    const target = await this.employeeRepository.findById(targetEmployeeId);
    if (!target || String(target.company_id) !== String(companyId)) {
      return { allowed: false, reason: 'not_found', target: null };
    }

    if (this.isSystemAdmin(req)) {
      return { allowed: true, reason: 'system_admin', target };
    }

    const requesterCompanyId = this.getRequesterCompanyId(req);
    if (!requesterCompanyId || String(requesterCompanyId) !== String(companyId)) {
      return { allowed: false, reason: 'forbidden', target };
    }

    const requesterId = this.getRequesterDirectoryUserId(req);
    if (requesterId && String(requesterId) === String(targetEmployeeId)) {
      return { allowed: true, reason: 'self', target };
    }

    const hr = await this.isHrForCompany(req, companyId);
    if (hr) {
      return { allowed: true, reason: 'hr', target };
    }

    return { allowed: false, reason: 'forbidden', target };
  }

  async enforceEmployeeDataAccess(req, res, companyId, employeeId) {
    const access = await this.canAccessEmployee(req, companyId, employeeId);
    if (!access.allowed) {
      if (access.reason === 'not_found') {
        res.status(404).json({ error: 'Employee not found' });
      } else {
        res.status(403).json({ error: 'Access denied' });
      }
      return { ok: false, access: null };
    }
    return { ok: true, access };
  }

  /**
   * Add a new employee
   * POST /api/v1/companies/:id/employees
   */
  async addEmployee(req, res, next) {
    try {
      const { id: companyId } = req.params;
      const employeeData = req.body;

      const admin = this.isSystemAdmin(req);
      const hr = await this.isHrForCompany(req, companyId);
      if (!admin && !hr) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      console.log(`[EmployeeController] Adding employee for company ${companyId}`);

      const employee = await this.addEmployeeUseCase.execute(companyId, employeeData);

      res.status(201).json({
        employee,
        message: 'Employee added successfully'
      });
    } catch (error) {
      console.error('[EmployeeController] Error adding employee:', error);
      const userFriendlyMessage = ErrorTranslator.translateError(error);
      
      let statusCode = 500;
      if (error.message.includes('already registered') || 
          error.message.includes('already exists') ||
          error.message.includes('Email')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: userFriendlyMessage
      });
    }
  }

  /**
   * Update an employee
   * PUT /api/v1/companies/:id/employees/:employeeId
   */
  async updateEmployee(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      
      // Extract data from envelope structure (payload) or direct body
      const employeeData = req.body.payload || req.body;
      const access = await this.canAccessEmployee(req, companyId, employeeId);
      if (!access.allowed) {
        if (access.reason === 'not_found') {
          return res.status(404).json({ error: 'Employee not found' });
        }
        return res.status(403).json({ error: 'Access denied' });
      }

      const isPrivileged = this.isSystemAdmin(req) || (await this.isHrForCompany(req, companyId));
      if (!isPrivileged && access.reason === 'self') {
        const allowedSelfKeys = new Set(['preferred_language', 'bio', 'value_proposition']);
        const sanitized = {};
        for (const [key, value] of Object.entries(employeeData || {})) {
          if (allowedSelfKeys.has(key)) {
            sanitized[key] = value;
          }
        }
        Object.keys(employeeData || {}).forEach((k) => delete employeeData[k]);
        Object.assign(employeeData, sanitized);
      }
      
      console.log(`[EmployeeController] Updating employee ${employeeId} for company ${companyId}`);
      console.log(`[EmployeeController] Employee data received:`, {
        preferred_language: employeeData.preferred_language,
        bio: employeeData.bio ? `${employeeData.bio.substring(0, 50)}...` : undefined,
        value_proposition: employeeData.value_proposition ? `${employeeData.value_proposition.substring(0, 50)}...` : undefined
      });

      const employee = await this.updateEmployeeUseCase.execute(companyId, employeeId, employeeData);

      res.status(200).json({
        employee,
        message: 'Employee updated successfully'
      });
    } catch (error) {
      console.error('[EmployeeController] Error updating employee:', error);
      const userFriendlyMessage = ErrorTranslator.translateError(error);
      
      let statusCode = 500;
      if (error.message === 'Employee not found') {
        statusCode = 404;
      } else if (error.message.includes('already registered') || error.message.includes('Email')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: userFriendlyMessage
      });
    }
  }

  /**
   * Delete an employee (soft delete - mark as inactive)
   * DELETE /api/v1/companies/:id/employees/:employeeId
   */
  async deleteEmployee(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      const admin = this.isSystemAdmin(req);
      const hr = await this.isHrForCompany(req, companyId);
      if (!admin && !hr) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      const access = await this.canAccessEmployee(req, companyId, employeeId);
      if (!access.allowed) {
        if (access.reason === 'not_found') {
          return res.status(404).json({ error: 'Employee not found' });
        }
        return res.status(403).json({ error: 'Access denied' });
      }

      console.log(`[EmployeeController] Deleting employee ${employeeId} for company ${companyId}`);

      const employee = await this.deleteEmployeeUseCase.execute(companyId, employeeId);

      res.status(200).json({
        employee,
        message: 'Employee deleted successfully (marked as inactive)'
      });
    } catch (error) {
      console.error('[EmployeeController] Error deleting employee:', error);
      const userFriendlyMessage = ErrorTranslator.translateError(error);
      
      const statusCode = error.message === 'Employee not found' ? 404 : 500;

      res.status(statusCode).json({
        error: userFriendlyMessage
      });
    }
  }

  /**
   * Get a single employee
   * GET /api/v1/companies/:id/employees/:employeeId
   */
  async getEmployee(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      const access = await this.canAccessEmployee(req, companyId, employeeId);
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
      const employee = access.target;
      if (!employee) {
        return res.status(404).json({
          error: 'Employee not found'
        });
      }

      // Fetch department and team names
      const deptTeamQuery = `
        SELECT 
          d.department_name,
          t.team_name
        FROM employees e
        LEFT JOIN employee_teams et ON e.id = et.employee_id
        LEFT JOIN teams t ON et.team_id = t.id
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE e.id = $1
        LIMIT 1
      `;
      const deptTeamResult = await this.employeeRepository.pool.query(deptTeamQuery, [employeeId]);
      const deptTeam = deptTeamResult.rows[0] || {};

      // Fetch project summaries if enrichment is completed
      let projectSummaries = [];
      if (employee.enrichment_completed) {
        try {
          projectSummaries = await this.employeeRepository.getProjectSummaries(employeeId);
        } catch (error) {
          console.warn('[EmployeeController] Could not fetch project summaries:', error.message);
        }
      }

      // Check if employee is a trainer and fetch trainer settings
      let trainerSettings = null;
      const isTrainer = await this.employeeRepository.isTrainer(employeeId);
      if (isTrainer) {
        try {
          trainerSettings = await this.employeeRepository.getTrainerSettings(employeeId);
        } catch (error) {
          console.warn('[EmployeeController] Could not fetch trainer settings:', error.message);
        }
      }

      // Fetch employee roles
      const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
      const rolesResult = await this.employeeRepository.pool.query(rolesQuery, [employeeId]);
      const roles = rolesResult.rows.map(row => row.role_type);
      const isDecisionMaker = roles.includes('DECISION_MAKER');

      // Combine employee data with project summaries, trainer settings, roles, department, and team
      const employeeData = {
        ...employee,
        project_summaries: projectSummaries,
        is_trainer: isTrainer,
        trainer_settings: trainerSettings,
        roles: roles,
        is_decision_maker: isDecisionMaker,
        department: deptTeam.department_name || null,
        team: deptTeam.team_name || null
      };

      res.status(200).json({
        employee: employeeData
      });
    } catch (error) {
      console.error('[EmployeeController] Error fetching employee:', error);
      res.status(500).json({
        error: 'An error occurred while fetching employee'
      });
    }
  }

  /**
   * Get employee skills from Skills Engine
   * GET /api/v1/companies/:id/employees/:employeeId/skills
   */
  async getEmployeeSkills(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      const authz = await this.enforceEmployeeDataAccess(req, res, companyId, employeeId);
      if (!authz.ok) return;

      const result = await this.getEmployeeSkillsUseCase.execute(employeeId, companyId);

      res.status(200).json({
        success: true,
        skills: result.skills
      });
    } catch (error) {
      console.error('[EmployeeController] Error fetching employee skills:', error);
      const statusCode = error.message.includes('not found') ? 404 
        : error.message.includes('approved') ? 403 
        : 500;
      
      res.status(statusCode).json({
        error: error.message || 'An error occurred while fetching employee skills'
      });
    }
  }

  /**
   * Get employee career path competencies
   * GET /api/v1/companies/:id/employees/:employeeId/career-path-competencies
   */
  async getEmployeeCareerPathCompetencies(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      const authz = await this.enforceEmployeeDataAccess(req, res, companyId, employeeId);
      if (!authz.ok) return;

      const result = await this.getEmployeeCareerPathCompetenciesUseCase.execute(employeeId, companyId);

      res.status(200).json({
        success: true,
        competencies: result.competencies
      });
    } catch (error) {
      console.error('[EmployeeController] Error fetching career path competencies:', error);
      const statusCode = error.message.includes('not found') ? 404 
        : error.message.includes('approved') ? 403 
        : 500;
      
      res.status(statusCode).json({
        error: error.message || 'An error occurred while fetching career path competencies'
      });
    }
  }

  /**
   * Get employee courses from Course Builder
   * GET /api/v1/companies/:id/employees/:employeeId/courses
   */
  async getEmployeeCourses(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      const authz = await this.enforceEmployeeDataAccess(req, res, companyId, employeeId);
      if (!authz.ok) return;

      const result = await this.getEmployeeCoursesUseCase.execute(employeeId, companyId);

      res.status(200).json({
        success: true,
        courses: result.courses
      });
    } catch (error) {
      console.error('[EmployeeController] Error fetching employee courses:', error);
      const statusCode = error.message.includes('not found') ? 404 
        : error.message.includes('approved') ? 403 
        : 500;
      
      res.status(statusCode).json({
        error: error.message || 'An error occurred while fetching employee courses'
      });
    }
  }

  /**
   * Get employee learning path from Learner AI
   * GET /api/v1/companies/:id/employees/:employeeId/learning-path
   */
  async getEmployeeLearningPath(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      const authz = await this.enforceEmployeeDataAccess(req, res, companyId, employeeId);
      if (!authz.ok) return;

      const result = await this.getEmployeeLearningPathUseCase.execute(employeeId, companyId);

      res.status(200).json({
        success: true,
        learningPath: result.learningPath
      });
    } catch (error) {
      console.error('[EmployeeController] Error fetching employee learning path:', error);
      const statusCode = error.message.includes('not found') ? 404 
        : error.message.includes('approved') ? 403 
        : 500;
      
      res.status(statusCode).json({
        error: error.message || 'An error occurred while fetching employee learning path'
      });
    }
  }

  /**
   * Get employee dashboard from Learning Analytics
   * GET /api/v1/companies/:id/employees/:employeeId/dashboard
   */
  async getEmployeeDashboard(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;
      const authz = await this.enforceEmployeeDataAccess(req, res, companyId, employeeId);
      if (!authz.ok) return;

      const result = await this.getEmployeeDashboardUseCase.execute(employeeId, companyId);

      res.status(200).json({
        success: true,
        dashboard: result.dashboard
      });
    } catch (error) {
      console.error('[EmployeeController] Error fetching employee dashboard:', error);
      const statusCode = error.message.includes('not found') ? 404 
        : error.message.includes('approved') ? 403 
        : 500;
      
      res.status(statusCode).json({
        error: error.message || 'An error occurred while fetching employee dashboard'
      });
    }
  }

  /**
   * Get manager hierarchy (teams and employees they manage)
   * GET /api/v1/companies/:id/employees/:employeeId/management-hierarchy
   */
  async getManagerHierarchy(req, res, next) {
    try {
      const { id: companyId, employeeId } = req.params;

      console.log(`[EmployeeController] ========== GET MANAGER HIERARCHY ==========`);
      console.log(`[EmployeeController] Request params - companyId: ${companyId}, employeeId: ${employeeId}`);
      console.log(`[EmployeeController] Request path: ${req.path}`);
      console.log(`[EmployeeController] Request method: ${req.method}`);

      const authz = await this.enforceEmployeeDataAccess(req, res, companyId, employeeId);
      if (!authz.ok) return;
      const employee = authz.access.target;

      console.log(`[EmployeeController] ✅ Found employee: ${employee.full_name} (${employee.email})`);
      console.log(`[EmployeeController] Employee company_id: ${employee.company_id} (type: ${typeof employee.company_id})`);
      console.log(`[EmployeeController] Request companyId: ${companyId} (type: ${typeof companyId})`);

      console.log(`[EmployeeController] ✅ Company match verified. Calling GetManagerHierarchyUseCase...`);
      const hierarchy = await this.getManagerHierarchyUseCase.execute(employeeId, companyId);

      if (!hierarchy) {
        console.log(`[EmployeeController] ❌ No hierarchy returned. Employee ${employeeId} is not a manager or has no managed teams/employees`);
        console.log(`[EmployeeController] This could mean:`);
        console.log(`[EmployeeController]   1. Employee does not have DEPARTMENT_MANAGER or TEAM_MANAGER role`);
        console.log(`[EmployeeController]   2. Employee has manager role but is not assigned to any team/department`);
        console.log(`[EmployeeController]   3. Employee has manager role but team/department has no employees`);
        return res.status(404).json({
          requester_service: 'directory_service',
          response: {
            error: 'Employee is not a manager or has no managed teams/employees'
          }
        });
      }

      console.log(`[EmployeeController] ✅ Successfully retrieved hierarchy for manager ${employeeId}`);
      console.log(`[EmployeeController] Hierarchy type: ${hierarchy.manager_type}`);
      if (hierarchy.manager_type === 'department_manager') {
        console.log(`[EmployeeController] Department: ${hierarchy.department?.department_name}, Teams: ${hierarchy.teams?.length || 0}`);
      } else if (hierarchy.manager_type === 'team_manager') {
        console.log(`[EmployeeController] Team: ${hierarchy.team?.team_name}, Employees: ${hierarchy.employees?.length || 0}`);
      }
      
      res.status(200).json({
        requester_service: 'directory_service',
        response: {
          success: true,
          hierarchy: hierarchy
        }
      });
    } catch (error) {
      console.error('[EmployeeController] Error fetching manager hierarchy:', error);
      res.status(500).json({
        requester_service: 'directory_service',
        response: {
          error: error.message || 'An error occurred while fetching manager hierarchy'
        }
      });
    }
  }
}

module.exports = EmployeeController;

