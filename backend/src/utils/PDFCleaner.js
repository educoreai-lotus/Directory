class PDFCleaner {
  static cleanArray(arr) {
    if (!Array.isArray(arr)) return [];

    return arr.filter(line => !PDFCleaner.isSensitive(line));
  }

  static isSensitive(line) {
    if (!line || typeof line !== 'string') return false;

    const t = line.trim();

    // 1. Bullets or meaningless symbols - single character lines
    if (t.length === 1 && /[•\-\*\.]/.test(t)) return true;

    // 2. Lines that contain ONLY capital letters, numbers, or punctuation
    // Exclude short tech acronyms (2-4 letters) like AWS, API, SQL, HTML, CSS
    const techAcronyms = ['aws', 'api', 'sql', 'html', 'css', 'gcp', 'ide', 'sdk', 'cli', 'sso', 'iam', 'cdn', 'dns', 'ssl', 'tls', 'http', 'https', 'json', 'xml', 'rest', 'soap', 'grpc', 'jwt', 'oauth', 'cors', 'csp', 'xss', 'csrf'];
    if (/^[A-Z\s]+$/.test(t) && t.length > 1 && !/[a-z]/.test(t) && !techAcronyms.includes(t.toLowerCase())) return true; // Only capitals (but not tech acronyms)
    if (/^\d+$/.test(t)) return true; // Only numbers
    if (/^[^\w\s]+$/.test(t)) return true; // Only punctuation

    // 3. Email addresses
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(t)) return true;

    // 4. Phone numbers
    if (/\+?\d{1,3}[-\s]?\d{6,12}/.test(t)) return true;

    // 5. Date formats - comprehensive patterns
    // YYYY-MM-DD
    if (/\b\d{4}-\d{2}-\d{2}\b/.test(t)) return true;
    // DD/MM/YYYY or MM/DD/YYYY
    if (/\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(t)) return true;
    // Just year (4 digits, standalone or with context)
    if (/^\d{4}$/.test(t) || /\b(19|20)\d{2}\b/.test(t) && t.length < 10) return true;
    // Month Day, Year (e.g., "June 9, 1997")
    if (/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i.test(t)) return true;
    // Day Month Year (e.g., "9 June 1997")
    if (/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i.test(t)) return true;

    // 6. Place names - comma-separated (e.g., "Buq'ata, Golan Heights", "New York, USA")
    // Match: Word(s), Word(s) where both parts start with capital letters
    if (/^[A-Z][A-Za-z'\-]+(\s+[A-Z][a-z'\-]+)*\s*,\s*[A-Z][A-Za-z'\-]+(\s+[A-Za-z'\-]+)*$/.test(t)) return true;
    // Place names - dash-separated (e.g., "Buq'ata - Golan Heights", "Tel Aviv - Israel")
    // Match: Word(s) - Word(s) where both parts start with capital letters
    if (/^[A-Z][A-Za-z'\-]+(\s+[A-Z][a-z'\-]+)*\s+-\s+[A-Z][A-Za-z'\-]+(\s+[A-Za-z'\-]+)*$/.test(t)) return true;

    // 7. Generic address-like patterns
    if (/\b(street|st\.|road|rd\.|avenue|ave\.|blvd|boulevard|lane|city|district|region|village|zip|postal|postcode|location)\b/i.test(t))
      return true;

    // 8. Address-like structure number + words
    if (/^\d{1,4}\s+\w+(\s+\w+){0,4}$/i.test(t))
      return true;

    // 9. Standalone locations - single capitalized word (but not job titles, institutions, or tech)
    const commonJobWords = ['developer', 'engineer', 'manager', 'director', 'analyst', 'specialist', 
                           'coordinator', 'instructor', 'trainer', 'consultant', 'architect', 
                           'experience', 'education', 'skills', 'projects', 'volunteer', 'military',
                           'lead', 'senior', 'junior', 'assistant', 'executive', 'officer', 'master'];
    const institutionWords = ['university', 'college', 'institute', 'school', 'academy', 'project',
                             'program', 'course', 'training', 'certification', 'degree'];
    const techWords = ['javascript', 'react', 'docker', 'aws', 'azure', 'gcp', 'node', 'python', 'java',
                      'sql', 'html', 'css', 'api', 'git', 'kubernetes', 'terraform', 'postgresql',
                      'mongodb', 'redis', 'elasticsearch', 'typescript', 'vue', 'angular', 'express',
                      'django', 'flask', 'spring', 'laravel', 'rails'];
    
    // Single capitalized word that's not a job title, institution, or technology
    if (/^[A-Z][a-z'\-]{3,20}$/.test(t) && 
        !commonJobWords.includes(t.toLowerCase()) && 
        !institutionWords.includes(t.toLowerCase()) &&
        !techWords.includes(t.toLowerCase())) {
      return true;
    }

    // 10. Multi-word location names (e.g., "Golan Heights", "Tel Aviv", "New York")
    // Pattern: Capitalized word(s) that look like place names
    const locationPattern = /^[A-Z][a-z'\-]+(\s+[A-Z][a-z'\-]+)*$/;
    if (locationPattern.test(t) && t.split(/\s+/).length <= 3) {
      // Exclude if it contains job-related, institution, or technology words
      const lowerT = t.toLowerCase();
      const hasJobWord = commonJobWords.some(word => lowerT.includes(word));
      const hasInstitutionWord = institutionWords.some(word => lowerT.includes(word));
      const techWords = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'html', 'css', 
                        'api', 'git', 'docker', 'aws', 'azure', 'gcp', 'kubernetes', 'terraform',
                        'postgresql', 'mongodb', 'redis', 'elasticsearch', 'typescript', 'vue',
                        'angular', 'express', 'django', 'flask', 'spring', 'laravel', 'rails'];
      const hasTechWord = techWords.some(word => lowerT.includes(word));
      
      if (!hasJobWord && !hasInstitutionWord && !hasTechWord) {
        return true;
      }
    }

    return false;
  }
}

module.exports = PDFCleaner;

