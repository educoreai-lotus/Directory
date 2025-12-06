module.exports = function parseRequest(req, res, next) {
  try {
    // If there is no body, or express already parsed an empty object → skip parsing
    if (
      req.body === undefined ||
      req.body === null ||
      (typeof req.body === 'object' && Object.keys(req.body).length === 0)
    ) {
      req.parsedBody = {};
      return next();
    }

    let parsedBody;
    
    // If the body is a JSON string, attempt safe parsing
    if (typeof req.body === 'string') {
      try {
        parsedBody = JSON.parse(req.body);
      } catch (err) {
        console.warn('[parseRequest] Invalid JSON body, using empty object');
        req.parsedBody = {};
        return next();
      }
    } else {
      // Express already parsed JSON correctly
      parsedBody = req.body;
    }

    // Check if this is a microservice request (has requester_service and payload)
    // Only extract payload for microservice requests
    // Frontend requests (no requester_service) should be used as-is
    if (
      parsedBody &&
      typeof parsedBody === 'object' &&
      parsedBody.requester_service !== undefined &&
      parsedBody.payload !== undefined
    ) {
      // This is a microservice request - extract payload
      req.parsedBody = parsedBody.payload;
    } else {
      // This is a frontend request - use body as-is, do NOT wrap
      req.parsedBody = parsedBody;
    }

    next();

  } catch (error) {
    console.error('[parseRequest] Critical parse error:', error);
    req.parsedBody = {};
    next();
  }
};
