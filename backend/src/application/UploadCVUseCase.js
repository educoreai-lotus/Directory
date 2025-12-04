// Application Layer - Upload CV Use Case
// Orchestrates PDF upload, extraction, parsing, and storage
// PHASE_3: This file is part of the extended enrichment flow

const PDFExtractionService = require('../infrastructure/PDFExtractionService');
const EmployeeRawDataRepository = require('../infrastructure/EmployeeRawDataRepository');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');

class UploadCVUseCase {
  constructor() {
    this.pdfExtractionService = new PDFExtractionService();
    this.rawDataRepository = new EmployeeRawDataRepository();
    this.employeeRepository = new EmployeeRepository();
  }

  /**
   * Process PDF CV upload
   * @param {string} employeeId - Employee UUID
   * @param {Buffer} fileBuffer - PDF file buffer
   * @returns {Promise<Object>} Result with extracted data
   */
  async execute(employeeId, fileBuffer) {
    try {
      console.log('[UploadCVUseCase] Processing PDF upload for employee:', employeeId);

      // Verify employee exists
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Step 1: Extract text from PDF
      console.log('[UploadCVUseCase] Extracting text from PDF...');
      const text = await this.pdfExtractionService.extractTextFromPDF(fileBuffer);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from PDF');
      }

      console.log('[UploadCVUseCase] Extracted', text.length, 'characters from PDF');

      // Step 2: Parse CV text into structured data
      console.log('[UploadCVUseCase] Parsing CV text...');
      const parsedData = await this.pdfExtractionService.parseCVText(text);
      
      console.log('[UploadCVUseCase] Parsed data:', {
        work_experience_count: parsedData.work_experience?.length || 0,
        skills_count: parsedData.skills?.length || 0,
        education_count: parsedData.education?.length || 0,
        languages_count: parsedData.languages?.length || 0
      });

      // Step 3: Sanitize PII (remove sensitive information)
      console.log('[UploadCVUseCase] Sanitizing PII...');
      const sanitizedData = this.pdfExtractionService.sanitizePII(parsedData);

      // Step 4: Save to employee_raw_data table
      console.log('[UploadCVUseCase] Saving to employee_raw_data table...');
      const savedData = await this.rawDataRepository.createOrUpdate(
        employeeId,
        'pdf',
        sanitizedData
      );

      console.log('[UploadCVUseCase] ✅ PDF data saved successfully');

      return {
        success: true,
        data: {
          id: savedData.id,
          source: savedData.source,
          work_experience_count: sanitizedData.work_experience?.length || 0,
          skills_count: sanitizedData.skills?.length || 0,
          education_count: sanitizedData.education?.length || 0,
          languages_count: sanitizedData.languages?.length || 0,
          created_at: savedData.created_at
        }
      };
    } catch (error) {
      console.error('[UploadCVUseCase] Error processing PDF:', error);
      throw error;
    }
  }
}

module.exports = UploadCVUseCase;

