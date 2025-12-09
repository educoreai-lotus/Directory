// Frontend Configuration
// Global URLs and configuration

const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1',
  requesterService: 'directory_service',
  ragServiceUrl: process.env.REACT_APP_RAG_SERVICE_URL || 'https://rag-production-3a4c.up.railway.app'
};

export default config;

