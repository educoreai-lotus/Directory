// Presentation Layer - PDF Upload Controller
// Handles PDF CV upload endpoints
// PHASE_3: This file is part of the extended enrichment flow

const UploadCVUseCase = require('../application/UploadCVUseCase');
const fs = require('fs');
const path = require('path');

class PDFUploadController {
  constructor() {
    this.uploadCVUseCase = new UploadCVUseCase();
  }

  /**
   * Handle PDF CV upload
   * POST /api/v1/employees/:id/upload-cv
   * Requires authentication
   */
  async uploadCV(req, res, next) {
    try {
      // PHASE_3: Get employee ID from params and verify authentication
      const { id } = req.params;
      const authenticatedEmployeeId = req.user?.id || req.user?.employeeId;
      const isHR = req.user?.isHR || false;

      // Verify employee ID matches authenticated user (unless HR)
      if (!isHR && authenticatedEmployeeId !== id) {
        return res.status(403).json({
          requester_service: 'directory_service',
          response: {
            error: 'You can only upload CV for your own profile'
          }
        });
      }

      // PHASE_3: Validate file exists
      if (!req.file) {
        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            error: 'No file uploaded. Please upload a PDF file.'
          }
        });
      }

      // PHASE_3: Validate file type (PDF only)
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      if (fileExtension !== '.pdf') {
        // Clean up uploaded file
        if (req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (err) {
            console.warn('[PDFUploadController] Failed to delete invalid file:', err);
          }
        }

        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            error: 'Invalid file type. Only PDF files are allowed.'
          }
        });
      }

      // PHASE_3: Validate MIME type
      if (req.file.mimetype !== 'application/pdf') {
        // Clean up uploaded file
        if (req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (err) {
            console.warn('[PDFUploadController] Failed to delete invalid file:', err);
          }
        }

        return res.status(400).json({
          requester_service: 'directory_service',
          response: {
            error: 'Invalid file type. Only PDF files are allowed.'
          }
        });
      }

      console.log('[PDFUploadController] Processing PDF upload for employee:', id);
      console.log('[PDFUploadController] File:', req.file.originalname, 'Size:', req.file.size, 'bytes');

      // PHASE_3: Read file buffer
      const fileBuffer = fs.readFileSync(req.file.path);

      // PHASE_3: Process PDF upload
      const result = await this.uploadCVUseCase.execute(id, fileBuffer);

      // PHASE_3: Clean up uploaded file after processing
      try {
        fs.unlinkSync(req.file.path);
        console.log('[PDFUploadController] Temporary file deleted');
      } catch (err) {
        console.warn('[PDFUploadController] Failed to delete temporary file:', err);
      }

      return res.status(200).json({
        requester_service: 'directory_service',
        response: result
      });
    } catch (error) {
      console.error('[PDFUploadController] Error uploading CV:', error);

      // PHASE_3: Clean up uploaded file on error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.warn('[PDFUploadController] Failed to delete file on error:', err);
        }
      }

      return res.status(500).json({
        requester_service: 'directory_service',
        response: {
          error: error.message || 'Failed to upload and process CV'
        }
      });
    }
  }
}

module.exports = PDFUploadController;

