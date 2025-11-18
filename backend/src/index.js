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

// Initialize controllers
const companyRegistrationController = new CompanyRegistrationController();
const companyVerificationController = new CompanyVerificationController();
const csvUploadController = new CSVUploadController();
const companyProfileController = new CompanyProfileController();
const employeeController = new EmployeeController();
const authController = new AuthController();
const oauthController = new OAuthController();

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

