// Focused tests: empty-cache miss, raw-data parity, processing/empty persist guards

jest.mock('../../infrastructure/EmployeeRepository');
jest.mock('../../infrastructure/CompanyRepository');
jest.mock('../../infrastructure/EmployeeSkillsRepository');
jest.mock('../../infrastructure/MicroserviceClient');

const GetEmployeeSkillsUseCase = require('../../application/GetEmployeeSkillsUseCase');
const EmployeeRepository = require('../../infrastructure/EmployeeRepository');
const CompanyRepository = require('../../infrastructure/CompanyRepository');
const EmployeeSkillsRepository = require('../../infrastructure/EmployeeSkillsRepository');
const MicroserviceClient = require('../../infrastructure/MicroserviceClient');

describe('GetEmployeeSkillsUseCase skills cache and persistence', () => {
  let useCase;
  let skillsRepository;
  let microserviceClient;

  const employeeId = '82434584-f857-4ad2-87f3-83cbf66f1901';
  const companyId = 'company-uuid';

  const baseEmployee = {
    id: employeeId,
    company_id: companyId,
    full_name: 'Test Employee',
    profile_status: 'approved',
    target_role_in_company: 'Engineer',
    preferred_language: 'en',
    linkedin_data: { profile: 'linkedin-profile' },
    github_data: null,
    pdf_data: { text: 'cv-content' },
    manual_data: { skills: ['javascript', 'python'] }
  };

  const validCompetencies = [
    {
      name: 'Programming',
      skills: [{ name: 'JavaScript', verified: false }]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetEmployeeSkillsUseCase();

    useCase.employeeRepository.findById = jest.fn().mockResolvedValue(baseEmployee);
    useCase.employeeRepository.pool = {
      query: jest.fn().mockResolvedValue({ rows: [] })
    };

    useCase.companyRepository.findById = jest.fn().mockResolvedValue({
      id: companyId,
      company_name: 'Acme'
    });

    skillsRepository = useCase.skillsRepository;
    skillsRepository.findByEmployeeId = jest.fn();
    skillsRepository.saveOrUpdate = jest.fn().mockResolvedValue({});

    microserviceClient = useCase.microserviceClient;
    microserviceClient.getEmployeeSkills = jest.fn();
  });

  test('Test 1 — non-empty cache remains a cache hit', async () => {
    skillsRepository.findByEmployeeId.mockResolvedValue({
      employee_id: employeeId,
      competencies: validCompetencies,
      relevance_score: 80,
      gap: null
    });

    const result = await useCase.execute(employeeId, companyId);

    expect(microserviceClient.getEmployeeSkills).not.toHaveBeenCalled();
    expect(skillsRepository.saveOrUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.skills.competencies).toHaveLength(1);
    expect(result.skills.competencies[0].name).toBe('Programming');
  });

  test('Test 2 — empty cache is a cache miss', async () => {
    skillsRepository.findByEmployeeId.mockResolvedValue({
      employee_id: employeeId,
      competencies: [],
      relevance_score: 0,
      gap: null
    });
    microserviceClient.getEmployeeSkills.mockResolvedValue({
      status: 'processing',
      competencies: [],
      relevance_score: 0
    });

    await useCase.execute(employeeId, companyId);

    expect(microserviceClient.getEmployeeSkills).toHaveBeenCalledTimes(1);
  });

  test('Test 3 — malformed cache is a cache miss', async () => {
    skillsRepository.findByEmployeeId.mockResolvedValue({
      employee_id: employeeId,
      competencies: {},
      relevance_score: 0,
      gap: null
    });
    microserviceClient.getEmployeeSkills.mockResolvedValue({
      status: 'processing',
      competencies: [],
      relevance_score: 0
    });

    await useCase.execute(employeeId, companyId);

    expect(microserviceClient.getEmployeeSkills).toHaveBeenCalledTimes(1);
  });

  test('Test 4 — processing response is not persisted', async () => {
    skillsRepository.findByEmployeeId.mockResolvedValue(null);
    microserviceClient.getEmployeeSkills.mockResolvedValue({
      status: 'processing',
      competencies: [],
      relevance_score: 0,
      message: 'Profile generation in progress'
    });

    const result = await useCase.execute(employeeId, companyId);

    expect(skillsRepository.saveOrUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.skills.competencies).toEqual([]);
  });

  test('Test 5 — old "User already exists" empty response is not persisted', async () => {
    skillsRepository.findByEmployeeId.mockResolvedValue(null);
    microserviceClient.getEmployeeSkills.mockResolvedValue({
      user_id: 0,
      competencies: [],
      relevance_score: 0,
      userId: employeeId,
      message: 'User already exists'
    });

    const result = await useCase.execute(employeeId, companyId);

    expect(skillsRepository.saveOrUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.skills.competencies).toEqual([]);
  });

  test('Test 6 — completed response is persisted', async () => {
    skillsRepository.findByEmployeeId.mockResolvedValue(null);
    const completed = {
      user_id: employeeId,
      competencies: validCompetencies,
      relevance_score: 72.5,
      gap: null
    };
    microserviceClient.getEmployeeSkills.mockResolvedValue(completed);

    const result = await useCase.execute(employeeId, companyId);

    expect(skillsRepository.saveOrUpdate).toHaveBeenCalledTimes(1);
    expect(skillsRepository.saveOrUpdate).toHaveBeenCalledWith(employeeId, completed);
    expect(result.success).toBe(true);
    expect(result.skills.competencies).toHaveLength(1);
    expect(result.skills.relevance_score).toBe(72.5);
  });

  test('Test 7 — fallback includes all raw sources and omits empty GitHub', async () => {
    skillsRepository.findByEmployeeId.mockResolvedValue({
      employee_id: employeeId,
      competencies: [],
      relevance_score: 0
    });
    microserviceClient.getEmployeeSkills.mockResolvedValue({
      status: 'processing',
      competencies: []
    });

    await useCase.execute(employeeId, companyId);

    expect(microserviceClient.getEmployeeSkills).toHaveBeenCalledTimes(1);
    const callArg = microserviceClient.getEmployeeSkills.mock.calls[0][0];
    expect(callArg.rawData).toEqual({
      linkedin: { profile: 'linkedin-profile' },
      pdf: { text: 'cv-content' },
      manual: { skills: ['javascript', 'python'] }
    });
    expect(callArg.rawData).not.toHaveProperty('github');
  });
});

// Silence unused require lint for mocked constructors in some runners
void EmployeeRepository;
void CompanyRepository;
void EmployeeSkillsRepository;
void MicroserviceClient;
