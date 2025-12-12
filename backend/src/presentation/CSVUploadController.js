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
    console.log('[CSVUploadController] ========== CONSTRUCTOR CALLED ==========');
    console.log('[CSVUploadController] Initializing CSVUploadController...');
    this.parseCSVUseCase = new ParseCSVUseCase();
    this.upload = upload.single('csvFile');
    console.log('[CSVUploadController] ✅ CSVUploadController initialized successfully');
    console.log('[CSVUploadController] Multer configured for single file upload with field name: csvFile');
  }

  /**
   * Upload and parse CSV file
   * POST /api/v1/companies/:id/upload
   */
  async uploadCSV(req, res, next) {
    console.log('[CSVUploadController] ========== CSV UPLOAD REQUEST RECEIVED ==========');
    console.log('[CSVUploadController] Method:', req.method);
    console.log('[CSVUploadController] URL:', req.url);
    console.log('[CSVUploadController] Company ID:', req.params.id);
    console.log('[CSVUploadController] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[CSVUploadController] Content-Type:', req.headers['content-type']);
    console.log('[CSVUploadController] Content-Length:', req.headers['content-length']);
    
    // Use multer middleware
    this.upload(req, res, async (err) => {
      console.log('[CSVUploadController] Multer callback executed');
      console.log('[CSVUploadController] Error from multer:', err ? err.message : 'none');
      console.log('[CSVUploadController] req.file exists:', !!req.file);
      if (req.file) {
        console.log('[CSVUploadController] File details:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          bufferLength: req.file.buffer ? req.file.buffer.length : 0
        });
      }
      
      if (err) {
        console.error('[CSVUploadController] Upload error:', err);
        console.error('[CSVUploadController] Upload error stack:', err.stack);
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

        // Validate company ID format (should be UUID)
        if (!companyId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
          return res.status(400).json({
            error: 'Invalid company ID format. Please ensure you are uploading to a valid company.'
          });
        }

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
        console.error('[CSVUploadController] Error stack:', error.stack);
        console.error('[CSVUploadController] Error code:', error.code);
        console.error('[CSVUploadController] Error constraint:', error.constraint);
        console.error('[CSVUploadController] Error detail:', error.detail);
        console.error('[CSVUploadController] Error message:', error.message);
        
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

