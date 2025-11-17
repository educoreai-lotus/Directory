// Request Parser Middleware
// Parses stringified JSON request bodies according to API format
// Handles both string (before express.json) and object (after express.json) formats

const parseRequest = (req, res, next) => {
  // Skip parsing for multipart/form-data (file uploads handled by multer)
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }

  // If body is a string, parse it first
  if (req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json(JSON.stringify({
        requester_service: 'directory_service',
        response: {
          error: 'Invalid JSON format in request body'
        }
      }));
    }
  }

  // Extract payload from standardized format (works for both string and object)
  if (req.body && typeof req.body === 'object') {
    // Check if it follows the standardized format
    if (req.body.requester_service && req.body.payload) {
      req.requester_service = req.body.requester_service;
      req.body = req.body.payload;
    } else if (req.body.requester_service && !req.body.payload) {
      // If requester_service exists but no payload, body might be the payload itself
      // This handles cases where the format is slightly different
      req.requester_service = req.body.requester_service;
      // Remove requester_service from body if it exists
      const { requester_service, ...payload } = req.body;
      req.body = payload;
    }
  }

  next();
};

module.exports = parseRequest;

