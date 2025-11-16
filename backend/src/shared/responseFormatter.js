// Response Formatter Middleware
// Formats responses as stringified JSON according to API format

const formatResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    const formattedResponse = {
      requester_service: req.requester_service || 'directory_service',
      response: data
    };
    return originalJson.call(this, JSON.stringify(formattedResponse));
  };
  
  next();
};

module.exports = formatResponse;

