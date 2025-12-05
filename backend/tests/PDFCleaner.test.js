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

  test('removes place-like patterns with comma', () => {
    const input = ["Buq'ata, Golan Heights", 'New York, USA', 'Backend Developer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Backend Developer']);
  });

  test('removes place-like patterns with dash', () => {
    const input = ["Buq'ata - Golan Heights", 'Tel Aviv - Israel', 'Software Engineer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Software Engineer']);
  });

  test('removes bullet characters and single-character lines', () => {
    const input = ['•', '-', '*', '.', 'JavaScript developer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['JavaScript developer']);
  });

  test('removes date formats including month names', () => {
    const input = ['June 9, 1997', '9 June 1997', '1997', 'Software Developer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Software Developer']);
  });

  test('removes standalone location names', () => {
    const input = ["Buq'ata", 'Haifa', 'Tel Aviv', 'React Developer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['React Developer']);
  });

  test('removes multi-word location names', () => {
    const input = ['Golan Heights', 'New York', 'Tel Aviv', 'Node.js Developer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Node.js Developer']);
  });

  test('removes lines with only capital letters', () => {
    const input = ['ABC', 'HELLO WORLD', 'JavaScript Developer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['JavaScript Developer']);
  });

  test('removes lines with only numbers', () => {
    const input = ['1997', '2020', '12345', 'Full Stack Developer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Full Stack Developer']);
  });

  test('removes lines with only punctuation', () => {
    const input = ['...', '---', '***', 'Backend Engineer'];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(['Backend Engineer']);
  });

  test('keeps education lines with meaningful text', () => {
    const input = [
      'Bachelor of Science in Computer Science',
      'University of Technology',
      'Graduated with honors',
      'JavaScript'
    ];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(input);
  });

  test('keeps work experience lines with meaningful text', () => {
    const input = [
      'Senior Software Engineer at Tech Company',
      'Led development of microservices architecture',
      'Implemented CI/CD pipelines',
      'Managed team of 5 developers'
    ];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(input);
  });

  test('keeps project descriptions', () => {
    const input = [
      'E-commerce platform built with React and Node.js',
      'Real-time chat application using WebSockets',
      'Machine learning model for data analysis'
    ];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(input);
  });

  test('keeps technology and skill names', () => {
    const input = [
      'JavaScript',
      'React',
      'Node.js',
      'PostgreSQL',
      'Docker',
      'AWS'
    ];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(input);
  });

  test('keeps job titles and roles', () => {
    const input = [
      'Senior Developer',
      'Team Lead',
      'Software Architect',
      'DevOps Engineer'
    ];
    const output = PDFCleaner.cleanArray(input);
    expect(output).toEqual(input);
  });
});

