// Tests for EmployeeController.addEmployee request-body envelope unwrap

jest.mock('../../application/AddEmployeeUseCase');
jest.mock('../../application/UpdateEmployeeUseCase');
jest.mock('../../application/DeleteEmployeeUseCase');
jest.mock('../../application/GetEmployeeSkillsUseCase');
jest.mock('../../application/GetEmployeeCareerPathCompetenciesUseCase');
jest.mock('../../application/GetEmployeeCoursesUseCase');
jest.mock('../../application/GetEmployeeLearningPathUseCase');
jest.mock('../../application/GetEmployeeDashboardUseCase');
jest.mock('../../application/GetManagerHierarchyUseCase');
jest.mock('../../infrastructure/EmployeeRepository');
jest.mock('../../infrastructure/CompanyRepository');
jest.mock('../../infrastructure/AdminRepository');

const EmployeeController = require('../../presentation/EmployeeController');

describe('EmployeeController.addEmployee body extraction', () => {
  let controller;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EmployeeController();
    controller.isSystemAdmin = jest.fn().mockReturnValue(true);
    controller.isHrForCompany = jest.fn().mockResolvedValue(false);
    controller.addEmployeeUseCase.execute = jest.fn().mockResolvedValue({
      id: 'emp-uuid',
      employee_id: 'E001'
    });

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  test('wrapped request: execute receives payload object, not envelope root', async () => {
    const payload = {
      employee_id: 'E001',
      full_name: 'Ada Lovelace',
      email: 'ada@example.com',
      role_type: 'REGULAR_EMPLOYEE',
      department_id: 'DEP-001',
      department_name: 'EDUCORE',
      team_id: 'TEAM-001',
      team_name: 'Core',
      password: 'Secret123',
      preferred_language: 'en',
      status: 'active',
      current_role_in_company: 'Engineer',
      target_role_in_company: 'Senior Engineer'
    };

    const req = {
      params: { id: 'company-uuid' },
      body: {
        requester_service: 'directory-service',
        payload
      },
      user: { isSystemAdmin: true }
    };

    await controller.addEmployee(req, mockRes);

    expect(controller.addEmployeeUseCase.execute).toHaveBeenCalledWith(
      'company-uuid',
      payload
    );
    expect(controller.addEmployeeUseCase.execute.mock.calls[0][1]).not.toHaveProperty(
      'requester_service'
    );
    expect(controller.addEmployeeUseCase.execute.mock.calls[0][1].department_id).toBe(
      'DEP-001'
    );
    expect(controller.addEmployeeUseCase.execute.mock.calls[0][1].department_name).toBe(
      'EDUCORE'
    );
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  test('direct request: execute receives flat body', async () => {
    const body = {
      employee_id: 'E002',
      full_name: 'Grace Hopper',
      email: 'grace@example.com',
      role_type: 'REGULAR_EMPLOYEE',
      department_id: 'DEP-002',
      department_name: 'Engineering',
      team_id: 'TEAM-002',
      team_name: 'Backend',
      password: 'Secret123',
      preferred_language: 'en',
      status: 'active',
      current_role_in_company: 'Engineer',
      target_role_in_company: 'Lead'
    };

    const req = {
      params: { id: 'company-uuid' },
      body,
      user: { isSystemAdmin: true }
    };

    await controller.addEmployee(req, mockRes);

    expect(controller.addEmployeeUseCase.execute).toHaveBeenCalledWith(
      'company-uuid',
      body
    );
    expect(controller.addEmployeeUseCase.execute.mock.calls[0][1].department_id).toBe(
      'DEP-002'
    );
    expect(controller.addEmployeeUseCase.execute.mock.calls[0][1].department_name).toBe(
      'Engineering'
    );
    expect(controller.addEmployeeUseCase.execute.mock.calls[0][1].employee_id).toBe('E002');
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  test('department validation error returns HTTP 400', async () => {
    controller.addEmployeeUseCase.execute = jest.fn().mockRejectedValue(
      new Error(
        'Department is required. Please provide both department_id and department_name.'
      )
    );

    const req = {
      params: { id: 'company-uuid' },
      body: {
        requester_service: 'directory-service',
        payload: { employee_id: 'E003', email: 'a@b.com' }
      },
      user: { isSystemAdmin: true }
    };

    await controller.addEmployee(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error:
        'Department is required. Please provide both department_id and department_name.'
    });
  });
});
