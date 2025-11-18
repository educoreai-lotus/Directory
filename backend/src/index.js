const express = require('express');
const cors = require('cors');
const parseRequest = require('./shared/requestParser');
const formatResponse = require('./shared/responseFormatter');

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

// Health check endpoint
app.get('/health', (req, res) => {
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

// Initialize controllers
const companyRegistrationController = new CompanyRegistrationController();
const companyVerificationController = new CompanyVerificationController();
const csvUploadController = new CSVUploadController();
const companyProfileController = new CompanyProfileController();
const employeeController = new EmployeeController();
const authController = new AuthController();
const oauthController = new OAuthController();
const enrichmentController = new EnrichmentController();
const approvalController = new EmployeeProfileApprovalController();
const trainerController = new TrainerController();

// API Routes
const apiRouter = express.Router();

// Authentication
apiRouter.post('/auth/login', (req, res, next) => {
  authController.login(req, res, next);
});

apiRouter.post('/auth/logout', (req, res, next) => {
  authController.logout(req, res, next);
});

// Get current user (requires authentication)
const { authMiddleware } = require('./shared/authMiddleware');
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

// Profile Enrichment
apiRouter.post('/employees/:employeeId/enrich', authMiddleware, (req, res, next) => {
  enrichmentController.enrichProfile(req, res, next);
});

apiRouter.get('/employees/:employeeId/enrichment-status', authMiddleware, (req, res, next) => {
  enrichmentController.getEnrichmentStatus(req, res, next);
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

