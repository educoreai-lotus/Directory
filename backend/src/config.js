// Backend Configuration
// Global URLs and configuration

// Build database connection string if DATABASE_URL is not provided
const buildDatabaseUrl = () => {
  // If DATABASE_URL is explicitly set, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // If SUPABASE_DB_URL is set, use it
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }
  
  // Otherwise, build from individual components
  const host = process.env.SUPABASE_HOST || process.env.DB_HOST;
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME || process.env.SUPABASE_DB_NAME || 'postgres';
  const user = process.env.DB_USER || process.env.SUPABASE_USER || 'postgres';
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
  // Database connection string (for pg Pool)
  databaseUrl: buildDatabaseUrl(),
  databaseSsl: process.env.DB_SSL === 'true' || process.env.SUPABASE_SSL === 'true' || true, // Default to SSL for Supabase (always true)
  requesterService: 'directory_service',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET
  }
};

module.exports = config;

