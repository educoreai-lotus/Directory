// Backend Configuration
// Global URLs and configuration

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

