class PDFCleaner {
  static cleanArray(arr) {
    if (!Array.isArray(arr)) return [];

    return arr.filter(line => !PDFCleaner.isSensitive(line));
  }

  static isSensitive(line) {
    if (!line || typeof line !== 'string') return false;

    const t = line.trim();

    // email
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(t)) return true;

    // phone numbers
    if (/\+?\d{1,3}[-\s]?\d{6,12}/.test(t)) return true;

    // dates (DD/MM/YYYY or YYYY-MM-DD)
    if (/\b\d{2}\/\d{2}\/\d{4}\b/.test(t)) return true;
    if (/\b\d{4}-\d{2}-\d{2}\b/.test(t)) return true;

    // generic address-like patterns
    if (/\b(street|st\.|road|rd\.|avenue|ave\.|blvd|boulevard|lane|city|district|region|village|zip|postal|postcode|location)\b/i.test(t))
      return true;

    // address-like structure number + words
    if (/^\d{1,4}\s+\w+(\s+\w+){0,4}$/i.test(t))
      return true;

    // single capitalized word → likely city or country (but not common job titles)
    // Only match if it's a standalone word that looks like a location name
    // Exclude common job-related words
    const commonJobWords = ['developer', 'engineer', 'manager', 'director', 'analyst', 'specialist', 
                           'coordinator', 'instructor', 'trainer', 'consultant', 'architect', 
                           'experience', 'education', 'skills', 'projects', 'volunteer', 'military'];
    if (/^[A-Z][a-z]{3,20}$/.test(t) && !commonJobWords.includes(t.toLowerCase())) {
      return true;
    }

    return false;
  }
}

module.exports = PDFCleaner;

