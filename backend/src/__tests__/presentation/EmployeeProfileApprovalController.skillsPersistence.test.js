// Focused tests: post-approval Skills Engine persistence guards

jest.mock('../../infrastructure/EmployeeProfileApprovalRepository');
jest.mock('../../infrastructure/EmployeeRepository');
jest.mock('../../infrastructure/CompanyRepository');
jest.mock('../../infrastructure/MicroserviceClient');
jest.mock('../../infrastructure/EmployeeSkillsRepository');

const EmployeeProfileApprovalController = require('../../presentation/EmployeeProfileApprovalController');
const EmployeeSkillsRepository = require('../../infrastructure/EmployeeSkillsRepository');

describe('EmployeeProfileApprovalController post-approval skills persistence', () => {
  let controller;
  let mockRes;
  let saveOrUpdate;

  const companyId = 'company-uuid';
  const approvalId = 'approval-uuid';
  const employeeUuid = '82434584-f857-4ad2-87f3-83cbf66f1901';

  const pendingApproval = {
    id: approvalId,
    employee_uuid: employeeUuid,
    employee_id: employeeUuid,
    company_id: companyId,
    status: 'pending'
  };

  const employee = {
    id: employeeUuid,
    company_id: companyId,
    full_name: 'Test Employee',
    target_role_in_company: 'Engineer',
    preferred_language: 'en',
    linkedin_data: { profile: 'li' },
    github_data: null,
    pdf_data: { text: 'cv' },
    manual_data: { skills: ['javascript', 'python'] }
  };

  const company = {
    id: companyId,
    company_name: 'Acme'
  };

  const validCompetencies = [
    {
      name: 'Programming',
      skills: [{ name: 'JavaScript', verified: false }]
    }
  ];

  async function flushAsyncWork() {
    // setImmediate callback + its awaited async work
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();
  }

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EmployeeProfileApprovalController();
    controller.isSystemAdmin = jest.fn().mockReturnValue(true);
    controller.isHrForCompany = jest.fn().mockResolvedValue(false);

    controller.approvalRepository.findById = jest.fn().mockResolvedValue(pendingApproval);
    controller.approvalRepository.approveProfile = jest.fn().mockResolvedValue({
      ...pendingApproval,
      status: 'approved'
    });

    controller.employeeRepository.updateProfileStatus = jest.fn().mockResolvedValue(undefined);
    controller.employeeRepository.findById = jest.fn().mockResolvedValue(employee);
    controller.employeeRepository.pool = {
      query: jest.fn().mockResolvedValue({ rows: [] })
    };

    controller.companyRepository.findById = jest.fn().mockResolvedValue(company);

    controller.microserviceClient.getEmployeeSkills = jest.fn();

    saveOrUpdate = jest.fn().mockResolvedValue({});
    EmployeeSkillsRepository.mockImplementation(() => ({
      saveOrUpdate
    }));

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  function makeReq() {
    return {
      params: { id: companyId, approvalId },
      user: { isSystemAdmin: true, directoryUserId: 'hr-uuid' }
    };
  }

  test('Test 8 — approval processing response is not persisted', async () => {
    controller.microserviceClient.getEmployeeSkills.mockResolvedValue({
      status: 'processing',
      competencies: [],
      message: 'Profile generation in progress'
    });

    await controller.approveProfile(makeReq(), mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Profile approved successfully'
      })
    );

    await flushAsyncWork();

    expect(controller.microserviceClient.getEmployeeSkills).toHaveBeenCalled();
    expect(saveOrUpdate).not.toHaveBeenCalled();
  });

  test('Test 9 — approval empty response is not persisted', async () => {
    controller.microserviceClient.getEmployeeSkills.mockResolvedValue({
      competencies: [],
      relevance_score: 0,
      message: 'User already exists'
    });

    await controller.approveProfile(makeReq(), mockRes);
    await flushAsyncWork();

    expect(saveOrUpdate).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('Test 10 — approval non-empty response is persisted', async () => {
    const skillsPayload = {
      user_id: employeeUuid,
      competencies: validCompetencies,
      relevance_score: 88
    };
    controller.microserviceClient.getEmployeeSkills.mockResolvedValue(skillsPayload);

    await controller.approveProfile(makeReq(), mockRes);
    await flushAsyncWork();

    expect(saveOrUpdate).toHaveBeenCalledTimes(1);
    expect(saveOrUpdate).toHaveBeenCalledWith(employeeUuid, skillsPayload);
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('Test 11 — processing/empty response does not attempt repository save', async () => {
    controller.microserviceClient.getEmployeeSkills.mockResolvedValue({
      status: 'processing',
      competencies: []
    });

    await controller.approveProfile(makeReq(), mockRes);
    await flushAsyncWork();

    expect(EmployeeSkillsRepository).not.toHaveBeenCalled();
    expect(saveOrUpdate).not.toHaveBeenCalled();
  });
});
