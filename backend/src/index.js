const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const parseRequest = require('./shared/requestParser');
const formatResponse = require('./shared/responseFormatter');

// Load design tokens with error handling
let designTokens;
try {
  designTokens = require('../design-tokens.json');
} catch (error) {
  console.warn('[index.js] Could not load design-tokens.json:', error.message);
  designTokens = {}; // Fallback to empty object
}

// Controllers
const CompanyRegistrationController = require('./presentation/CompanyRegistrationController');
const CompanyVerificationController = require('./presentation/CompanyVerificationController');
const CSVUploadController = require('./presentation/CSVUploadController');
const CompanyProfileController = require('./presentation/CompanyProfileController');
const EmployeeController = require('./presentation/EmployeeController');
const AuthController = require('./presentation/AuthController');
const OAuthController = require('./presentation/OAuthController');
const EnrichmentController = require('./presentation/EnrichmentController');
const TrainerController = require('./presentation/TrainerController');
const EmployeeProfileApprovalController = require('./presentation/EmployeeProfileApprovalController');
const RequestController = require('./presentation/RequestController');
const UniversalEndpointController = require('./presentation/UniversalEndpointController');
const AdminController = require('./presentation/AdminController');
// PHASE_3: Import new controllers for extended enrichment flow
const PDFUploadController = require('./presentation/PDFUploadController');
const ManualDataController = require('./presentation/ManualDataController');
// Enrollment controller
const EnrollmentController = require('./presentation/EnrollmentController');
// Chatbot controller
const ChatbotController = require('./presentation/ChatbotController');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow all origins for now (can be restricted later)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With']
}));

// Add request logging middleware to track all incoming requests
app.use((req, res, next) => {
  console.log(`[Express] ${req.method} ${req.url}`);
  console.log(`[Express] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[Express] Content-Type:`, req.headers['content-type']);
  next();
});

// Note: parseRequest must come before express.json for stringified JSON
// But multer (file uploads) needs to be handled separately in the route
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conditional parseRequest middleware - skip for user-facing routes
app.use((req, res, next) => {
  if (
    req.path.includes('/manual-data') ||
    req.path.includes('/upload-cv')
  ) {
    return next();
  }
  return parseRequest(req, res, next);
});

app.use(formatResponse);

