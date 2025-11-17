// Tests for VerifyCompanyUseCase
// TDD: Tests for existing implementation
// Note: These tests use mocks to avoid database dependencies

const VerifyCompanyUseCase = require('../../application/VerifyCompanyUseCase');

// Mock dependencies
jest.mock('../../infrastructure/CompanyRepository');
jest.mock('../../infrastructure/DomainValidator');

describe('VerifyCompanyUseCase', () => {
  let useCase;
  let mockCompanyRepository;
  let mockDomainValidator;

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new VerifyCompanyUseCase();
    mockCompanyRepository = useCase.companyRepository;
    mockDomainValidator = useCase.domainValidator;
  });

  describe('getStatus', () => {
    test('should throw error if company not found', async () => {
      mockCompanyRepository.findById.mockResolvedValue(null);

      await expect(useCase.getStatus('non-existent-id')).rejects.toThrow('Company not found');
    });

    test('should return company status', async () => {
      const mockCompany = {
        id: 'company-id',
        company_name: 'Test Company',
        domain: 'example.com',
        verification_status: 'pending'
      };

      mockCompanyRepository.findById.mockResolvedValue(mockCompany);

      const result = await useCase.getStatus('company-id');

      expect(result).toHaveProperty('id', 'company-id');
      expect(result).toHaveProperty('verification_status', 'pending');
      expect(mockCompanyRepository.findById).toHaveBeenCalledWith('company-id');
    });
  });

  describe('verifyDomain', () => {
    test('should return already verified status', async () => {
      const mockCompany = {
        id: 'company-id',
        verification_status: 'approved'
      };

      mockCompanyRepository.findById.mockResolvedValue(mockCompany);

      const result = await useCase.verifyDomain('company-id');

      expect(result.verification_status).toBe('approved');
      expect(mockDomainValidator.validate).not.toHaveBeenCalled();
    });

    test('should verify domain and update status', async () => {
      const mockCompany = {
        id: 'company-id',
        domain: 'example.com',
        verification_status: 'pending'
      };

      const mockValidationResult = {
        isValid: true,
        hasDNS: true,
        hasMailServer: true,
        errors: []
      };

      mockCompanyRepository.findById
        .mockResolvedValueOnce(mockCompany)
        .mockResolvedValueOnce({ ...mockCompany, verification_status: 'approved' });

      mockDomainValidator.validate.mockResolvedValue(mockValidationResult);
      mockCompanyRepository.updateVerificationStatus.mockResolvedValue(mockCompany);

      const result = await useCase.verifyDomain('company-id');

      expect(mockDomainValidator.validate).toHaveBeenCalledWith('example.com');
      expect(result.verification_status).toBe('approved');
    });
  });
});

