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
   * @param {string} companyId - Company UUID (for validation)
   * @returns {Promise<Object|null>} Hierarchy structure or null if not a manager
   */
  async execute(managerId, companyId) {
    console.log(`[GetManagerHierarchyUseCase] Executing for manager ${managerId} in company ${companyId}`);
    
    // Get employee and their roles
    const employee = await this.employeeRepository.findById(managerId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    console.log(`[GetManagerHierarchyUseCase] Found employee: ${employee.full_name} (${employee.email})`);

    // Get employee roles
    const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
    const rolesResult = await this.employeeRepository.pool.query(rolesQuery, [managerId]);
    const roles = rolesResult.rows.map(row => row.role_type);
    console.log(`[GetManagerHierarchyUseCase] Employee roles:`, roles);

    // Check if employee is a manager
    const isDepartmentManager = roles.includes('DEPARTMENT_MANAGER');
    const isTeamManager = roles.includes('TEAM_MANAGER');
    console.log(`[GetManagerHierarchyUseCase] Is Department Manager: ${isDepartmentManager}, Is Team Manager: ${isTeamManager}`);

    if (!isDepartmentManager && !isTeamManager) {
      console.log(`[GetManagerHierarchyUseCase] Employee is not a manager`);
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
      // Team Manager: Find which team they manage
      // First, try to find team from employee_managers (if they have managed employees)
      let managedTeamQuery = `
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
      let teamResult = await this.employeeRepository.pool.query(managedTeamQuery, [managerId]);
      
      // If no managed employees found, get the team the manager belongs to directly
      if (teamResult.rows.length === 0) {
        console.log(`[GetManagerHierarchyUseCase] No managed employees found for team manager ${managerId}, checking manager's own team assignment`);
        const managerTeamQuery = `
          SELECT 
            t.id,
            t.team_id,
            t.team_name
          FROM employee_teams et
          JOIN teams t ON et.team_id = t.id
          WHERE et.employee_id = $1
          LIMIT 1
        `;
        teamResult = await this.employeeRepository.pool.query(managerTeamQuery, [managerId]);
      }
      
      if (teamResult.rows.length === 0) {
        console.log(`[GetManagerHierarchyUseCase] No team found for team manager ${managerId}`);
        return null; // No team found
      }

      const team = teamResult.rows[0];
      console.log(`[GetManagerHierarchyUseCase] Found team for manager ${managerId}: ${team.team_name} (${team.team_id})`);

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

