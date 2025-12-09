// Mock pdf-parse since we're only testing parseCVText
jest.mock('pdf-parse', () => {
  return jest.fn();
});

const PDFExtractionService = require('../src/infrastructure/PDFExtractionService');

describe('PDFExtractionService', () => {
  let service;

  beforeEach(() => {
    service = new PDFExtractionService();
  });

  describe('Course detection', () => {
    test('detects course from line with training keyword', async () => {
      const text = `Skills
JavaScript, React
Courses
FullStack AI Training - 2025
Education
Bachelor of Science`;

      const result = await service.parseCVText(text);
      
      expect(result.courses).toContain('FullStack AI Training - 2025');
      expect(result.courses.length).toBeGreaterThan(0);
    });

    test('detects course from fallback keyword detection', async () => {
      const text = `FullStack AI Training - 2025
JavaScript Developer`;

      const result = await service.parseCVText(text);
      
      expect(result.courses).toContain('FullStack AI Training - 2025');
    });
  });

  describe('Project detection', () => {
    test('detects project from line with project keywords', async () => {
      const text = `Projects
Developing a Directory Microservice in the EduCore system
Skills
JavaScript, Node.js`;

      const result = await service.parseCVText(text);
      
      expect(result.projects.length).toBeGreaterThan(0);
      expect(result.projects.some(p => p.includes('Directory Microservice'))).toBe(true);
    });

    test('detects project from fallback keyword detection', async () => {
      const text = `Developing a Directory Microservice in the EduCore system
JavaScript Developer`;

      const result = await service.parseCVText(text);
      
      expect(result.projects.length).toBeGreaterThan(0);
      expect(result.projects.some(p => p.includes('Directory Microservice'))).toBe(true);
    });
  });

  describe('Military detection (strict)', () => {
    test('detects military service with explicit IDF context', async () => {
      const text = `Military Service
Completed mandatory IDF combat service
Education
Bachelor of Science`;

      const result = await service.parseCVText(text);
      
      expect(result.military).toContain('Completed mandatory IDF combat service');
      expect(result.military.length).toBeGreaterThan(0);
    });

    test('detects military with army keyword', async () => {
      const text = `Military Service
Served in the army for 3 years`;

      const result = await service.parseCVText(text);
      
      expect(result.military.length).toBeGreaterThan(0);
      expect(result.military.some(m => /army/i.test(m))).toBe(true);
    });

    test('does NOT trigger military for training program', async () => {
      const text = `Training program in software engineering
JavaScript Developer`;

      const result = await service.parseCVText(text);
      
      expect(result.military).toEqual([]);
      expect(result.courses.length).toBeGreaterThan(0);
    });

    test('does NOT trigger military for generic service word', async () => {
      const text = `Customer service representative
JavaScript Developer`;

      const result = await service.parseCVText(text);
      
      expect(result.military).toEqual([]);
    });
  });

  describe('Heading synonym mapping', () => {
    test('maps "Abilities" heading to skills category', async () => {
      const text = `Abilities
JavaScript, React, Node.js
Education
Bachelor of Science`;

      const result = await service.parseCVText(text);
      
      expect(result.skills.length).toBeGreaterThan(0);
      expect(result.skills).toContain('JavaScript');
    });

    test('maps "Professional Experience" heading to work_experience category', async () => {
      const text = `Professional Experience
Senior Software Engineer at Tech Company
Education
Bachelor of Science`;

      const result = await service.parseCVText(text);
      
      expect(result.work_experience.length).toBeGreaterThan(0);
      expect(result.work_experience.some(exp => exp.includes('Software Engineer'))).toBe(true);
    });

    test('maps "Training Programs" heading to courses category', async () => {
      const text = `Training Programs
FullStack AI Bootcamp
Education
Bachelor of Science`;

      const result = await service.parseCVText(text);
      
      expect(result.courses.length).toBeGreaterThan(0);
    });

    test('maps "Portfolio" heading to projects category', async () => {
      const text = `Portfolio
E-commerce platform built with React
Education
Bachelor of Science`;

      const result = await service.parseCVText(text);
      
      expect(result.projects.length).toBeGreaterThan(0);
    });
  });

  describe('Output format', () => {
    test('returns all required fields including courses and projects', async () => {
      const text = `Skills
JavaScript
Education
Bachelor of Science`;

      const result = await service.parseCVText(text);
      
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('education');
      expect(result).toHaveProperty('work_experience');
      expect(result).toHaveProperty('volunteer');
      expect(result).toHaveProperty('military');
      expect(result).toHaveProperty('courses');
      expect(result).toHaveProperty('projects');
      
      expect(Array.isArray(result.skills)).toBe(true);
      expect(Array.isArray(result.languages)).toBe(true);
      expect(Array.isArray(result.education)).toBe(true);
      expect(Array.isArray(result.work_experience)).toBe(true);
      expect(Array.isArray(result.volunteer)).toBe(true);
      expect(Array.isArray(result.military)).toBe(true);
      expect(Array.isArray(result.courses)).toBe(true);
      expect(Array.isArray(result.projects)).toBe(true);
    });
  });

  describe('Empty input handling', () => {
    test('returns empty arrays for empty text', async () => {
      const result = await service.parseCVText('');
      
      expect(result.skills).toEqual([]);
      expect(result.languages).toEqual([]);
      expect(result.education).toEqual([]);
      expect(result.work_experience).toEqual([]);
      expect(result.volunteer).toEqual([]);
      expect(result.military).toEqual([]);
      expect(result.courses).toEqual([]);
      expect(result.projects).toEqual([]);
    });

    test('returns empty arrays for null text', async () => {
      const result = await service.parseCVText(null);
      
      expect(result.skills).toEqual([]);
      expect(result.courses).toEqual([]);
      expect(result.projects).toEqual([]);
    });
  });
});

