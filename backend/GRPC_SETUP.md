# GRPC Setup for Directory Service

## Overview

This document describes the GRPC integration added to Directory service for RAG Service integration via Coordinator.

## Environment Variables

Add the following environment variable to your `.env` file or deployment configuration:

```bash
# GRPC Configuration
GRPC_PORT=50051

# Service Name (already configured in config.js)
SERVICE_NAME=directory-service
```

**Note:** If `GRPC_PORT` is not set, it defaults to `50051`.

## Reversibility

This GRPC implementation is **fully reversible** and **non-breaking**:

1. **HTTP server continues to work** even if GRPC fails to start
2. **GRPC server is optional** - if the module fails to load, HTTP functionality is unaffected
3. **Graceful degradation** - errors in GRPC startup are logged as warnings, not fatal errors

### To Remove GRPC Support (if needed):

1. Remove or comment out the GRPC server import in `backend/src/index.js`:
   ```javascript
   // let grpcServer = null;
   // try {
   //   const grpcServerModule = require('./grpc/server');
   //   grpcServer = grpcServerModule;
   // } catch (error) {
   //   console.warn('[Init] ⚠️ GRPC server module not available:', error.message);
   // }
   ```

2. Remove the GRPC server startup code in the HTTP server callback

3. Remove the GRPC shutdown code in the graceful shutdown handler

4. Delete the following files:
   - `backend/proto/microservice.proto`
   - `backend/src/grpc/server.js`
   - `backend/src/grpc/handlers/processHandler.js`

5. Remove GRPC dependencies from `package.json` (if not needed elsewhere):
   ```json
   "@grpc/grpc-js": "^1.14.2",
   "@grpc/proto-loader": "^0.7.15"
   ```

## Files Created

- `backend/proto/microservice.proto` - Protocol buffer definition
- `backend/src/grpc/server.js` - GRPC server implementation
- `backend/src/grpc/handlers/processHandler.js` - Request handler with Directory-specific logic
- `DATA_STRUCTURE_REPORT.json` - Data structure documentation for RAG Service

## Files Modified

- `backend/src/index.js` - Added GRPC server startup (non-breaking, optional)

## Testing

1. **Start the service** - Both HTTP and GRPC servers should start
2. **Check logs** - Look for:
   - `[GRPC Server] ✅ GRPC server started successfully`
   - `[Server] ✅ Directory service fully operational (HTTP + GRPC)`
3. **Verify HTTP still works** - All existing HTTP endpoints should function normally

## Response Format

The GRPC handler returns data in the following formats:

### Batch Sync Response
```json
{
  "data": {
    "items": [...],
    "page": 1,
    "limit": 1000,
    "total": 5000
  }
}
```

### Real-time Query Response
```json
{
  "data": [...]
}
```

**Important:** The `data` field is never wrapped in extra fields like `entries`, `records`, or `results`. It's either a direct array or an object with `items`.

