// Tests for CSVParser
// TDD: Tests for existing implementation

const CSVParser = require('../../infrastructure/CSVParser');

describe('CSVParser', () => {
  let parser;

  beforeEach(() => {
    parser = new CSVParser();
  });

  describe('trimValue', () => {
    test('should return trimmed string for valid value', () => {
      expect(parser.trimValue('  test  ')).toBe('test');
    });

    test('should return null for empty string', () => {
      expect(parser.trimValue('')).toBeNull();
    });

    test('should return null for whitespace only', () => {
      expect(parser.trimValue('   ')).toBeNull();
    });

    test('should return null for undefined', () => {
      expect(parser.trimValue(undefined)).toBeNull();
    });

    test('should return null for null', () => {
      expect(parser.trimValue(null)).toBeNull();
    });
  });

  describe('parseBoolean', () => {
    test('should return true for "TRUE"', () => {
      expect(parser.parseBoolean('TRUE')).toBe(true);
    });

    test('should return true for "true"', () => {
      expect(parser.parseBoolean('true')).toBe(true);
    });

    test('should return true for "1"', () => {
      expect(parser.parseBoolean('1')).toBe(true);
    });

    test('should return true for "YES"', () => {
      expect(parser.parseBoolean('YES')).toBe(true);
    });

    test('should return false for "FALSE"', () => {
      expect(parser.parseBoolean('FALSE')).toBe(false);
    });

    test('should return false for null', () => {
      expect(parser.parseBoolean(null)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(parser.parseBoolean(undefined)).toBe(false);
    });
  });

  describe('normalizeLearningPathApproval', () => {
    test('should normalize "Manual" to "manual"', () => {
      expect(parser.normalizeLearningPathApproval('Manual')).toBe('manual');
    });

    test('should normalize "AUTOMATIC" to "automatic"', () => {
      expect(parser.normalizeLearningPathApproval('AUTOMATIC')).toBe('automatic');
    });

    test('should normalize "manual" to "manual"', () => {
      expect(parser.normalizeLearningPathApproval('manual')).toBe('manual');
    });

    test('should normalize "automatic" to "automatic"', () => {
      expect(parser.normalizeLearningPathApproval('automatic')).toBe('automatic');
    });

    test('should return null for invalid value', () => {
      expect(parser.normalizeLearningPathApproval('invalid')).toBeNull();
    });

    test('should return null for empty string', () => {
      expect(parser.normalizeLearningPathApproval('')).toBeNull();
    });
  });

  describe('normalizeEmployeeStatus', () => {
    test('should normalize "Active" to "active"', () => {
      expect(parser.normalizeEmployeeStatus('Active')).toBe('active');
    });

    test('should normalize "ACTIVE" to "active"', () => {
      expect(parser.normalizeEmployeeStatus('ACTIVE')).toBe('active');
    });

    test('should normalize "Inactive" to "inactive"', () => {
      expect(parser.normalizeEmployeeStatus('Inactive')).toBe('inactive');
    });

    test('should normalize "active" to "active"', () => {
      expect(parser.normalizeEmployeeStatus('active')).toBe('active');
    });

    test('should return null for invalid value', () => {
      expect(parser.normalizeEmployeeStatus('invalid')).toBeNull();
    });
  });

  describe('normalizeRoleType', () => {
    test('should normalize single role to uppercase', () => {
      expect(parser.normalizeRoleType('regular_employee')).toBe('REGULAR_EMPLOYEE');
    });

    test('should normalize combination roles', () => {
      expect(parser.normalizeRoleType('REGULAR_EMPLOYEE + TEAM_MANAGER')).toBe('REGULAR_EMPLOYEE + TEAM_MANAGER');
    });

    test('should normalize lowercase combination', () => {
      expect(parser.normalizeRoleType('regular_employee + team_manager')).toBe('REGULAR_EMPLOYEE + TEAM_MANAGER');
    });

    test('should handle mixed case', () => {
      expect(parser.normalizeRoleType('Regular_Employee + Team_Manager')).toBe('REGULAR_EMPLOYEE + TEAM_MANAGER');
    });

    test('should return null for invalid role', () => {
      expect(parser.normalizeRoleType('INVALID_ROLE')).toBeNull();
    });

    test('should filter out invalid roles in combination', () => {
      const result = parser.normalizeRoleType('REGULAR_EMPLOYEE + INVALID_ROLE');
      expect(result).toBe('REGULAR_EMPLOYEE');
    });
  });

  describe('normalizeRow', () => {
    test('should normalize a complete row', () => {
      const row = {
        company_name: 'Test Company',
        industry: 'Tech',
        learning_path_approval: 'Manual',
        employee_id: '1',
        full_name: 'John Doe',
        email: 'john@example.com',
        role_type: 'REGULAR_EMPLOYEE',
        status: 'Active',
        ai_enabled: 'TRUE'
      };

      const normalized = parser.normalizeRow(row, 2);

      expect(normalized.company_name).toBe('Test Company');
      expect(normalized.learning_path_approval).toBe('manual');
      expect(normalized.status).toBe('active');
      expect(normalized.ai_enabled).toBe(true);
      expect(normalized.rowNumber).toBe(2);
    });
  });
});