// Health check endpoint (must respond quickly for Railway)
app.get('/health', (req, res) => {
  // Check if critical controllers are initialized
  const criticalControllers = {
    authController,
    oauthController
  };
  
  const missingControllers = Object.entries(criticalControllers)
    .filter(([name, controller]) => !controller)
    .map(([name]) => name);
  
  if (missingControllers.length > 0) {
    return res.status(503).json({
      status: 'degraded',
      message: 'Some controllers failed to initialize',
      missingControllers,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Debug endpoint to find HR email (for development/testing only)
app.get('/debug/find-hr-email', async (req, res) => {
  try {
    const { companyName, employeeEmail } = req.query;
    const CompanyRepository = require('./infrastructure/CompanyRepository');
    const EmployeeRepository = require('./infrastructure/EmployeeRepository');
    
    const companyRepo = new CompanyRepository();
    const employeeRepo = new EmployeeRepository();
    
    let result = {};
    
    // Find company
    if (companyName) {
      const companies = await companyRepo.pool.query(
        `SELECT company_name, domain, hr_contact_name, hr_contact_email, hr_contact_role 
         FROM companies 
         WHERE LOWER(company_name) LIKE LOWER($1) OR LOWER(domain) LIKE LOWER($1)
         LIMIT 5`,
        [`%${companyName}%`]
      );
      result.companies = companies.rows;
    }
    
    // Find employee and their company HR
    if (employeeEmail) {
      const employees = await employeeRepo.pool.query(
        `SELECT e.id, e.full_name, e.email, e.employee_id, c.company_name, c.hr_contact_email, c.hr_contact_name
         FROM employees e
         LEFT JOIN companies c ON e.company_id = c.id
         WHERE LOWER(e.email) = LOWER($1)`,
        [employeeEmail]
      );
      result.employee = employees.rows[0] || null;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Design Tokens endpoint (raw JSON, not wrapped)
app.get('/design-tokens', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('application/json').send(designTokens || {});
});

// Logo assets endpoint
app.get('/assets/:logo', (req, res) => {
  const { logo } = req.params;
  const logoMap = {
    logo1: 'logo1.jpg',
    logo2: 'logo2.jpg'
  };

  const fileName = logoMap[logo?.toLowerCase()];

  if (!fileName) {
    return res.status(404).json({ error: 'Logo not found' });
  }

  const filePath = path.join(__dirname, '..', fileName);
  
  // Check if file exists before trying to send it (prevent ENOENT errors)
  if (!fs.existsSync(filePath)) {
    console.warn(`[Assets] Logo file not found: ${filePath}`);
    return res.status(404).json({ error: 'Logo file not found' });
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[Assets] Error sending logo file ${fileName}:`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving logo file' });
      }
    }
  });
});

// Initialize controllers with error handling
let companyRegistrationController, companyVerificationController, csvUploadController;
// PHASE_3: Initialize new controllers for extended enrichment flow
let pdfUploadController, manualDataController, enrollmentController;
let companyProfileController, employeeController, authController, oauthController;
let enrichmentController, approvalController, trainerController, requestController;
let universalEndpointController, adminController;
// Chatbot controller
let chatbotController;

const initController = (name, initFn) => {
  try {
    console.log(`[Init] Initializing ${name}...`);
    const controller = initFn();
    console.log(`[Init] ✅ ${name} initialized successfully`);
    return controller;
  } catch (error) {
    console.error(`[Init] ❌ Error initializing ${name}:`, error.message);
    console.error(`[Init] Stack:`, error.stack);
    return null; // Return null instead of crashing
  }
};

console.log('[Init] Starting controller initialization...');
companyRegistrationController = initController('CompanyRegistrationController', () => new CompanyRegistrationController());
companyVerificationController = initController('CompanyVerificationController', () => new CompanyVerificationController());
csvUploadController = initController('CSVUploadController', () => new CSVUploadController());
companyProfileController = initController('CompanyProfileController', () => new CompanyProfileController());
employeeController = initController('EmployeeController', () => new EmployeeController());
authController = initController('AuthController', () => new AuthController());
oauthController = initController('OAuthController', () => new OAuthController());
enrichmentController = initController('EnrichmentController', () => new EnrichmentController());
approvalController = initController('EmployeeProfileApprovalController', () => new EmployeeProfileApprovalController());
trainerController = initController('TrainerController', () => new TrainerController());
requestController = initController('RequestController', () => new RequestController());
universalEndpointController = initController('UniversalEndpointController', () => new UniversalEndpointController());
adminController = initController('AdminController', () => new AdminController());
// PHASE_3: Initialize new controllers for extended enrichment flow
pdfUploadController = initController('PDFUploadController', () => new PDFUploadController());
manualDataController = initController('ManualDataController', () => new ManualDataController());
enrollmentController = initController('EnrollmentController', () => new EnrollmentController());
// Chatbot controller
chatbotController = initController('ChatbotController', () => new ChatbotController());
console.log('[Init] Controller initialization complete');

// API Routes
const apiRouter = express.Router();

// Helper to check if controller is initialized
const checkController = (controller, name) => {
  if (!controller) {
    const error = new Error(`Controller ${name} is not initialized. Check server logs for initialization errors.`);
    error.statusCode = 503; // Service Unavailable
    throw error;
  }
};

// Authentication
apiRouter.post('/auth/login', (req, res, next) => {
  try {
    checkController(authController, 'AuthController');
    authController.login(req, res, next);
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/auth/logout', (req, res, next) => {
  authController.logout(req, res, next);
});

// Get current user (requires authentication)
const { authMiddleware, optionalAuthMiddleware, hrOnlyMiddleware, adminOnlyMiddleware } = require('./shared/authMiddleware');
apiRouter.get('/auth/me', authMiddleware, (req, res, next) => {
  authController.getCurrentUser(req, res, next);
});

// OAuth Routes
// LinkedIn OAuth
apiRouter.get('/oauth/linkedin/authorize', authMiddleware, (req, res, next) => {
  oauthController.getLinkedInAuthUrl(req, res, next);
});

apiRouter.get('/oauth/linkedin/callback', (req, res, next) => {
  oauthController.handleLinkedInCallback(req, res, next);
});

// GitHub OAuth
apiRouter.get('/oauth/github/authorize', authMiddleware, (req, res, next) => {
  oauthController.getGitHubAuthUrl(req, res, next);
});

apiRouter.get('/oauth/github/callback', (req, res, next) => {
  oauthController.handleGitHubCallback(req, res, next);
});

// Company Registration
apiRouter.post('/companies/register', (req, res, next) => {
  companyRegistrationController.register(req, res, next);
});

// Company Verification
apiRouter.get('/companies/:id/verification', (req, res, next) => {
  companyVerificationController.getStatus(req, res, next);
});

apiRouter.post('/companies/:id/verify', (req, res, next) => {
  companyVerificationController.verify(req, res, next);
});

// CSV Upload - NO AUTH REQUIRED (handled by authMiddleware in dummy mode)
// Route: POST /api/v1/companies/:id/upload
apiRouter.post('/companies/:id/upload', (req, res, next) => {
  console.log('[index.js] ========== CSV UPLOAD ROUTE HIT ==========');
  console.log('[index.js] Route: POST /api/v1/companies/:id/upload');
  console.log('[index.js] Full URL:', req.originalUrl);
  console.log('[index.js] Company ID:', req.params.id);
  console.log('[index.js] Content-Type:', req.headers['content-type']);
  console.log('[index.js] Content-Length:', req.headers['content-length']);
  console.log('[index.js] Authorization header:', req.headers['authorization'] ? 'present' : 'missing');
  console.log('[index.js] AUTH_MODE:', process.env.AUTH_MODE || 'not set (defaults to dummy)');
  console.log('[index.js] csvUploadController exists:', !!csvUploadController);
  
  try {
    checkController(csvUploadController, 'CSVUploadController');
    console.log('[index.js] ✅ Controller check passed, calling csvUploadController.uploadCSV()');
    csvUploadController.uploadCSV(req, res, next);
  } catch (error) {
    console.error('[index.js] ❌ ERROR in CSV upload route handler:');
    console.error('[index.js] Error message:', error.message);
    console.error('[index.js] Error stack:', error.stack);
    console.error('[index.js] Error name:', error.name);
    next(error);
  }
});

// Company Profile
apiRouter.get('/companies/:id/profile', (req, res, next) => {
  companyProfileController.getProfile(req, res, next);
});

// Employee Management
apiRouter.post('/companies/:id/employees', (req, res, next) => {
  employeeController.addEmployee(req, res, next);
});

apiRouter.put('/companies/:id/employees/:employeeId', (req, res, next) => {
  employeeController.updateEmployee(req, res, next);
});

apiRouter.delete('/companies/:id/employees/:employeeId', (req, res, next) => {
  employeeController.deleteEmployee(req, res, next);
});

apiRouter.get('/companies/:id/employees/:employeeId', (req, res, next) => {
  employeeController.getEmployee(req, res, next);
});

// Employee Profile Data (Skills, Courses, Dashboard, Learning Path)
apiRouter.get('/companies/:id/employees/:employeeId/skills', authMiddleware, (req, res, next) => {
  employeeController.getEmployeeSkills(req, res, next);
});

apiRouter.get('/companies/:id/employees/:employeeId/courses', authMiddleware, (req, res, next) => {
  employeeController.getEmployeeCourses(req, res, next);
});

apiRouter.get('/companies/:id/employees/:employeeId/learning-path', authMiddleware, (req, res, next) => {
  employeeController.getEmployeeLearningPath(req, res, next);
});

apiRouter.get('/companies/:id/employees/:employeeId/dashboard', authMiddleware, (req, res, next) => {
  employeeController.getEmployeeDashboard(req, res, next);
});

// Get manager hierarchy
apiRouter.get('/companies/:id/employees/:employeeId/management-hierarchy', authMiddleware, (req, res, next) => {
  employeeController.getManagerHierarchy(req, res, next);
});

// Employee Requests
apiRouter.post('/companies/:id/employees/:employeeId/requests', authMiddleware, (req, res, next) => {
  requestController.submitRequest(req, res, next);
});

apiRouter.get('/companies/:id/employees/:employeeId/requests', authMiddleware, (req, res, next) => {
  requestController.getEmployeeRequests(req, res, next);
});

// Company Requests (HR/Manager view)
apiRouter.get('/companies/:id/requests', authMiddleware, (req, res, next) => {
  requestController.getCompanyRequests(req, res, next);
});

apiRouter.put('/companies/:id/requests/:requestId', authMiddleware, (req, res, next) => {
  requestController.updateRequestStatus(req, res, next);
});

// Profile Enrichment
apiRouter.post('/employees/:employeeId/enrich', authMiddleware, (req, res, next) => {
  console.log("[Route] /employees/:employeeId/enrich HIT");
  console.log('[Route] POST /employees/:employeeId/enrich - Request received');
  console.log('[Route] Employee ID:', req.params.employeeId);
  console.log('[Route] Request body:', req.body);
  console.log('[Route] EnrichmentController initialized:', !!enrichmentController);
  
  if (!enrichmentController) {
    console.error('[Route] EnrichmentController is not initialized!');
    return res.status(503).json({
      requester_service: 'directory_service',
      response: {
        success: false,
        error: 'Enrichment service is not available. Controller initialization failed.'
      }
    });
  }
  
  enrichmentController.enrichProfile(req, res, next);
});

apiRouter.get('/employees/:employeeId/enrichment-status', authMiddleware, (req, res, next) => {
  enrichmentController.getEnrichmentStatus(req, res, next);
});

// PHASE_3: Extended enrichment flow - PDF upload and manual data endpoints
const multer = require('multer');
const upload = multer({ 
  dest: 'uploads/', // Temporary directory for file uploads
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// PHASE_3: PDF CV upload endpoint
// Route: POST /api/v1/employees/:id/upload-cv
apiRouter.post('/employees/:id/upload-cv', authMiddleware, upload.single('cv'), (req, res, next) => {
  console.log('[index.js] PDF upload route hit - POST /api/v1/employees/:id/upload-cv');
  console.log('[index.js] req.params:', req.params);
  console.log('[index.js] req.file:', req.file ? 'OK' : 'MISSING');
  try {
    checkController(pdfUploadController, 'PDFUploadController');
    pdfUploadController.uploadCV(req, res, next);
  } catch (error) {
    next(error);
  }
});

// PHASE_3: Manual profile data endpoint
// Custom middleware to extract unwrapped body (bypass parseRequest wrapper)
const extractUnwrappedBody = (req, res, next) => {
  // parseRequest may have wrapped the body in { requester_service, payload }
  // Extract the actual data from payload if it exists
  if (req.body && req.body.payload && req.body.requester_service) {
    // Body was wrapped by parseRequest - extract payload
    req.body = req.body.payload;
  } else if (req.parsedBody && typeof req.parsedBody === 'object') {
    // If parseRequest set parsedBody, check if it has payload
    if (req.parsedBody.payload) {
      req.body = req.parsedBody.payload;
    } else {
      // parsedBody is the actual data (not wrapped)
      req.body = req.parsedBody;
    }
  }
  // Otherwise req.body is already correct (not wrapped)
  
  console.log("[INDEX] RAW manual-data req.body =", JSON.stringify(req.body, null, 2));
  next();
};

apiRouter.post(
  '/employees/:id/manual-data',
  authMiddleware,
  extractUnwrappedBody, // Extract unwrapped body before controller
  (req, res, next) => {
    try {
      checkController(manualDataController, 'ManualDataController');
      manualDataController.saveManualData(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Profile Approval Routes (HR only)
apiRouter.get('/companies/:id/profile-approvals', authMiddleware, (req, res, next) => {
  approvalController.getPendingApprovals(req, res, next);
});

apiRouter.post('/companies/:id/profile-approvals/:approvalId/approve', authMiddleware, (req, res, next) => {
  approvalController.approveProfile(req, res, next);
});

apiRouter.post('/companies/:id/profile-approvals/:approvalId/reject', authMiddleware, (req, res, next) => {
  approvalController.rejectProfile(req, res, next);
});

apiRouter.get('/employees/:id/approval-status', authMiddleware, (req, res, next) => {
  approvalController.getApprovalStatus(req, res, next);
});

// Trainer Routes
apiRouter.get('/employees/:employeeId/trainer-settings', authMiddleware, (req, res, next) => {
  trainerController.getTrainerSettings(req, res, next);
});

apiRouter.put('/employees/:employeeId/trainer-settings', authMiddleware, (req, res, next) => {
  trainerController.updateTrainerSettings(req, res, next);
});

apiRouter.get('/employees/:employeeId/courses-taught', authMiddleware, (req, res, next) => {
  trainerController.getCoursesTaught(req, res, next);
});

// Admin routes (platform-level, bypass company scoping)
apiRouter.get('/admin/companies', authMiddleware, adminOnlyMiddleware, (req, res, next) => {
  try {
    checkController(adminController, 'AdminController');
    adminController.getAllCompanies(req, res, next);
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/admin/companies/:companyId', authMiddleware, adminOnlyMiddleware, (req, res, next) => {
  try {
    checkController(adminController, 'AdminController');
    adminController.getCompany(req, res, next);
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/admin/employees/:employeeId', authMiddleware, adminOnlyMiddleware, (req, res, next) => {
  try {
    checkController(adminController, 'AdminController');
    adminController.getEmployee(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Enrollment Routes
apiRouter.post(
  '/companies/:companyId/enrollments/career-path',
  authMiddleware,
  (req, res, next) => {
    console.log('[DEBUG] Career-Path enrollment route HIT');
    console.log('[index.js] Enrollment route hit - POST /companies/:companyId/enrollments/career-path');
    console.log('[index.js] req.params:', req.params);
    console.log('[index.js] req.body:', req.body);
    console.log('[index.js] EnrollmentController initialized:', !!enrollmentController);
    
    try {
      checkController(enrollmentController, 'EnrollmentController');
      console.log('[index.js] Calling enrollmentController.enrollCareerPath');
      enrollmentController.enrollCareerPath(req, res, next);
    } catch (error) {
      console.error('[index.js] Error in enrollment route:', error);
      next(error);
    }
  }
);

// Chatbot query endpoint
apiRouter.post(
  '/chatbot/query',
  authMiddleware,
  (req, res, next) => {
    console.log('[index.js] Chatbot query route hit - POST /api/v1/chatbot/query');
    try {
      checkController(chatbotController, 'ChatbotController');
      chatbotController.processQuery(req, res, next);
    } catch (error) {
      console.error('[index.js] Error in chatbot route:', error);
      next(error);
    }
  }
);

// Universal Endpoint for other microservices (no auth required - internal service-to-service)
// This must be BEFORE /api/v1 to avoid conflicts
app.post('/api/fill-content-metrics', (req, res) => {
  try {
    checkController(universalEndpointController, 'UniversalEndpointController');
    universalEndpointController.handleRequest(req, res);
  } catch (error) {
    console.error('[index.js] Universal endpoint error:', error);
    res.status(503).send(JSON.stringify({
      requester_service: req.body?.requester_service || 'unknown',
      payload: req.body?.payload || {},
      response: {
        error: 'Universal endpoint is not available. Controller initialization failed.'
      }
    }));
  }
});

// Mount API router BEFORE error handlers
console.log('[index.js] ========== MOUNTING API ROUTER ==========');
console.log('[index.js] Mounting apiRouter at /api/v1');
console.log('[index.js] Total routes registered:', apiRouter.stack.length);
app.use('/api/v1', apiRouter);
console.log('[index.js] ✅ API router mounted at /api/v1');

// Log critical route registrations
console.log('[index.js] ✅ CSV Upload route registered: POST /api/v1/companies/:id/upload');
console.log('[index.js] ✅ Enrollment route registered: POST /api/v1/companies/:companyId/enrollments/career-path');
console.log('[index.js] ✅ EnrollmentController initialized:', !!enrollmentController);
console.log('[index.js] ✅ Chatbot route registered: POST /api/v1/chatbot/query');
console.log('[index.js] ✅ ChatbotController initialized:', !!chatbotController);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    requester_service: 'directory_service',
    response: {
      error: 'Endpoint not found'
    }
  });
});

// Error handler - MUST be after all routes
app.use((err, req, res, next) => {
  console.error('[index.js] ========== GLOBAL ERROR HANDLER ==========');
  console.error('[index.js] Error caught by global error handler:');
  console.error('[index.js] Error message:', err.message);
  console.error('[index.js] Error code:', err.code);
  console.error('[index.js] Error constraint:', err.constraint);
  console.error('[index.js] Error detail:', err.detail);
  console.error('[index.js] Error stack:', err.stack);
  console.error('[index.js] Request path:', req.path);
  console.error('[index.js] Request method:', req.method);
  
  // Don't send response if headers already sent
  if (res.headersSent) {
    console.error('[index.js] Headers already sent, cannot send error response');
    return next(err);
  }
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    requester_service: 'directory_service',
    response: {
      error: err.message || 'Internal server error'
    }
  });
});

// Error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught Exception:', error);
  console.error('[Process] Stack:', error.stack);
  // Log but don't exit - let Railway handle container restarts
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise);
  console.error('[Process] Reason:', reason);
  if (reason instanceof Error) {
    console.error('[Process] Stack:', reason.stack);
  }
  // Log but don't exit - let Railway handle container restarts
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('[Process] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Process] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
try {
  const server = app.listen(PORT, () => {
    console.log(`[Server] ✅ Server running on port ${PORT}`);
    console.log(`[Server] Health check available at http://localhost:${PORT}/health`);
  });

  server.on('error', (error) => {
    console.error('[Server] Error starting server:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('[Server] Unknown server error, exiting...');
      process.exit(1);
    }
  });
} catch (error) {
  console.error('[Server] Failed to start server:', error);
  console.error('[Server] Stack:', error.stack);
  process.exit(1);
}

