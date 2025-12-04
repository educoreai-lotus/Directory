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
   * Extracts: Skills, Languages, Education, Employment/Work Experience, Volunteer, Military Service
   * @param {string} text - Raw text from PDF
   * @returns {Object} Structured CV data with arrays
   */
  async parseCVText(text) {
    if (!text || text.trim().length === 0) {
      return {
        skills: [],
        languages: [],
        education: [],
        work_experience: [],
        volunteer: [],
        military: []
      };
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const result = {
      skills: [],
      languages: [],
      education: [],
      work_experience: [],
      volunteer: [],
      military: []
    };

    // IMPROVED: Extract all text content for fallback parsing if sections aren't found
    const fullText = text.toLowerCase();

    // Helper function to extract section content
    const extractSection = (sectionName, sectionKeywords, stopKeywords = []) => {
      const items = [];
      let inSection = false;
      let sectionStartIndex = -1;

      // Find section start
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        for (const keyword of sectionKeywords) {
          if (line === keyword.toLowerCase() || line.startsWith(keyword.toLowerCase() + ':')) {
            sectionStartIndex = i + 1;
            inSection = true;
            break;
          }
        }
        if (inSection) break;
      }

      if (!inSection || sectionStartIndex < 0) {
        return items;
      }

      // Extract content until next section or stop keyword
      for (let i = sectionStartIndex; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        
        // Check if we hit a stop keyword (next section)
        const hitStopKeyword = stopKeywords.some(stop => 
          line === stop.toLowerCase() || line.startsWith(stop.toLowerCase() + ':')
        );
        
        if (hitStopKeyword) {
          break;
        }

        // Check if we hit another major section
        const majorSections = ['skills', 'languages', 'education', 'employment', 'work experience', 
                              'volunteer', 'military', 'military service', 'projects', 'contact', 
                              'references', 'certifications'];
        const hitMajorSection = majorSections.some(section => 
          line === section.toLowerCase() || line.startsWith(section.toLowerCase() + ':')
        );
        
        if (hitMajorSection && line.length < 50) {
          break;
        }

        // Add non-empty lines to items
        if (lines[i].trim().length > 0) {
          items.push(lines[i].trim());
        }
      }

      return items;
    };

    // Extract Skills section
    const skillsKeywords = ['skills', 'skill', 'competencies', 'expertise'];
    const skillsItems = extractSection('Skills', skillsKeywords, ['languages', 'education', 'employment', 'work experience']);
    if (skillsItems.length > 0) {
      // Parse comma-separated or line-separated skills
      skillsItems.forEach(item => {
        if (item.includes(',')) {
          item.split(',').forEach(skill => {
            const trimmed = skill.trim();
            if (trimmed.length > 0) {
              result.skills.push(trimmed);
            }
          });
        } else {
          result.skills.push(item);
        }
      });
    }

    // Extract Languages section
    const languagesKeywords = ['languages', 'language', 'language proficiency'];
    const languagesItems = extractSection('Languages', languagesKeywords, ['education', 'employment', 'work experience', 'skills']);
    if (languagesItems.length > 0) {
      languagesItems.forEach(item => {
        if (item.includes(',')) {
          item.split(',').forEach(lang => {
            const trimmed = lang.trim();
            if (trimmed.length > 0) {
              result.languages.push(trimmed);
            }
          });
        } else {
          result.languages.push(item);
        }
      });
    }

    // Extract Education section
    const educationKeywords = ['education', 'academic', 'qualifications', 'degrees', 'university', 'college'];
    const educationItems = extractSection('Education', educationKeywords, ['employment', 'work experience', 'skills', 'languages', 'volunteer', 'military']);
    if (educationItems.length > 0) {
      result.education = educationItems;
    }

    // Extract Employment / Work Experience section
    const employmentKeywords = ['employment', 'work experience', 'work history', 'experience', 'professional experience', 'career'];
    const employmentItems = extractSection('Employment', employmentKeywords, ['volunteer', 'military', 'education', 'skills', 'languages']);
    if (employmentItems.length > 0) {
      result.work_experience = employmentItems;
    }

    // Extract Volunteer section
    const volunteerKeywords = ['volunteer', 'volunteering', 'volunteer work', 'community service'];
    const volunteerItems = extractSection('Volunteer', volunteerKeywords, ['military', 'military service', 'employment', 'work experience']);
    if (volunteerItems.length > 0) {
      result.volunteer = volunteerItems;
    }

    // Extract Military Service section
    const militaryKeywords = ['military service', 'military', 'army', 'navy', 'air force', 'service'];
    const militaryItems = extractSection('Military Service', militaryKeywords, ['volunteer', 'employment', 'work experience', 'education']);
    if (militaryItems.length > 0) {
      result.military = militaryItems;
    }

    // FALLBACK EXTRACTION: If no structured sections found, extract from raw text
    const hasStructuredData = result.skills.length > 0 || result.languages.length > 0 || 
                              result.education.length > 0 || result.work_experience.length > 0;
    
    if (!hasStructuredData) {
      console.log('[PDFExtractionService] No structured sections found, using fallback extraction from raw text');
      
      // Extract technologies/skills using comprehensive regex patterns
      const technologyPatterns = [
        // Programming languages
        /\b(javascript|typescript|python|java|c\+\+|c#|ruby|php|go|rust|swift|kotlin|scala|perl|r|matlab)\b/gi,
        // Frameworks and libraries
        /\b(react|vue|angular|node\.js|express|django|flask|spring|laravel|symfony|rails|asp\.net|\.net)\b/gi,
        // Databases
        /\b(sql|postgresql|mysql|mongodb|redis|elasticsearch|cassandra|oracle|sqlite|dynamodb)\b/gi,
        // Frontend
        /\b(html|css|sass|less|bootstrap|tailwind|webpack|vite|next\.js|nuxt\.js)\b/gi,
        // Cloud and DevOps
        /\b(aws|azure|gcp|docker|kubernetes|terraform|jenkins|gitlab|github|ci\/cd|ansible|puppet|chef)\b/gi,
        // Tools and methodologies
        /\b(git|jira|confluence|agile|scrum|kanban|devops|microservices|rest|graphql|api)\b/gi,
        // Data and ML
        /\b(machine learning|ml|ai|tensorflow|pytorch|pandas|numpy|scikit-learn|data science|big data)\b/gi
      ];
      
      technologyPatterns.forEach(pattern => {
        const matches = fullText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const skill = match.trim();
            if (skill.length > 2 && !result.skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
              result.skills.push(skill);
            }
          });
        }
      });
      
      // Extract languages (spoken languages)
      const spokenLanguagePatterns = [
        /\b(english|arabic|hebrew|spanish|french|german|chinese|japanese|korean|portuguese|italian|russian|hindi|dutch|swedish|norwegian|danish|finnish|polish|turkish)\b/gi,
        /\b(native|fluent|proficient|conversational|basic|intermediate|advanced)\s+(english|arabic|hebrew|spanish|french|german|chinese|japanese)\b/gi
      ];
      
      spokenLanguagePatterns.forEach(pattern => {
        const matches = fullText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lang = match.trim();
            if (lang.length > 2 && !result.languages.some(l => l.toLowerCase() === lang.toLowerCase())) {
              result.languages.push(lang);
            }
          });
        }
      });
      
      // Extract academic degrees and education
      const degreePatterns = [
        /\b(b\.?sc|b\.?a|b\.?eng|bachelor|master|m\.?sc|m\.?a|m\.?eng|ph\.?d|doctorate|diploma|certificate)\b/gi,
        /\b(university|college|institute|school)\s+of\s+[a-z\s]+/gi,
        /\b(degree|graduated|studied|major|minor)\s+in\s+[a-z\s]+/gi
      ];
      
      degreePatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const edu = match.trim();
            if (edu.length > 5 && !result.education.includes(edu)) {
              result.education.push(edu);
            }
          });
        }
      });
      
      // Extract job titles and work experience
      const jobTitlePatterns = [
        /\b(developer|engineer|programmer|analyst|manager|director|lead|senior|junior|architect|consultant|specialist|coordinator|instructor|trainer)\b/gi,
        /\b(software|web|frontend|backend|full.?stack|devops|data|qa|test|product|project|technical)\s+(developer|engineer|architect|manager|analyst|specialist)\b/gi
      ];
      
      jobTitlePatterns.forEach(pattern => {
        const matches = fullText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const title = match.trim();
            if (title.length > 3 && !result.work_experience.some(exp => exp.toLowerCase().includes(title.toLowerCase()))) {
              result.work_experience.push(title);
            }
          });
        }
      });
      
      // Extract bullet points (potential work experience items)
      const bulletPatterns = [
        /^[•\-\*]\s+(.+)$/gm,
        /^\d+\.\s+(.+)$/gm,
        /^[–—]\s+(.+)$/gm
      ];
      
      bulletPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const content = match.replace(/^[•\-\*\d\.–—]\s+/, '').trim();
            if (content.length > 10 && !result.work_experience.includes(content)) {
              result.work_experience.push(content);
            }
          });
        }
      });
      
      // Extract lines with years (potential work experience or education)
      const yearPattern = /\b(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}|\b(19|20)\d{2}\s*[-–—]\s*(present|current|now)/gi;
      const linesWithYears = lines.filter(line => yearPattern.test(line));
      linesWithYears.forEach(line => {
        if (line.length > 10 && !result.work_experience.includes(line) && !result.education.includes(line)) {
          // Try to determine if it's work or education based on keywords
          if (line.toLowerCase().includes('university') || line.toLowerCase().includes('college') || 
              line.toLowerCase().includes('degree') || line.toLowerCase().includes('bachelor') || 
              line.toLowerCase().includes('master')) {
            result.education.push(line);
          } else {
            result.work_experience.push(line);
          }
        }
      });
      
      // Remove duplicates
      result.skills = [...new Set(result.skills)];
      result.languages = [...new Set(result.languages)];
      result.education = [...new Set(result.education)];
      result.work_experience = [...new Set(result.work_experience)];
    }
    
    // LAST RESORT: If still empty, put raw text into work_experience
    if (result.skills.length === 0 && result.languages.length === 0 && 
        result.education.length === 0 && result.work_experience.length === 0) {
      console.warn('[PDFExtractionService] All extraction methods failed, using raw text as last resort');
      // Split text into meaningful chunks (sentences or lines)
      const chunks = text.split(/[\.\n]/).filter(chunk => chunk.trim().length > 20);
      if (chunks.length > 0) {
        result.work_experience = chunks.slice(0, 10).map(chunk => chunk.trim()); // Limit to 10 chunks
      } else {
        // Absolute last resort: use entire text
        result.work_experience = [text.substring(0, 1000)]; // Limit to 1000 chars
      }
    }

    // Remove duplicates from arrays
    result.skills = [...new Set(result.skills)];
    result.languages = [...new Set(result.languages)];

    // FALLBACK EXTRACTION: If no structured sections found, extract from raw text
    const hasStructuredData = result.skills.length > 0 || result.languages.length > 0 || 
                              result.education.length > 0 || result.work_experience.length > 0;
    
    if (!hasStructuredData) {
      console.log('[PDFExtractionService] No structured sections found, using fallback extraction from raw text');
      
      // Extract technologies/skills using regex patterns
      const technologyPatterns = [
        // Programming languages
        /\b(javascript|typescript|python|java|c\+\+|c#|ruby|php|go|rust|swift|kotlin|scala|perl|r|matlab)\b/gi,
        // Frameworks and libraries
        /\b(react|vue|angular|node\.js|express|django|flask|spring|laravel|symfony|rails|asp\.net|\.net)\b/gi,
        // Databases
        /\b(sql|postgresql|mysql|mongodb|redis|elasticsearch|cassandra|oracle|sqlite|dynamodb)\b/gi,
        // Frontend
        /\b(html|css|sass|less|bootstrap|tailwind|webpack|vite|next\.js|nuxt\.js)\b/gi,
        // Cloud and DevOps
        /\b(aws|azure|gcp|docker|kubernetes|terraform|jenkins|gitlab|github|ci\/cd|ansible|puppet|chef)\b/gi,
        // Tools and methodologies
        /\b(git|jira|confluence|agile|scrum|kanban|devops|microservices|rest|graphql|api)\b/gi,
        // Data and ML
        /\b(machine learning|ml|ai|tensorflow|pytorch|pandas|numpy|scikit-learn|data science|big data)\b/gi
      ];
      
      technologyPatterns.forEach(pattern => {
        const matches = fullText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const skill = match.trim();
            if (skill.length > 2 && !result.skills.includes(skill.toLowerCase())) {
              result.skills.push(skill);
            }
          });
        }
      });
      
      // Extract languages (spoken languages)
      const spokenLanguagePatterns = [
        /\b(english|arabic|hebrew|spanish|french|german|chinese|japanese|korean|portuguese|italian|russian|hindi|dutch|swedish|norwegian|danish|finnish|polish|turkish)\b/gi,
        /\b(native|fluent|proficient|conversational|basic|intermediate|advanced)\s+(english|arabic|hebrew|spanish|french|german|chinese|japanese)\b/gi
      ];
      
      spokenLanguagePatterns.forEach(pattern => {
        const matches = fullText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lang = match.trim();
            if (lang.length > 2 && !result.languages.includes(lang.toLowerCase())) {
              result.languages.push(lang);
            }
          });
        }
      });
      
      // Extract academic degrees and education
      const degreePatterns = [
        /\b(b\.?sc|b\.?a|b\.?eng|bachelor|master|m\.?sc|m\.?a|m\.?eng|ph\.?d|doctorate|diploma|certificate)\b/gi,
        /\b(university|college|institute|school)\s+of\s+[a-z\s]+/gi,
        /\b(degree|graduated|studied|major|minor)\s+in\s+[a-z\s]+/gi
      ];
      
      degreePatterns.forEach(pattern => {
        const matches = fullText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const edu = match.trim();
            if (edu.length > 5 && !result.education.includes(edu)) {
              result.education.push(edu);
            }
          });
        }
      });
      
      // Extract job titles and work experience
      const jobTitlePatterns = [
        /\b(developer|engineer|programmer|analyst|manager|director|lead|senior|junior|architect|consultant|specialist|coordinator|instructor|trainer)\b/gi,
        /\b(software|web|frontend|backend|full.?stack|devops|data|qa|test|product|project|technical)\s+(developer|engineer|architect|manager|analyst|specialist)\b/gi
      ];
      
      jobTitlePatterns.forEach(pattern => {
        const matches = fullText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const title = match.trim();
            if (title.length > 3 && !result.work_experience.some(exp => exp.toLowerCase().includes(title.toLowerCase()))) {
              result.work_experience.push(title);
            }
          });
        }
      });
      
      // Extract bullet points (potential work experience items)
      const bulletPatterns = [
        /^[•\-\*]\s+(.+)$/gm,
        /^\d+\.\s+(.+)$/gm,
        /^[–—]\s+(.+)$/gm
      ];
      
      bulletPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const content = match.replace(/^[•\-\*\d\.–—]\s+/, '').trim();
            if (content.length > 10 && !result.work_experience.includes(content)) {
              result.work_experience.push(content);
            }
          });
        }
      });
      
      // Extract lines with years (potential work experience or education)
      const yearPattern = /\b(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}|\b(19|20)\d{2}\s*[-–—]\s*(present|current|now)/gi;
      const linesWithYears = lines.filter(line => yearPattern.test(line));
      linesWithYears.forEach(line => {
        if (line.length > 10 && !result.work_experience.includes(line) && !result.education.includes(line)) {
          // Try to determine if it's work or education based on keywords
          if (line.toLowerCase().includes('university') || line.toLowerCase().includes('college') || 
              line.toLowerCase().includes('degree') || line.toLowerCase().includes('bachelor') || 
              line.toLowerCase().includes('master')) {
            result.education.push(line);
          } else {
            result.work_experience.push(line);
          }
        }
      });
      
      // Remove duplicates
      result.skills = [...new Set(result.skills)];
      result.languages = [...new Set(result.languages)];
      result.education = [...new Set(result.education)];
      result.work_experience = [...new Set(result.work_experience)];
    }
    
    // LAST RESORT: If still empty, put raw text into work_experience
    if (result.skills.length === 0 && result.languages.length === 0 && 
        result.education.length === 0 && result.work_experience.length === 0) {
      console.warn('[PDFExtractionService] All extraction methods failed, using raw text as last resort');
      // Split text into meaningful chunks (sentences or lines)
      const chunks = text.split(/[\.\n]/).filter(chunk => chunk.trim().length > 20);
      if (chunks.length > 0) {
        result.work_experience = chunks.slice(0, 10).map(chunk => chunk.trim()); // Limit to 10 chunks
      } else {
        // Absolute last resort: use entire text
        result.work_experience = [text.substring(0, 1000)]; // Limit to 1000 chars
      }
    }

    console.log('[PDFExtractionService] Parsed CV data:', {
      skills_count: result.skills.length,
      languages_count: result.languages.length,
      education_count: result.education.length,
      work_experience_count: result.work_experience.length,
      volunteer_count: result.volunteer.length,
      military_count: result.military.length
    });

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

