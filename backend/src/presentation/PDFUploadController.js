// Presentation Layer - PDF Upload Controller
// Handles PDF CV upload endpoints
// PHASE_3: This file is part of the extended enrichment flow

const UploadCVUseCase = require('../application/UploadCVUseCase');
const EmployeeRepository = require('../infrastructure/EmployeeRepository');
const CompanyRepository = require('../infrastructure/CompanyRepository');
const fs = require('fs');
const path = require('path');

class PDFUploadController {
  constructor() {
    this.uploadCVUseCase = new UploadCVUseCase();
    this.employeeRepository = new EmployeeRepository();
    this.companyRepository = new CompanyRepository();
  }

  getRequesterDirectoryUserId(req) {
    return req.user?.directoryUserId || req.user?.id || null;
  }

  getRequesterCompanyId(req) {
    return req.user?.organizationId || req.user?.companyId || req.user?.company_id || null;
  }

  isSystemAdmin(req) {
    return req.user?.isSystemAdmin === true;
  }

  async isHrForCompany(req, companyId) {
    const requesterId = this.getRequesterDirectoryUserId(req);
    if (!requesterId) return false;
    const requesterEmployee = await this.employeeRepository.findById(requesterId);
    if (!requesterEmployee) return false;
    if (String(requesterEmployee.company_id) !== String(companyId)) return false;

    const company = await this.companyRepository.findById(companyId);
    if (!company || !company.hr_contact_email) return false;
    return (
      String(company.hr_contact_email).trim().toLowerCase() ===
      String(requesterEmployee.email || '').trim().toLowerCase()
    );
  }

  async canAccessEmployee(req, targetEmployeeId) {
    const target = await this.employeeRepository.findById(targetEmployeeId);
    if (!target) {
      return { allowed: false, reason: 'not_found', target: null };
    }
    if (this.isSystemAdmin(req)) {
      return { allowed: true, reason: 'system_admin', target };
    }
    const requesterId = this.getRequesterDirectoryUserId(req);
    if (requesterId && String(requesterId) === String(targetEmployeeId)) {
      return { allowed: true, reason: 'self', target };
    }
    const requesterCompanyId = this.getRequesterCompanyId(req);
    if (!requesterCompanyId || String(requesterCompanyId) !== String(target.company_id)) {
      return { allowed: false, reason: 'forbidden', target };
    }
    const hr = await this.isHrForCompany(req, target.company_id);
    if (hr) {
      return { allowed: true, reason: 'hr', target };
    }
    return { allowed: false, reason: 'forbidden', target };
  }

  /**
   * Handle PDF CV upload
   * POST /api/v1/employees/:id/upload-cv
   * Requires authentication
   */
  async uploadCV(req, res, next) {
    try {
      console.log('[PDFUploadController] /upload-cv endpoint reached');
      console.log('[PDFUploadController] employeeId param:', req.params.id || req.params.employeeId);
      console.log('[PDFUploadController] file present:', !!req.file);
      console.log('[PDFUploadController] req.params:', req.params);
      console.log('[PDFUploadController] req.method:', req.method);
      console.log('[PDFUploadController] req.url:', req.url);
      
      // PHASE_3: Get employee ID from params and verify authentication
      const { id } = req.params;
      const access = await this.canAccessEmployee(req, id);
      if (!access.allowed) {
        if (access.reason === 'not_found') {
          return res.status(404).json({
            success: false,
            message: 'Employee not found'
          });
        }
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // PHASE_3: Validate file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please upload a PDF file.'
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
          success: false,
          message: 'Invalid file type. Only PDF files are allowed.'
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
          success: false,
          message: 'Invalid file type. Only PDF files are allowed.'
        });
      }

      console.log('[PDFUploadController] Processing PDF upload for employee:', id);
      console.log('[PDFUploadController] File:', req.file.originalname, 'Size:', req.file.size, 'bytes');

      // PHASE_3: Read file buffer
      const fileBuffer = fs.readFileSync(req.file.path);

      // PHASE_3: Process PDF upload
      const result = await this.uploadCVUseCase.execute(id, fileBuffer);
      
      console.log('[PDFUploadController] Saved raw data successfully');

      // PHASE_3: Clean up uploaded file after processing
      try {
        fs.unlinkSync(req.file.path);
        console.log('[PDFUploadController] Temporary file deleted');
      } catch (err) {
        console.warn('[PDFUploadController] Failed to delete temporary file:', err);
      }

      console.log('[PDFUploadController] Sending success response');
      return res.status(200).json({ 
        success: true,
        extracted_data: result.data?.extracted_data || null
      });
    } catch (error) {
      console.error('[PDFUploadController] Error in upload-cv:', error);
      console.error('[PDFUploadController] Error stack:', error.stack);

      // PHASE_3: Clean up uploaded file on error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.warn('[PDFUploadController] Failed to delete file on error:', err);
        }
      }

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to upload and process CV'
      });
    }
  }
}

module.exports = PDFUploadController;

