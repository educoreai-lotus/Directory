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
    // ⚠️ SECURITY: Project ref is public (visible in URLs), but we require it from env var for consistency
    // Note: Project ref alone is not sensitive, but combined with password it is
    const projectRef = process.env.SUPABASE_PROJECT_REF;
    const database = process.env.DB_NAME || process.env.SUPABASE_DB_NAME || 'postgres';
    const user = process.env.DB_USER || process.env.SUPABASE_USER || 'postgres';
    const password = process.env.DB_PASSWORD || process.env.SUPABASE_PASSWORD;
    
    // If project ref is missing, fall back to direct connection (don't use pooler)
    if (!projectRef) {
      console.warn('⚠️  SUPABASE_PROJECT_REF not set. Falling back to direct connection instead of pooler.');
      // Fall through to direct connection below
    } else if (user && password) {
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
  requesterService: 'directory-service',
  
  // Coordinator Configuration (unified proxy for microservice-to-microservice communication)
  coordinator: {
    baseUrl: process.env.COORDINATOR_URL || 'https://coordinator-production-6004.up.railway.app',
    endpoint: '/api/fill-content-metrics',
    // Service name used when Directory makes requests to Coordinator
    serviceName: process.env.SERVICE_NAME || 'directory-service'
  },
  
  // gRPC Configuration (for Coordinator gRPC communication)
  grpc: {
    coordinatorUrl: process.env.COORDINATOR_GRPC_URL || 'coordinator:50051',
    coordinatorHost: process.env.GRPC_COORDINATOR_HOST || 'coordinator',
    coordinatorPort: process.env.GRPC_COORDINATOR_PORT || '50051',
    useSsl: process.env.GRPC_USE_SSL === 'true',
    timeout: parseInt(process.env.GRPC_TIMEOUT || '30000', 10)
  },
  
  // RAG Service Configuration (for chatbot widget)
  rag: {
    serviceUrl: process.env.RAG_SERVICE_URL || 'https://rag-production-3a4c.up.railway.app'
  },
  
  // Authentication: nAuth JWT verification only (AUTH_MODE must be nauth).
  auth: {
    mode: process.env.AUTH_MODE || 'nauth',
    nauth: {
      issuer: process.env.NAUTH_JWT_ISSUER || null,
      audience: process.env.NAUTH_JWT_AUDIENCE || null,
      publicKey: process.env.NAUTH_JWT_PUBLIC_KEY || null,
      algorithms: process.env.NAUTH_JWT_ALGORITHMS || 'RS256'
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
    // Auto-detect Railway URL from environment, or use DIRECTORY_URL, or fallback to old URL
    baseUrl: process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : (process.env.DIRECTORY_URL || 'https://directory-production-addc.up.railway.app'),
    endpoint: '/api/fill-content-metrics'
  },
  
  // OAuth Configuration
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || (() => {
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : (process.env.DIRECTORY_URL || 'https://directory-production-addc.up.railway.app');
      return `${baseUrl}/api/v1/oauth/linkedin/callback`;
    })()
  },
  
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_REDIRECT_URI || (() => {
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : (process.env.DIRECTORY_URL || 'https://directory-production-addc.up.railway.app');
      return `${baseUrl}/api/v1/oauth/github/callback`;
    })()
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

if (config.auth.mode !== 'nauth') {
  console.warn(`⚠️  Invalid AUTH_MODE: "${config.auth.mode}". Directory requires nauth; coercing to nauth.`);
  config.auth.mode = 'nauth';
}

console.log('🔐 Authentication Mode: nAuth (JWT verification only)');

// TEMP DEBUG: nAuth env visibility at startup (never print key material).
if (config.auth.mode === 'nauth') {
  console.log('[TEMP][nAuth][Startup] Auth env visibility:', {
    AUTH_MODE: process.env.AUTH_MODE,
    NAUTH_JWT_PUBLIC_KEY_present: !!process.env.NAUTH_JWT_PUBLIC_KEY,
    NAUTH_JWT_ISSUER: process.env.NAUTH_JWT_ISSUER,
    NAUTH_JWT_AUDIENCE: process.env.NAUTH_JWT_AUDIENCE,
    NAUTH_JWT_ALGORITHMS: process.env.NAUTH_JWT_ALGORITHMS
  });
}

module.exports = config;
