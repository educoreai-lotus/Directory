// Tests for ValidateCSVDataUseCase (TDD - RED PHASE)
// Write failing tests first, then implement to make them pass

const ValidateCSVDataUseCase = require('../../application/ValidateCSVDataUseCase');

// Mock dependencies
jest.mock('../../infrastructure/CSVValidator');
jest.mock('../../infrastructure/CSVErrorFormatter');

describe('ValidateCSVDataUseCase', () => {
  let useCase;
  let mockCSVValidator;
  let mockCSVErrorFormatter;

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new ValidateCSVDataUseCase();
    mockCSVValidator = useCase.csvValidator;
    mockCSVErrorFormatter = useCase.csvErrorFormatter;
  });

  describe('execute', () => {
    test('should validate CSV data and format errors', async () => {
      const rows = [
        { employee_id: '1', full_name: 'John', email: 'john@example.com', role_type: 'REGULAR_EMPLOYEE' }
      ];
      const companyId = 'company-123';

      const mockValidationResult = {
        isValid: false,
        errors: [
          { row: 2, column: 'department_id', message: 'department_id is required', type: 'missing_field' }
        ],
        warnings: [],
        validRows: []
      };

      const mockFormattedErrors = {
        byRow: { 2: [{ column: 'department_id', message: 'department_id is required' }] },
        byType: { missing_field: [] },
        total: 1
      };

      mockCSVValidator.validate.mockReturnValue(mockValidationResult);
      mockCSVErrorFormatter.formatErrors.mockReturnValue(mockFormattedErrors);
      mockCSVErrorFormatter.formatWarnings.mockReturnValue({ byRow: {}, total: 0 });

      const result = await useCase.execute(rows, companyId);

      expect(mockCSVValidator.validate).toHaveBeenCalledWith(rows, companyId);
      expect(mockCSVErrorFormatter.formatErrors).toHaveBeenCalledWith(mockValidationResult.errors);
      expect(result).toHaveProperty('validation');
      expect(result).toHaveProperty('formattedErrors');
      expect(result).toHaveProperty('formattedWarnings');
    });

    test('should return formatted warnings', async () => {
      const rows = [{ employee_id: '1', full_name: 'John', email: 'john@example.com' }];
      const companyId = 'company-123';

      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [
          { row: 2, column: 'manager_id', message: 'manager_id is missing', type: 'missing_optional_field' }
        ],
        validRows: rows
      };

      const mockFormattedWarnings = {
        byRow: { 2: [{ column: 'manager_id', message: 'manager_id is missing' }] },
        total: 1
      };

      mockCSVValidator.validate.mockReturnValue(mockValidationResult);
      mockCSVErrorFormatter.formatErrors.mockReturnValue({ byRow: {}, byType: {}, total: 0 });
      mockCSVErrorFormatter.formatWarnings.mockReturnValue(mockFormattedWarnings);

      const result = await useCase.execute(rows, companyId);

      expect(mockCSVErrorFormatter.formatWarnings).toHaveBeenCalledWith(mockValidationResult.warnings);
      expect(result.formattedWarnings.total).toBe(1);
    });

    test('should return valid rows when validation passes', async () => {
      const rows = [
        { employee_id: '1', full_name: 'John', email: 'john@example.com', role_type: 'REGULAR_EMPLOYEE' }
      ];
      const companyId = 'company-123';

      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        validRows: rows
      };

      mockCSVValidator.validate.mockReturnValue(mockValidationResult);
      mockCSVErrorFormatter.formatErrors.mockReturnValue({ byRow: {}, byType: {}, total: 0 });
      mockCSVErrorFormatter.formatWarnings.mockReturnValue({ byRow: {}, total: 0 });

      const result = await useCase.execute(rows, companyId);

      expect(result.validation.isValid).toBe(true);
      expect(result.validation.validRows).toEqual(rows);
    });
  });
});

