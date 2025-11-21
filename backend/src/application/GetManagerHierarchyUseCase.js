// Application Layer - Get Manager Hierarchy Use Case
// Retrieves the hierarchy of teams and employees managed by a manager

const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const DepartmentRepository = require('../infrastructure/DepartmentRepository');
const TeamRepository = require('../infrastructure/TeamRepository');

class GetManagerHierarchyUseCase {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.departmentRepository = new DepartmentRepository();
    this.teamRepository = new TeamRepository();
  }

  /**
   * Get manager hierarchy (teams and employees they manage)
   * @param {string} managerId - Manager employee UUID
   * @returns {Promise<Object|null>} Hierarchy structure or null if not a manager
   */
  async execute(managerId) {
    // Get employee and their roles
    const employee = await this.employeeRepository.findById(managerId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get employee roles
    const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
    const rolesResult = await this.employeeRepository.pool.query(rolesQuery, [managerId]);
    const roles = rolesResult.rows.map(row => row.role_type);

    // Check if employee is a manager
    const isDepartmentManager = roles.includes('DEPARTMENT_MANAGER');
    const isTeamManager = roles.includes('TEAM_MANAGER');

    if (!isDepartmentManager && !isTeamManager) {
      return null; // Not a manager
    }

    let hierarchy = null;

    if (isDepartmentManager) {
      // Department Manager: Find which department they manage by looking at managed employees
      // Get all employees they manage with department_manager relationship
      const managedEmployeesQuery = `
        SELECT DISTINCT
          d.id as department_uuid,
          d.department_id as department_code,
          d.department_name
        FROM employee_managers em
        JOIN employees e ON em.employee_id = e.id
        JOIN employee_teams et ON e.id = et.employee_id
        JOIN teams t ON et.team_id = t.id
        JOIN departments d ON t.department_id = d.id
        WHERE em.manager_id = $1
          AND em.relationship_type = 'department_manager'
        LIMIT 1
      `;
      const deptResult = await this.employeeRepository.pool.query(managedEmployeesQuery, [managerId]);
      
      if (deptResult.rows.length === 0) {
        return null; // No department found
      }

      const department = deptResult.rows[0];

      // Get all teams in this department (using department UUID)
      const teamsQuery = `
        SELECT t.id, t.team_id, t.team_name
        FROM teams t
        WHERE t.department_id = $1
        ORDER BY t.team_name
      `;
      const teamsResult = await this.employeeRepository.pool.query(teamsQuery, [department.department_uuid]);
      const teams = teamsResult.rows;

      // Get all employees in each team
      const teamsWithEmployees = await Promise.all(
        teams.map(async (team) => {
          const employeesQuery = `
            SELECT 
              e.id,
              e.employee_id,
              e.full_name,
              e.email,
              e.current_role_in_company,
              e.profile_photo_url
            FROM employees e
            JOIN employee_teams et ON e.id = et.employee_id
            WHERE et.team_id = $1
            ORDER BY e.full_name
          `;
          const employeesResult = await this.employeeRepository.pool.query(employeesQuery, [team.id]);
          
          return {
            team: {
              id: team.id,
              team_id: team.team_id,
              team_name: team.team_name
            },
            employees: employeesResult.rows
          };
        })
      );

      hierarchy = {
        manager_type: 'department_manager',
        department: {
          id: department.department_uuid,
          department_code: department.department_code,
          department_name: department.department_name
        },
        teams: teamsWithEmployees
      };
    } else if (isTeamManager) {
      // Team Manager: Find which team they manage by looking at managed employees
      const managedTeamQuery = `
        SELECT DISTINCT
          t.id,
          t.team_id,
          t.team_name
        FROM employee_managers em
        JOIN employees e ON em.employee_id = e.id
        JOIN employee_teams et ON e.id = et.employee_id
        JOIN teams t ON et.team_id = t.id
        WHERE em.manager_id = $1
          AND em.relationship_type = 'team_manager'
        LIMIT 1
      `;
      const teamResult = await this.employeeRepository.pool.query(managedTeamQuery, [managerId]);
      
      if (teamResult.rows.length === 0) {
        return null; // No team found
      }

      const team = teamResult.rows[0];

      // Get all employees in this team
      const employeesQuery = `
        SELECT 
          e.id,
          e.employee_id,
          e.full_name,
          e.email,
          e.current_role_in_company,
          e.profile_photo_url
        FROM employees e
        JOIN employee_teams et ON e.id = et.employee_id
        WHERE et.team_id = $1
        ORDER BY e.full_name
      `;
      const employeesResult = await this.employeeRepository.pool.query(employeesQuery, [team.id]);

      hierarchy = {
        manager_type: 'team_manager',
        team: {
          id: team.id,
          team_id: team.team_id,
          team_name: team.team_name
        },
        employees: employeesResult.rows
      };
    }

    return hierarchy;
  }
}

module.exports = GetManagerHierarchyUseCase;

