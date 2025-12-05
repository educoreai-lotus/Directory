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

    // If the body is a JSON string, attempt safe parsing
    if (typeof req.body === 'string') {
      try {
        req.parsedBody = JSON.parse(req.body);
      } catch (err) {
        console.warn('[parseRequest] Invalid JSON body, using empty object');
        req.parsedBody = {};
      }
    } else {
      // Express already parsed JSON correctly
      req.parsedBody = req.body;
    }

    next();

  } catch (error) {
    console.error('[parseRequest] Critical parse error:', error);
    req.parsedBody = {};
    next();
  }
};
