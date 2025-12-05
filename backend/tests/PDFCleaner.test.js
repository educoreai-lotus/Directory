const PDFCleaner = require('../src/utils/PDFCleaner');

describe('PDFCleaner', () => {
  test('removes email addresses', () => {
    const input = ['My email is test@example.com', 'Developer', 'Team Lead'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Developer', 'Team Lead']);
  });

  test('removes phone numbers', () => {
    const input = ['+972 545555555', 'Engineer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Engineer']);
  });

  test('removes date formats', () => {
    const input = ['1997-06-09', '10/12/2020', 'Experience'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Experience']);
  });

  test('removes address-like text', () => {
    const input = ['123 Main Street', 'Backend Developer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Backend Developer']);
  });

  test('keeps valid non-sensitive lines', () => {
    const input = ['JavaScript developer', 'Team manager', 'Scrum Master'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(input);
  });

  test('handles null, undefined, and non-array input', () => {
    expect(PDFCleaner.cleanArray(null)).toEqual([]);
    expect(PDFCleaner.cleanArray(undefined)).toEqual([]);
    expect(PDFCleaner.cleanArray('string')).toEqual([]);
    expect(PDFCleaner.cleanArray(123)).toEqual([]);
  });
});

