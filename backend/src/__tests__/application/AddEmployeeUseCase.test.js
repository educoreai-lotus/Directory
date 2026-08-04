// Tests for AddEmployeeUseCase department validation and createOrGet handoff

jest.mock('../../infrastructure/EmployeeRepository');
jest.mock('../../infrastructure/DepartmentRepository');
jest.mock('../../infrastructure/TeamRepository');
jest.mock('../../infrastructure/CompanyRepository');
jest.mock('../../infrastructure/CSVValidator', () => {
  return jest.fn().mockImplementation(() => ({
    isReservedAdminEmail: jest.fn().mockReturnValue(false)
  }));
});

const AddEmployeeUseCase = require('../../application/AddEmployeeUseCase');

describe('AddEmployeeUseCase department handling', () => {
  let useCase;

  const baseEmployee = {
    employee_id: 'E001',
    full_name: 'Ada Lovelace',
    email: 'ada@example.com',
    role_type: 'REGULAR_EMPLOYEE',
    team_id: 'TEAM-001',
    team_name: 'Core',
    password: 'Secret123',
    preferred_language: 'en',
    status: 'active',
    current_role_in_company: 'Engineer',
    target_role_in_company: 'Senior Engineer'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AddEmployeeUseCase();
    useCase.employeeRepository.findEmailOwner = jest.fn().mockResolvedValue(null);
    useCase.employeeRepository.findByCompanyAndEmployeeId = jest
      .fn()
      .mockResolvedValue(null);
    useCase.employeeRepository.create = jest.fn().mockResolvedValue({
      id: 'emp-uuid',
      employee_id: 'E001'
    });
    useCase.employeeRepository.createRole = jest.fn().mockResolvedValue(undefined);
    useCase.employeeRepository.assignToTeam = jest.fn().mockResolvedValue(undefined);
    useCase.departmentRepository.createOrGet = jest.fn().mockResolvedValue({
      id: 'dept-uuid',
      department_id: 'DEP-001',
      department_name: 'EDUCORE'
    });
    useCase.teamRepository.createOrGet = jest.fn().mockResolvedValue({
      id: 'team-uuid',
      team_id: 'TEAM-001'
    });
    useCase.companyRepository.beginTransaction = jest.fn().mockResolvedValue({});
    useCase.companyRepository.commitTransaction = jest.fn().mockResolvedValue(undefined);
    useCase.companyRepository.rollbackTransaction = jest.fn().mockResolvedValue(undefined);
  });

  test('valid department: createOrGet receives department_id and department_name unchanged', async () => {
    await useCase.execute('company-uuid', {
      ...baseEmployee,
      department_id: 'DEP-001',
      department_name: 'EDUCORE'
    });

    expect(useCase.departmentRepository.createOrGet).toHaveBeenCalledWith(
      'company-uuid',
      'DEP-001',
      'EDUCORE'
    );
  });

  test('missing department_id fails before repository execution', async () => {
    await expect(
      useCase.execute('company-uuid', {
        ...baseEmployee,
        department_name: 'EDUCORE'
      })
    ).rejects.toThrow(
      'Department is required. Please provide both department_id and department_name.'
    );

    expect(useCase.departmentRepository.createOrGet).not.toHaveBeenCalled();
  });

  test('missing department_name fails before repository execution', async () => {
    await expect(
      useCase.execute('company-uuid', {
        ...baseEmployee,
        department_id: 'DEP-001'
      })
    ).rejects.toThrow(
      'Department is required. Please provide both department_id and department_name.'
    );

    expect(useCase.departmentRepository.createOrGet).not.toHaveBeenCalled();
  });

  test('blank whitespace department values are treated as missing', async () => {
    await expect(
      useCase.execute('company-uuid', {
        ...baseEmployee,
        department_id: '   ',
        department_name: '  '
      })
    ).rejects.toThrow(
      'Department is required. Please provide both department_id and department_name.'
    );

    expect(useCase.departmentRepository.createOrGet).not.toHaveBeenCalled();
  });

  test('null department_id fails before repository execution', async () => {
    await expect(
      useCase.execute('company-uuid', {
        ...baseEmployee,
        department_id: null,
        department_name: 'EDUCORE'
      })
    ).rejects.toThrow(
      'Department is required. Please provide both department_id and department_name.'
    );

    expect(useCase.departmentRepository.createOrGet).not.toHaveBeenCalled();
  });
});
