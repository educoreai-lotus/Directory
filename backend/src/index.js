const express = require('express');
const cors = require('cors');
const path = require('path');
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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow all origins for now (can be restricted later)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Note: parseRequest must come before express.json for stringified JSON
// But multer (file uploads) needs to be handled separately in the route
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(parseRequest);
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
  res.sendFile(filePath);
});

// Initialize controllers with error handling
let companyRegistrationController, companyVerificationController, csvUploadController;
// PHASE_3: Initialize new controllers for extended enrichment flow
let pdfUploadController, manualDataController;
let companyProfileController, employeeController, authController, oauthController;
let enrichmentController, approvalController, trainerController, requestController;
let universalEndpointController, adminController;

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

// CSV Upload
apiRouter.post('/companies/:id/upload', (req, res, next) => {
  csvUploadController.uploadCSV(req, res, next);
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
apiRouter.post('/employees/:id/manual-data', authMiddleware, (req, res, next) => {
  try {
    checkController(manualDataController, 'ManualDataController');
    manualDataController.saveManualData(req, res, next);
  } catch (error) {
    next(error);
  }
});

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

app.use('/api/v1', apiRouter);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    requester_service: 'directory_service',
    response: {
      error: 'Endpoint not found'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    requester_service: 'directory_service',
    response: {
      error: 'Internal server error'
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

