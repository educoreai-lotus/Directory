// Tests for CSVValidator
// TDD: Tests for existing implementation

const CSVValidator = require('../../infrastructure/CSVValidator');

describe('CSVValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new CSVValidator();
  });

  describe('isValidEmail', () => {
    test('should return true for valid email', () => {
      expect(validator.isValidEmail('test@example.com')).toBe(true);
    });

    test('should return false for invalid email', () => {
      expect(validator.isValidEmail('invalid-email')).toBe(false);
    });

    test('should return false for email without @', () => {
      expect(validator.isValidEmail('testexample.com')).toBe(false);
    });

    test('should return false for null', () => {
      expect(validator.isValidEmail(null)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(validator.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidRoleType', () => {
    test('should return true for valid single role', () => {
      expect(validator.isValidRoleType('REGULAR_EMPLOYEE')).toBe(true);
    });

    test('should return true for valid combination', () => {
      expect(validator.isValidRoleType('REGULAR_EMPLOYEE + TEAM_MANAGER')).toBe(true);
    });

    test('should return false for invalid role', () => {
      expect(validator.isValidRoleType('INVALID_ROLE')).toBe(false);
    });

    test('should return false for null', () => {
      expect(validator.isValidRoleType(null)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(validator.isValidRoleType('')).toBe(false);
    });
  });

  describe('validate', () => {
    test('should return errors for empty rows', () => {
      const result = validator.validate([], 'company-id');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate required fields', () => {
      const rows = [
        {
          employee_id: '',
          full_name: 'John Doe',
          email: 'john@example.com',
          role_type: 'REGULAR_EMPLOYEE',
          department_id: '101',
          department_name: 'Engineering',
          team_id: '201',
          team_name: 'Backend'
        }
      ];

      const result = validator.validate(rows, 'company-id');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.column === 'employee_id')).toBe(true);
    });

    test('should detect duplicate employee IDs', () => {
      const rows = [
        {
          employee_id: '1',
          full_name: 'John Doe',
          email: 'john1@example.com',
          role_type: 'REGULAR_EMPLOYEE',
          department_id: '101',
          department_name: 'Engineering',
          team_id: '201',
          team_name: 'Backend'
        },
        {
          employee_id: '1',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          role_type: 'REGULAR_EMPLOYEE',
          department_id: '101',
          department_name: 'Engineering',
          team_id: '201',
          team_name: 'Backend'
        }
      ];

      const result = validator.validate(rows, 'company-id');
      expect(result.errors.some(e => e.type === 'duplicate_employee_id')).toBe(true);
    });

    test('should detect duplicate emails', () => {
      const rows = [
        {
          employee_id: '1',
          full_name: 'John Doe',
          email: 'john@example.com',
          role_type: 'REGULAR_EMPLOYEE',
          department_id: '101',
          department_name: 'Engineering',
          team_id: '201',
          team_name: 'Backend'
        },
        {
          employee_id: '2',
          full_name: 'Jane Doe',
          email: 'john@example.com',
          role_type: 'REGULAR_EMPLOYEE',
          department_id: '101',
          department_name: 'Engineering',
          team_id: '201',
          team_name: 'Backend'
        }
      ];

      const result = validator.validate(rows, 'company-id');
      expect(result.errors.some(e => e.type === 'duplicate_email')).toBe(true);
    });

    test('should validate valid rows successfully', () => {
      const rows = [
        {
          employee_id: '1',
          full_name: 'John Doe',
          email: 'john@example.com',
          role_type: 'REGULAR_EMPLOYEE',
          department_id: '101',
          department_name: 'Engineering',
          team_id: '201',
          team_name: 'Backend',
          manager_id: null,
          password: '123'
        }
      ];

      const result = validator.validate(rows, 'company-id');
      expect(result.isValid).toBe(true);
      expect(result.validRows.length).toBe(1);
    });

    test('should generate warnings for missing optional fields', () => {
      const rows = [
        {
          employee_id: '1',
          full_name: 'John Doe',
          email: 'john@example.com',
          role_type: 'REGULAR_EMPLOYEE',
          department_id: '101',
          department_name: 'Engineering',
          team_id: '201',
          team_name: 'Backend',
          manager_id: null,
          password: null
        }
      ];

      const result = validator.validate(rows, 'company-id');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.column === 'password')).toBe(true);
    });
  });
});

