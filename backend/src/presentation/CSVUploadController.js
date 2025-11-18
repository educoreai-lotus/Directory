// Presentation Layer - CSV Upload Controller
// Handles HTTP requests for CSV file uploads

const multer = require('multer');
const ParseCSVUseCase = require('../application/ParseCSVUseCase');
const ErrorTranslator = require('../shared/ErrorTranslator');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

class CSVUploadController {
  constructor() {
    this.parseCSVUseCase = new ParseCSVUseCase();
    this.upload = upload.single('csvFile');
  }

  /**
   * Upload and parse CSV file
   * POST /api/v1/companies/:id/upload
   */
  async uploadCSV(req, res, next) {
    // Use multer middleware
    this.upload(req, res, async (err) => {
      if (err) {
        console.error('[CSVUploadController] Upload error:', err);
        return res.status(400).json({
          error: err.message || 'File upload failed'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No CSV file provided'
        });
      }

      try {
        const { id: companyId } = req.params;
        const fileBuffer = req.file.buffer;

        console.log(`[CSVUploadController] Processing CSV upload for company ${companyId}, file size: ${fileBuffer.length} bytes`);

        // Parse and process CSV
        const result = await this.parseCSVUseCase.execute(fileBuffer, companyId);

        if (result.success) {
          res.status(200).json({
            success: true,
            message: result.message,
            validation: result.validation,
            created: result.created
          });
        } else {
          // Validation failed - return errors but don't create records
          res.status(400).json({
            success: false,
            message: result.message,
            validation: result.validation,
            created: result.created
          });
        }
      } catch (error) {
        console.error('[CSVUploadController] CSV processing error:', error);
        
        // Translate technical errors to human-friendly messages
        const userFriendlyMessage = ErrorTranslator.translateError(error);
        
        // Determine appropriate status code
        let statusCode = 500;
        if (error.code === '23505' || error.code === '23514' || error.code === '23502') {
          statusCode = 400; // Bad request for constraint violations
        } else if (error.message && (
          error.message.includes('Email') ||
          error.message.includes('email') ||
          error.message.includes('conflict') ||
          error.message.includes('already exists')
        )) {
          statusCode = 400;
        }
        
        res.status(statusCode).json({
          error: userFriendlyMessage
        });
      }
    });
  }
}

module.exports = CSVUploadController;

