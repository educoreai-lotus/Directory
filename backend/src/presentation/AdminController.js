// Presentation Layer - Admin Controller
// Handles HTTP requests for admin operations

const CompanyRepository = require('../infrastructure/CompanyRepository');

class AdminController {
  constructor() {
    this.companyRepository = new CompanyRepository();
  }

  /**
   * Get all companies (for admin dashboard)
   * GET /api/v1/admin/companies
   */
  async getAllCompanies(req, res, next) {
    try {
      console.log('[AdminController] getAllCompanies called');
      console.log('[AdminController] User:', req.user?.email, 'isAdmin:', req.user?.isAdmin);
      
      const query = `
        SELECT 
          id,
          company_name,
          industry,
          domain,
          logo_url,
          verification_status,
          created_at,
          updated_at
        FROM companies
        ORDER BY created_at DESC
      `;
      
      const result = await this.companyRepository.pool.query(query);
      console.log('[AdminController] Found companies:', result.rows.length);
      
      const companies = result.rows.map(company => ({
        id: company.id,
        company_name: company.company_name,
        industry: company.industry,
        domain: company.domain,
        logo_url: company.logo_url,
        status: company.verification_status, // 'pending', 'approved', 'rejected'
        created_date: company.created_at
      }));

      console.log('[AdminController] Returning companies:', companies.length);
      // Return data directly - formatResponse middleware will wrap it in envelope
      return res.status(200).json({
        companies: companies
      });
    } catch (error) {
      console.error('[AdminController] Error fetching companies:', error);
      return res.status(500).json({
        error: 'An error occurred while fetching companies'
      });
    }
  }

  /**
   * Get company by ID (admin view - read-only)
   * GET /api/v1/admin/companies/:companyId
   */
  async getCompany(req, res, next) {
    try {
      const { companyId } = req.params;
      
      const company = await this.companyRepository.findById(companyId);
      
      if (!company) {
        return res.status(404).json({
          error: 'Company not found'
        });
      }

      // Return data directly - formatResponse middleware will wrap it in envelope
      return res.status(200).json({
        company: {
          id: company.id,
          company_name: company.company_name,
          industry: company.industry,
          domain: company.domain,
          hr_contact_name: company.hr_contact_name,
          hr_contact_email: company.hr_contact_email,
          hr_contact_role: company.hr_contact_role,
          verification_status: company.verification_status,
          approval_policy: company.approval_policy,
          kpis: company.kpis,
          logo_url: company.logo_url,
          created_at: company.created_at,
          updated_at: company.updated_at
        }
      });
    } catch (error) {
      console.error('[AdminController] Error fetching company:', error);
      return res.status(500).json({
        error: 'An error occurred while fetching company'
      });
    }
  }

  /**
   * Get employee by ID (admin view - read-only)
   * GET /api/v1/admin/employees/:employeeId
   */
  async getEmployee(req, res, next) {
    try {
      const { employeeId } = req.params;
      const EmployeeRepository = require('../infrastructure/EmployeeRepository');
      const employeeRepository = new EmployeeRepository();
      
      const employee = await employeeRepository.findById(employeeId);
      
      if (!employee) {
        return res.status(404).json({
          error: 'Employee not found'
        });
      }

      // Get employee roles
      const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
      const rolesResult = await employeeRepository.pool.query(rolesQuery, [employeeId]);
      const roles = rolesResult.rows.map(row => row.role_type);
      const isTrainer = roles.includes('TRAINER');

      // Get trainer settings if applicable
      let trainerSettings = null;
      if (isTrainer) {
        const trainerSettingsQuery = 'SELECT * FROM trainer_settings WHERE employee_id = $1';
        const trainerSettingsResult = await employeeRepository.pool.query(trainerSettingsQuery, [employeeId]);
        trainerSettings = trainerSettingsResult.rows[0] || null;
      }

      // Get project summaries
      const projectSummariesQuery = 'SELECT * FROM employee_project_summaries WHERE employee_id = $1 ORDER BY created_at DESC';
      const projectSummariesResult = await employeeRepository.pool.query(projectSummariesQuery, [employeeId]);
      const projectSummaries = projectSummariesResult.rows;

      // Get department and team names
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
      const deptTeamResult = await employeeRepository.pool.query(deptTeamQuery, [employeeId]);
      const deptTeam = deptTeamResult.rows[0] || {};

      const employeeData = {
        ...employee,
        project_summaries: projectSummaries,
        is_trainer: isTrainer,
        trainer_settings: trainerSettings,
        roles: roles,
        department: deptTeam.department_name || null,
        team: deptTeam.team_name || null
      };

      // Return data directly - formatResponse middleware will wrap it in envelope
      return res.status(200).json({
        employee: employeeData
      });
    } catch (error) {
      console.error('[AdminController] Error fetching employee:', error);
      return res.status(500).json({
        error: 'An error occurred while fetching employee'
      });
    }
  }
}

module.exports = AdminController;

