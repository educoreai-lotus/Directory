// Tests for CSVErrorFormatter (TDD - RED PHASE)
// Write failing tests first, then implement to make them pass

const CSVErrorFormatter = require('../../infrastructure/CSVErrorFormatter');

describe('CSVErrorFormatter', () => {
  let formatter;

  beforeEach(() => {
    formatter = new CSVErrorFormatter();
  });

  describe('formatErrors', () => {
    test('should format errors by row number', () => {
      const errors = [
        { row: 2, column: 'email', message: 'Invalid email format', type: 'invalid_format' },
        { row: 3, column: 'employee_id', message: 'employee_id is required', type: 'missing_field' },
        { row: 2, column: 'full_name', message: 'full_name is required', type: 'missing_field' }
      ];

      const result = formatter.formatErrors(errors);
      
      expect(result).toHaveProperty('byRow');
      expect(result.byRow[2]).toHaveLength(2);
      expect(result.byRow[3]).toHaveLength(1);
    });

    test('should group errors by type', () => {
      const errors = [
        { row: 2, column: 'email', message: 'Invalid email', type: 'invalid_format' },
        { row: 3, column: 'employee_id', message: 'Missing field', type: 'missing_field' },
        { row: 4, column: 'email', message: 'Duplicate email', type: 'duplicate_email' }
      ];

      const result = formatter.formatErrors(errors);
      
      expect(result).toHaveProperty('byType');
      expect(result.byType.invalid_format).toHaveLength(1);
      expect(result.byType.missing_field).toHaveLength(1);
      expect(result.byType.duplicate_email).toHaveLength(1);
    });

    test('should return empty structure for no errors', () => {
      const result = formatter.formatErrors([]);
      
      expect(result.byRow).toEqual({});
      expect(result.byType).toEqual({});
      expect(result.total).toBe(0);
    });

    test('should include total error count', () => {
      const errors = [
        { row: 2, column: 'email', message: 'Error 1', type: 'invalid_format' },
        { row: 3, column: 'name', message: 'Error 2', type: 'missing_field' }
      ];

      const result = formatter.formatErrors(errors);
      
      expect(result.total).toBe(2);
    });
  });

  describe('formatWarnings', () => {
    test('should format warnings by row number', () => {
      const warnings = [
        { row: 2, column: 'manager_id', message: 'manager_id is missing', type: 'missing_optional_field' },
        { row: 3, column: 'password', message: 'password is missing', type: 'missing_optional_field' }
      ];

      const result = formatter.formatWarnings(warnings);
      
      expect(result).toHaveProperty('byRow');
      expect(result.byRow[2]).toHaveLength(1);
      expect(result.byRow[3]).toHaveLength(1);
    });

    test('should return total warning count', () => {
      const warnings = [
        { row: 2, column: 'manager_id', message: 'Warning 1', type: 'missing_optional_field' },
        { row: 3, column: 'password', message: 'Warning 2', type: 'missing_optional_field' }
      ];

      const result = formatter.formatWarnings(warnings);
      
      expect(result.total).toBe(2);
    });
  });

  describe('getRowErrors', () => {
    test('should return errors for specific row', () => {
      const errors = [
        { row: 2, column: 'email', message: 'Error 1', type: 'invalid_format' },
        { row: 3, column: 'name', message: 'Error 2', type: 'missing_field' },
        { row: 2, column: 'id', message: 'Error 3', type: 'missing_field' }
      ];

      const rowErrors = formatter.getRowErrors(errors, 2);
      
      expect(rowErrors).toHaveLength(2);
      expect(rowErrors[0].column).toBe('email');
      expect(rowErrors[1].column).toBe('id');
    });

    test('should return empty array for row with no errors', () => {
      const errors = [
        { row: 2, column: 'email', message: 'Error 1', type: 'invalid_format' }
      ];

      const rowErrors = formatter.getRowErrors(errors, 5);
      
      expect(rowErrors).toHaveLength(0);
    });
  });
});

