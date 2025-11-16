// Request Parser Middleware
// Parses stringified JSON request bodies according to API format

const parseRequest = (req, res, next) => {
  if (req.body && typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      // Extract payload from standardized format
      if (parsed.requester_service && parsed.payload) {
        req.body = parsed.payload;
        req.requester_service = parsed.requester_service;
      } else {
        req.body = parsed;
      }
    } catch (e) {
      return res.status(400).json(JSON.stringify({
        requester_service: 'directory_service',
        response: {
          error: 'Invalid JSON format in request body'
        }
      }));
    }
  }
  next();
};

module.exports = parseRequest;

