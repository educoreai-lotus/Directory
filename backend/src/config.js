// Backend Configuration
// Global URLs and configuration

// Build database connection string if DATABASE_URL is not provided
const buildDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }
  
  const usePooler = process.env.DB_USE_POOLER !== 'false';
  
  if (usePooler) {
    const poolerHost = process.env.DB_POOLER_HOST || 'aws-1-ap-south-1.pooler.supabase.com';
    const projectRef = process.env.SUPABASE_PROJECT_REF || 'lkxqkytxijlxlxsuystm';
    const database = process.env.DB_NAME || process.env.SUPABASE_DB_NAME || 'postgres';
    const user = process.env.DB_USER || process.env.SUPABASE_USER || 'postgres';
    const password = process.env.DB_PASSWORD || process.env.SUPABASE_PASSWORD;
    
    if (user && password) {
      return `postgresql://${user}.${projectRef}:${encodeURIComponent(password)}@${poolerHost}:5432/${database}`;
    }
  }
  
  const host = process.env.SUPABASE_HOST || process.env.DB_HOST;
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME || process.env.SUPABASE_DB_NAME || 'postgres';
  const user = process.env.DB_USER || process.env.SUPABASE_USER;
  const password = process.env.DB_PASSWORD || process.env.SUPABASE_PASSWORD;
  
  if (host && user && password) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
  return null;
};

const config = {
  port: process.env.PORT || 3001,
  database: {
    host: process.env.SUPABASE_HOST || process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || process.env.SUPABASE_DB_NAME,
    user: process.env.DB_USER || process.env.SUPABASE_USER,
    password: process.env.DB_PASSWORD || process.env.SUPABASE_PASSWORD,
    ssl: process.env.DB_SSL === 'true' || process.env.SUPABASE_SSL === 'true'
  },
  databaseUrl: buildDatabaseUrl(),
  databaseSsl: process.env.DB_SSL === 'true' || process.env.SUPABASE_SSL === 'true' || true, // Default to SSL for Supabase (always true)
  requesterService: 'directory_service',
  
  // Authentication Configuration
  auth: {
    // Authentication mode: 'dummy' (for testing) or 'auth-service' (for production)
    // Set via environment variable: AUTH_MODE=dummy or AUTH_MODE=auth-service
    mode: process.env.AUTH_MODE || 'dummy',
    
    // Auth Service Configuration (for future use when AUTH_MODE=auth-service)
    authService: {
      baseUrl: process.env.AUTH_SERVICE_URL || 'https://auth-service-production.up.railway.app',
      loginEndpoint: '/api/auth/login',
      validateEndpoint: '/api/auth/validate',
      // JWT configuration
      jwtSecret: process.env.JWT_SECRET, // Secret for validating JWTs from Auth Service
      jwtHeaderName: process.env.JWT_HEADER_NAME || 'Authorization', // Header name for JWT (default: 'Authorization')
      jwtTokenPrefix: process.env.JWT_TOKEN_PREFIX || 'Bearer', // Token prefix (default: 'Bearer ')
    },
    
    // Dummy Auth Configuration (for testing only)
    dummy: {
      // Dummy users for testing (only used when AUTH_MODE=dummy)
      // Format: { email: { employeeId, companyId, isHR } }
      testUsers: {
        'hr@testcompany.com': {
          employeeId: 'dummy-hr-employee-id',
          companyId: 'dummy-company-id',
          isHR: true,
          fullName: 'Test HR User'
        },
        'employee@testcompany.com': {
          employeeId: 'dummy-employee-id',
          companyId: 'dummy-company-id',
          isHR: false,
          fullName: 'Test Employee'
        }
      }
    }
  },
  
  // Microservice URLs
  microservices: {
    skillsEngine: {
      baseUrl: process.env.SKILLS_ENGINE_URL || 'https://skillsengine-production.up.railway.app',
      endpoint: '/api/fill-content-metrics'
    },
    courseBuilder: {
      baseUrl: process.env.COURSE_BUILDER_URL || 'https://coursebuilderfs-production.up.railway.app',
      endpoint: '/api/fill-content-metrics'
    },
    contentStudio: {
      baseUrl: process.env.CONTENT_STUDIO_URL || 'https://content-studio-production-76b6.up.railway.app',
      endpoint: '/api/fill-content-metrics'
    },
    assessment: {
      baseUrl: process.env.ASSESSMENT_URL || 'https://assessment-tests-production.up.railway.app',
      endpoint: '/api/fill-content-metrics'
    },
    learnerAI: {
      baseUrl: process.env.LEARNER_AI_URL || 'https://learner-ai-backend-production.up.railway.app',
      endpoint: '/api/fill-learner-ai-fields' // ⚠️ Different endpoint name
    },
    managementReporting: {
      baseUrl: process.env.MANAGEMENT_REPORTING_URL || 'https://lotusproject-production.up.railway.app',
      endpoint: '/api/fill-content-metrics'
    },
    learningAnalytics: {
      baseUrl: process.env.LEARNING_ANALYTICS_URL || 'https://learning-analytics-production.up.railway.app',
      endpoint: '/api/fill-content-metrics'
    }
  },
  
  directory: {
    baseUrl: process.env.DIRECTORY_URL || 'https://directory3-production.up.railway.app',
    endpoint: '/api/fill-content-metrics'
  },
  
  // OAuth Configuration
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || `${process.env.DIRECTORY_URL || 'https://directory3-production.up.railway.app'}/api/v1/oauth/linkedin/callback`
  },
  
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_REDIRECT_URI || `${process.env.DIRECTORY_URL || 'https://directory3-production.up.railway.app'}/api/v1/oauth/github/callback`
  },
  
  // OpenAI AI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  
  // Gemini AI Configuration (deprecated - kept for backward compatibility)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  }
};

// Validate auth mode
if (config.auth.mode !== 'dummy' && config.auth.mode !== 'auth-service') {
  console.warn(`⚠️  Invalid AUTH_MODE: "${config.auth.mode}". Defaulting to "dummy". Valid values: "dummy", "auth-service"`);
  config.auth.mode = 'dummy';
}

// Log current auth mode
console.log(`🔐 Authentication Mode: ${config.auth.mode === 'dummy' ? 'DUMMY (Testing Only - Not Secure)' : 'AUTH SERVICE (Production)'}`);

module.exports = config;
