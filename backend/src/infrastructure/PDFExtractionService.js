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
        work_experience: [],
        skills: [],
        education: [],
        languages: []
      };
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const result = {
      work_experience: [],
      skills: [],
      education: [],
      languages: []
    };

    let currentSection = null;
    const workKeywords = ['experience', 'employment', 'work history', 'career', 'professional'];
    const skillKeywords = ['skills', 'technologies', 'competencies', 'expertise', 'proficiencies'];
    const educationKeywords = ['education', 'academic', 'qualifications', 'degrees', 'university'];
    const languageKeywords = ['languages', 'language proficiency', 'spoken languages'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      // Detect section headers
      if (workKeywords.some(keyword => line.includes(keyword))) {
        currentSection = 'work_experience';
        continue;
      }
      if (skillKeywords.some(keyword => line.includes(keyword))) {
        currentSection = 'skills';
        continue;
      }
      if (educationKeywords.some(keyword => line.includes(keyword))) {
        currentSection = 'education';
        continue;
      }
      if (languageKeywords.some(keyword => line.includes(keyword))) {
        currentSection = 'languages';
        continue;
      }

      // Parse content based on current section
      if (currentSection === 'work_experience') {
        // Look for job entries (usually have dates, company names, or bullet points)
        if (line.match(/\d{4}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) || 
            line.startsWith('•') || line.startsWith('-')) {
          result.work_experience.push(lines[i]);
        }
      } else if (currentSection === 'skills') {
        // Skills are often comma-separated or bulleted
        const skills = lines[i].split(/[,•\-]/).map(s => s.trim()).filter(s => s.length > 0);
        result.skills.push(...skills);
      } else if (currentSection === 'education') {
        // Education entries often have dates or degree names
        if (line.match(/\d{4}|\b(bachelor|master|phd|degree|university|college)/i)) {
          result.education.push(lines[i]);
        }
      } else if (currentSection === 'languages') {
        // Languages are often comma-separated
        const langs = lines[i].split(/[,•\-]/).map(l => l.trim()).filter(l => l.length > 0);
        result.languages.push(...langs);
      }
    }

    // If no structured sections found, try to extract from entire text
    if (result.work_experience.length === 0 && result.skills.length === 0) {
      // Fallback: extract common patterns
      const skillPatterns = [
        /\b(javascript|python|java|react|node|sql|html|css|typescript|angular|vue)\b/gi,
        /\b(aws|azure|docker|kubernetes|git|linux|windows)\b/gi
      ];
      
      skillPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          result.skills.push(...matches.map(m => m.toLowerCase()));
        }
      });
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

