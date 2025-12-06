// Response Formatter Middleware
// Formats responses as stringified JSON according to API format

const formatResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Check if response is already wrapped in microservice envelope format
    // If it has both requester_service and response keys, it's already wrapped
    // Must check for both keys explicitly to avoid false positives
    const isAlreadyWrapped = 
      data !== null &&
      data !== undefined &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      'requester_service' in data &&
      'response' in data &&
      Object.keys(data).length >= 2; // Ensure it's actually the envelope structure
    
    if (isAlreadyWrapped) {
      // Response is already wrapped, return as-is (no double-wrapping)
      return originalJson.call(this, JSON.stringify(data));
    }
    
    // Response is not wrapped, wrap it
    const formattedResponse = {
      requester_service: req.requester_service || 'directory_service',
      response: data
    };
    return originalJson.call(this, JSON.stringify(formattedResponse));
  };
  
  next();
};

module.exports = formatResponse;

