// Infrastructure Layer - PDF Extraction Service
// Extracts and parses text from PDF files, sanitizes PII
// PHASE_2: This file is part of the extended enrichment flow

const pdf = require('pdf-parse');

class PDFExtractionService {
  /**
   * Extract raw text from PDF buffer
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPDF(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer);
      return data.text || '';
    } catch (error) {
      console.error('[PDFExtractionService] Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF: ' + error.message);
    }
  }

  /**
   * Parse CV text into structured JSON
   * @param {string} text - Raw text from PDF
   * @returns {Object} Structured CV data
   */
  async parseCVText(text) {
    if (!text || text.trim().length === 0) {
      return {
        name: '',
        email: '',
        current_role: '',
        target_role: '',
        bio: null,
        projects: null
      };
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const result = {
      name: '',
      email: '',
      current_role: '',
      target_role: '',
      bio: null,
      projects: null
    };

    // Extract email (common pattern)
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = text.match(emailPattern);
    if (emailMatch) {
      result.email = emailMatch[0];
    }

    // Extract name (usually first line or after "Name:" header)
    let nameFound = false;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      // Skip if it's an email
      if (emailPattern.test(line)) continue;
      // Skip if it's a phone number
      if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)) continue;
      // Skip if it's a URL
      if (/https?:\/\//.test(line)) continue;
      
      // If line looks like a name (2-4 words, no special chars except spaces/hyphens)
      if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(line) && line.length < 50) {
        result.name = line;
        nameFound = true;
        break;
      }
    }
    
    // If name not found in first lines, use first non-empty line
    if (!nameFound && lines.length > 0) {
      const firstLine = lines[0];
      if (!emailPattern.test(firstLine) && !/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(firstLine)) {
        result.name = firstLine.substring(0, 100); // Limit length
      }
    }

    // Extract current role (look for "Current Role:", "Position:", "Title:", or in work experience)
    const roleKeywords = ['current role', 'position', 'title', 'role', 'job title', 'current position'];
    let currentRoleFound = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      for (const keyword of roleKeywords) {
        if (line.includes(keyword + ':') || line.includes(keyword + ':')) {
          const roleLine = lines[i];
          const colonIndex = roleLine.toLowerCase().indexOf(keyword + ':');
          if (colonIndex !== -1) {
            result.current_role = roleLine.substring(colonIndex + keyword.length + 1).trim();
            currentRoleFound = true;
            break;
          }
        }
      }
      if (currentRoleFound) break;
    }

    // Extract target role (look for "Target Role:", "Desired Role:", "Goal:", "Objective:")
    const targetRoleKeywords = ['target role', 'desired role', 'goal', 'objective', 'aspiring'];
    let targetRoleFound = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      for (const keyword of targetRoleKeywords) {
        if (line.includes(keyword + ':') || line.includes(keyword + ':')) {
          const roleLine = lines[i];
          const colonIndex = roleLine.toLowerCase().indexOf(keyword + ':');
          if (colonIndex !== -1) {
            result.target_role = roleLine.substring(colonIndex + keyword.length + 1).trim();
            targetRoleFound = true;
            break;
          }
        }
      }
      if (targetRoleFound) break;
    }

    // Extract bio (usually in "Summary:", "About:", "Profile:" section)
    const bioKeywords = ['summary', 'about', 'profile', 'overview', 'introduction'];
    let bioStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      for (const keyword of bioKeywords) {
        if (line.includes(keyword + ':') || line === keyword) {
          bioStartIndex = i + 1;
          break;
        }
      }
      if (bioStartIndex !== -1) break;
    }

    if (bioStartIndex !== -1 && bioStartIndex < lines.length) {
      // Collect bio text until next major section
      const bioLines = [];
      const sectionKeywords = ['experience', 'education', 'skills', 'projects', 'contact'];
      for (let i = bioStartIndex; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (sectionKeywords.some(keyword => line.includes(keyword) && line.length < 30)) {
          break; // Hit next section
        }
        bioLines.push(lines[i]);
      }
      if (bioLines.length > 0) {
        result.bio = bioLines.join(' ').substring(0, 500); // Limit length
      }
    }

    // Extract projects (look for "Projects:", "Portfolio:", "Work:" section)
    const projectKeywords = ['projects', 'portfolio', 'work', 'repositories', 'github'];
    let projectsStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      for (const keyword of projectKeywords) {
        if (line.includes(keyword + ':') || line === keyword) {
          projectsStartIndex = i + 1;
          break;
        }
      }
      if (projectsStartIndex !== -1) break;
    }

    if (projectsStartIndex !== -1 && projectsStartIndex < lines.length) {
      const projectLines = [];
      const sectionKeywords = ['education', 'skills', 'contact', 'references'];
      for (let i = projectsStartIndex; i < Math.min(projectsStartIndex + 20, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if (sectionKeywords.some(keyword => line.includes(keyword) && line.length < 30)) {
          break; // Hit next section
        }
        if (lines[i].trim().length > 0) {
          projectLines.push(lines[i]);
        }
      }
      if (projectLines.length > 0) {
        result.projects = projectLines;
      }
    }

    return result;
  }

  /**
   * Sanitize PII (Personally Identifiable Information) from data
   * Removes: phone numbers, email addresses, ID numbers, physical addresses
   * @param {Object} data - CV data object
   * @returns {Object} Sanitized data
   */
  sanitizePII(data) {
    const sanitized = JSON.parse(JSON.stringify(data)); // Deep clone

    // Remove phone numbers (various formats)
    const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,}/g;
    
    // Remove email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
    // Remove ID numbers (SSN, passport, etc.) - patterns vary by country
    const idPattern = /\b\d{3}-?\d{2}-?\d{4}\b|\b[A-Z]{1,2}\d{6,}\b/g;
    
    // Remove addresses (street addresses, postal codes)
    const addressPattern = /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|ct)\b/gi;
    const postalCodePattern = /\b\d{5}(-\d{4})?\b|\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/gi;

    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(phonePattern, '[PHONE_REMOVED]')
        .replace(emailPattern, '[EMAIL_REMOVED]')
        .replace(idPattern, '[ID_REMOVED]')
        .replace(addressPattern, '[ADDRESS_REMOVED]')
        .replace(postalCodePattern, '[POSTAL_CODE_REMOVED]');
    };

    // Recursively sanitize all string values
    const sanitizeObject = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      } else if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
        }
        return sanitized;
      } else if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Complete PDF processing pipeline: extract, parse, sanitize
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Object>} Structured and sanitized CV data
   */
  async processPDF(pdfBuffer) {
    try {
      // Step 1: Extract text
      const text = await this.extractTextFromPDF(pdfBuffer);
      
      // Step 2: Parse into structure
      const parsed = await this.parseCVText(text);
      
      // Step 3: Sanitize PII
      const sanitized = this.sanitizePII(parsed);
      
      return sanitized;
    } catch (error) {
      console.error('[PDFExtractionService] Error processing PDF:', error);
      throw error;
    }
  }
}

module.exports = PDFExtractionService;

