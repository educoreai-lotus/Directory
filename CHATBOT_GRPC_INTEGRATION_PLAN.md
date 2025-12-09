# Chatbot + gRPC Integration Plan for Directory Microservice

**Branch:** `chatbot-grpc-integration`  
**Date:** 2025-01-27  
**Status:** PLANNING PHASE - AWAITING APPROVAL

---

## 📋 Executive Summary

This plan integrates the RAG chatbot widget and gRPC client communication layer into the Directory microservice, following the architecture documents:

1. **CHATBOT_SCRIPT_INTEGRATION_GUIDE.md** - Chatbot UI embedding
2. **GRPC_COMMUNICATION_ARCHITECTURE.md** - gRPC communication patterns
3. **MICROSERVICE_IMPLEMENTATION_GUIDE.md** - gRPC client implementation

**Key Principles:**
- ✅ Directory communicates ONLY with Coordinator (never directly with other microservices)
- ✅ Chatbot widget appears after user login
- ✅ gRPC client (NOT server) for Coordinator communication
- ✅ Universal envelope format for all requests
- ✅ Digital signatures (ECDSA P-256) for authentication
- ✅ 100% reversible changes
- ✅ Zero breaking changes to existing flows

---

## ⚡ Quick Reference - Confirmed Values

| Configuration | Value | Source |
|--------------|-------|--------|
| **RAG Service URL** | `https://rag-production-3a4c.up.railway.app/` | User confirmed |
| **Microservice ID** | `"DIRECTORY"` | Architecture docs |
| **Coordinator gRPC** | `coordinator:50051` | Architecture docs |
| **Proto Package** | `rag.v1` | GRPC_COMMUNICATION_ARCHITECTURE.md |
| **Proto Service** | `CoordinatorService` | GRPC_COMMUNICATION_ARCHITECTURE.md |
| **Proto Method** | `Route(RouteRequest) returns (RouteResponse)` | GRPC_COMMUNICATION_ARCHITECTURE.md |
| **SSL (Dev)** | `GRPC_USE_SSL=false` | Architecture docs |
| **SSL (Prod)** | `GRPC_USE_SSL=true` | Architecture docs |

---

## 🎯 Integration Objectives

### A. Chatbot UI Integration
- Embed chatbot widget in Directory frontend
- Initialize only after user authentication
- Use Directory user context (id, token, companyId as tenantId)
- Microservice identifier: `"DIRECTORY"` (confirmed)

### B. gRPC Client Implementation
- Create gRPC client for Coordinator communication
- Follow Protocol Buffer definitions from architecture docs
- Implement signature generation and metadata injection
- Support Universal Envelope format
- Handle errors gracefully with fallback

### C. Coordinator Routing
- Directory sends queries → Coordinator via gRPC
- Coordinator routes to appropriate microservices
- Directory never knows about Course Builder, Assessment, DevLab, etc.

---

## 📁 Files to Create

### Frontend Files

#### 1. `frontend/src/hooks/useChatbot.js`
**Purpose:** React hook for chatbot initialization  
**Based on:** CHATBOT_SCRIPT_INTEGRATION_GUIDE.md (React example)  
**Functionality:**
- Loads chatbot script dynamically
- Initializes chatbot after user login
- Handles cleanup on unmount
- Uses Directory user context (id, token, companyId)

**Key Code Structure:**
```javascript
export function useChatbot() {
  const { user, token, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated || !user || !token) return;
    
    // Load script if not loaded
    // Initialize with: microservice: "DIRECTORY", userId, token, tenantId: companyId
  }, [user, token, isAuthenticated]);
}
```

#### 2. `frontend/src/components/ChatbotContainer.js`
**Purpose:** Container component for chatbot widget  
**Based on:** CHATBOT_SCRIPT_INTEGRATION_GUIDE.md  
**Functionality:**
- Renders `<div id="edu-bot-container"></div>`
- Conditionally renders only when user is authenticated
- Minimal styling (uses existing design system)

**Key Code Structure:**
```javascript
function ChatbotContainer() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return null;
  
  return <div id="edu-bot-container" />;
}
```

#### 3. `frontend/src/config.js` (MODIFY)
**Purpose:** Add RAG service URL configuration  
**Change:**
- Add `ragServiceUrl` to config object
- Read from `REACT_APP_RAG_SERVICE_URL` environment variable
- Default: empty (will be set via env var)

**Modification:**
```javascript
const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1',
  requesterService: 'directory_service',
  ragServiceUrl: process.env.REACT_APP_RAG_SERVICE_URL || 'https://rag-production-3a4c.up.railway.app/' // NEW
};
```

### Backend Files

#### 4. `backend/src/infrastructure/grpc/CoordinatorGrpcClient.js`
**Purpose:** gRPC client for Coordinator communication  
**Based on:** GRPC_COMMUNICATION_ARCHITECTURE.md + MICROSERVICE_IMPLEMENTATION_GUIDE.md  
**Functionality:**
- Creates gRPC client connection to Coordinator
- Implements `Route()` RPC call
- Generates digital signatures (ECDSA P-256)
- Creates Universal Envelope format
- Handles metadata (x-signature, x-timestamp, x-requester-service)
- Error handling with graceful degradation

**Key Code Structure:**
```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { generateSignature } = require('../../utils/signature');

class CoordinatorGrpcClient {
  constructor() {
    // Load proto file
    // Create gRPC client
    // Configure credentials (insecure for dev, SSL for prod)
  }
  
  async routeRequest({ tenantId, userId, queryText, context, envelope }) {
    // Generate signature
    // Create metadata
    // Make gRPC call
    // Return response
  }
}
```

#### 5. `backend/proto/rag/v1/coordinator.proto`
**Purpose:** Protocol Buffer definition for Coordinator service  
**Based on:** GRPC_COMMUNICATION_ARCHITECTURE.md (lines 234-256)  
**Exact Content (from architecture document - MUST match Coordinator exactly):**
```protobuf
syntax = "proto3";
package rag.v1;

service CoordinatorService {
  rpc Route(RouteRequest) returns (RouteResponse);
}

message RouteRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  string requester_service = 4;
  map<string, string> context = 5;
  string envelope_json = 6;  // Universal Envelope JSON
}

message RouteResponse {
  repeated string target_services = 1;
  map<string, string> normalized_fields = 2;
  string envelope_json = 3;
  string routing_metadata = 4;
}
```

**File Structure:**
- Create directory: `backend/proto/rag/v1/`
- Create file: `coordinator.proto` with exact content above

**Note:** This file must match exactly the proto definition used by Coordinator. Content is extracted directly from GRPC_COMMUNICATION_ARCHITECTURE.md section "Protocol Buffers (.proto) Contracts".

#### 6. `backend/src/services/ChatbotQueryService.js`
**Purpose:** Service layer for chatbot queries  
**Functionality:**
- Receives chatbot queries from frontend
- Creates Universal Envelope
- Calls CoordinatorGrpcClient
- Returns formatted response
- Handles errors gracefully

**Key Code Structure:**
```javascript
class ChatbotQueryService {
  constructor() {
    this.grpcClient = new CoordinatorGrpcClient();
  }
  
  async processQuery({ userId, companyId, queryText, context }) {
    // Create Universal Envelope
    // Call Coordinator via gRPC
    // Format response
    // Return to frontend
  }
}
```

#### 7. `backend/src/presentation/ChatbotController.js`
**Purpose:** Express controller for chatbot endpoints  
**Functionality:**
- `POST /api/v1/chatbot/query` - Process chatbot query
- Validates authentication (uses existing authMiddleware)
- Extracts user context (userId, companyId)
- Calls ChatbotQueryService
- Returns response in Directory envelope format

**Key Code Structure:**
```javascript
class ChatbotController {
  async processQuery(req, res, next) {
    // Extract user from req.user (from authMiddleware)
    // Extract query from req.body
    // Call ChatbotQueryService
    // Return response
  }
}
```

---

## 📝 Files to Modify

### Frontend Modifications

#### 1. `frontend/src/App.js` (MODIFY)
**Change:** Add ChatbotContainer component  
**Location:** Inside `<main>` or at root level (after routes)  
**Reason:** Chatbot should be available on all authenticated pages  
**Modification:**
```javascript
import ChatbotContainer from './components/ChatbotContainer';

function App() {
  return (
    <Router>
      <DesignSystemProvider>
        <AuthProvider>
          <div className="App">
            {/* ... existing code ... */}
            <main className="app-content">
              <Routes>
                {/* ... existing routes ... */}
              </Routes>
            </main>
            <ChatbotContainer /> {/* NEW */}
          </div>
        </AuthProvider>
      </DesignSystemProvider>
    </Router>
  );
}
```

#### 2. `frontend/src/components/ChatbotContainer.js` (uses useChatbot hook)
**Integration:** ChatbotContainer will use `useChatbot()` hook internally  
**Flow:**
- Component mounts → checks authentication
- If authenticated → calls `useChatbot()` hook
- Hook loads script and initializes chatbot

### Backend Modifications

#### 3. `backend/src/index.js` (MODIFY)
**Change:** Add chatbot route  
**Location:** After existing routes, before error handlers  
**Modification:**
```javascript
const ChatbotController = require('./presentation/ChatbotController');
const chatbotController = new ChatbotController();

// Add route
apiRouter.post(
  '/chatbot/query',
  authMiddleware,
  (req, res, next) => chatbotController.processQuery(req, res, next)
);
```

#### 4. `backend/package.json` (MODIFY)
**Change:** Add gRPC dependencies  
**New Dependencies:**
```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.10.0",
    "@grpc/proto-loader": "^0.7.11"
  }
}
```

#### 5. `backend/src/config.js` (MODIFY - if exists)
**Change:** Add gRPC and RAG configuration  
**New Config:**
```javascript
module.exports = {
  // ... existing config ...
  grpc: {
    coordinatorUrl: process.env.COORDINATOR_GRPC_URL || 'coordinator:50051',
    coordinatorHost: process.env.GRPC_COORDINATOR_HOST || 'coordinator',
    coordinatorPort: process.env.GRPC_COORDINATOR_PORT || '50051',
    useSsl: process.env.GRPC_USE_SSL === 'true',
    timeout: parseInt(process.env.GRPC_TIMEOUT || '30000', 10)
  },
  rag: {
    serviceUrl: process.env.RAG_SERVICE_URL || 'https://rag-production-3a4c.up.railway.app/'
  }
};
```

---

## 🔧 Implementation Details

### A. Chatbot UI Integration Flow

```
1. User logs in → AuthContext sets user state
2. App.js renders ChatbotContainer
3. ChatbotContainer checks isAuthenticated
4. If authenticated → useChatbot() hook runs
5. Hook loads script from RAG service
6. Script loads → window.initializeEducoreBot() available
7. Hook calls initializeEducoreBot({
     microservice: "DIRECTORY",  // Confirmed exact string
     userId: user.id,
     token: token,
     tenantId: user.companyId
   })
8. Widget appears in #edu-bot-container
```

**Key Requirements:**
- Script URL: `${config.ragServiceUrl}/embed/bot.js` (RAG URL: `https://rag-production-3a4c.up.railway.app/`)
- Container ID: `edu-bot-container` (exact match)
- Microservice: `"DIRECTORY"` (exact string)
- Initialization only after login
- Cleanup on logout/unmount

### B. gRPC Client Implementation Flow

```
1. Frontend sends query → POST /api/v1/chatbot/query
2. ChatbotController receives request
3. Extracts user context (userId, companyId from req.user)
4. ChatbotQueryService.processQuery() called
5. Service creates Universal Envelope:
   {
     version: "1.0",
     timestamp: ISO string,
     request_id: UUID,
     tenant_id: companyId,
     user_id: userId,
     source: "directory-service",
     payload: { query_text, context }
   }
6. CoordinatorGrpcClient.routeRequest() called
7. Client generates signature (ECDSA P-256)
8. Creates gRPC metadata:
   - x-signature: base64 signature
   - x-timestamp: unix timestamp (ms)
   - x-requester-service: "directory-service"
9. Makes gRPC Route() call to Coordinator
10. Coordinator routes to target microservices
11. Response returns → formatted → sent to frontend
```

**Key Requirements:**
- Proto file: `backend/proto/rag/v1/coordinator.proto` (exact structure from GRPC_COMMUNICATION_ARCHITECTURE.md)
- Service: `rag.v1.CoordinatorService`
- Method: `Route(RouteRequest) returns (RouteResponse)`
- Coordinator URL: `coordinator:50051` (with env var overrides: `GRPC_COORDINATOR_HOST`, `GRPC_COORDINATOR_PORT`)
- Signature: ECDSA P-256 with SHA-256
- Message format: `educoreai-directory-service-{payload_hash}`
- Credentials: Insecure for dev (`GRPC_USE_SSL=false`), SSL for prod (`GRPC_USE_SSL=true`)

### C. Universal Envelope Format

**Request Envelope:**
```json
{
  "version": "1.0",
  "timestamp": "2025-01-27T10:00:00Z",
  "request_id": "dir-1234567890-abc123",
  "tenant_id": "company-uuid",
  "user_id": "employee-uuid",
  "source": "directory-service",
  "payload": {
    "query_text": "Show me my learning progress",
    "metadata": {
      "category": "learning",
      "context": {}
    }
  }
}
```

**Response Envelope (from Coordinator):**
```json
{
  "target_services": ["course-builder-service"],
  "normalized_fields": {
    "learning_progress": "85%",
    "courses_completed": "5"
  },
  "envelope_json": "{...}",
  "routing_metadata": "{...}"
}
```

### D. Error Handling Strategy

**gRPC Errors:**
- `DEADLINE_EXCEEDED` → Retryable, log warning, return empty response
- `UNAVAILABLE` → Retryable, log warning, return empty response
- `UNAUTHENTICATED` → Non-retryable, log error, return 401
- `INVALID_ARGUMENT` → Non-retryable, log error, return 400
- `INTERNAL` → Retryable, log error, return 500

**Fallback Behavior:**
- If Coordinator unavailable → Return empty response
- Frontend shows: "Chatbot temporarily unavailable"
- No service interruption

---

## 🔐 Security & Authentication

### Digital Signatures
- **Algorithm:** ECDSA P-256 with SHA-256
- **Key Source:** `PRIVATE_KEY` environment variable
- **Message Format:** `educoreai-{serviceName}-{payload_hash}`
- **Encoding:** Base64
- **Validation:** Coordinator validates using Directory's public key

### User Context
- **Extraction:** From `req.user` (set by authMiddleware)
- **Required Fields:**
  - `userId`: `req.user.id` or `req.user.employeeId`
  - `tenantId`: `req.user.companyId`
  - `token`: From Authorization header (for frontend)

### Metadata Headers
- `x-signature`: Base64-encoded signature
- `x-timestamp`: Unix timestamp (milliseconds)
- `x-requester-service`: `"directory-service"`

---

## 🌐 Environment Variables

### Frontend (.env or Vercel)
```bash
REACT_APP_RAG_SERVICE_URL=https://rag-production-3a4c.up.railway.app/
```

### Backend (.env or Railway)
```bash
# gRPC Configuration
COORDINATOR_GRPC_URL=coordinator:50051  # Default, can be overridden
GRPC_COORDINATOR_HOST=coordinator       # Optional override (default: coordinator)
GRPC_COORDINATOR_PORT=50051             # Optional override (default: 50051)
GRPC_USE_SSL=false                      # false for dev, true for production
GRPC_TIMEOUT=30000                      # milliseconds

# RAG Service (for reference)
RAG_SERVICE_URL=https://rag-production-3a4c.up.railway.app/

# Existing (already configured)
COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app
PRIVATE_KEY=<existing-private-key>
SERVICE_NAME=directory-service
```

---

## 📦 Dependencies to Add

### Backend (`backend/package.json`)
```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.10.0",
    "@grpc/proto-loader": "^0.7.11"
  }
}
```

**Installation:**
```bash
cd backend
npm install @grpc/grpc-js @grpc/proto-loader
```

### Frontend
**No new dependencies** - uses existing React, axios, and dynamic script loading.

---

## ✅ Testing Plan

### Frontend Testing
1. **Chatbot Widget Appearance:**
   - Login → Widget appears
   - Logout → Widget disappears
   - Script loads correctly
   - Initialization succeeds

2. **User Context:**
   - Correct userId passed
   - Correct tenantId (companyId) passed
   - Token passed correctly

3. **Error Handling:**
   - Script load failure → Graceful error
   - Initialization failure → No crash

### Backend Testing
1. **gRPC Client:**
   - Connection to Coordinator succeeds
   - Signature generation works
   - Metadata injection correct
   - Route() call succeeds

2. **Error Handling:**
   - Coordinator unavailable → Graceful fallback
   - Invalid signature → Error response
   - Timeout → Error response

3. **Integration:**
   - Frontend → Backend → Coordinator flow works
   - Response formatting correct
   - Envelope structure valid

---

## 🚫 What We Will NOT Change

### Protected Areas (DO NOT MODIFY)
- ❌ Authentication flow (`authMiddleware.js`, `AuthContext.js`)
- ❌ Employee management endpoints
- ❌ Enrollment flow (`EnrollmentController.js`, `EnrollEmployeesCareerPathUseCase.js`)
- ❌ Coordinator HTTP client (`CoordinatorClient.js` - existing REST client)
- ❌ Database schemas
- ❌ Docker/deployment configs (unless explicitly approved)
- ❌ Environment variable names (except adding new ones)

### Existing Coordinator Communication
- ✅ Keep existing `CoordinatorClient.js` (HTTP/REST)
- ✅ New gRPC client is **additional**, not replacement
- ✅ Both can coexist (HTTP for enrollment, gRPC for chatbot queries)

---

## 📊 File Summary

### Files to Create: 7
1. `frontend/src/hooks/useChatbot.js`
2. `frontend/src/components/ChatbotContainer.js`
3. `backend/src/infrastructure/grpc/CoordinatorGrpcClient.js`
4. `backend/proto/rag/v1/coordinator.proto`
5. `backend/src/services/ChatbotQueryService.js`
6. `backend/src/presentation/ChatbotController.js`
7. `CHATBOT_GRPC_INTEGRATION_PLAN.md` (this file)

### Files to Modify: 5
1. `frontend/src/App.js` - Add ChatbotContainer
2. `frontend/src/config.js` - Add RAG service URL
3. `backend/src/index.js` - Add chatbot route
4. `backend/package.json` - Add gRPC dependencies
5. `backend/src/config.js` - Add gRPC config (if exists, or create)

### Total Changes: 12 files

---

## 🔄 Reversibility Plan

### Rollback Strategy
1. **Remove chatbot route** from `backend/src/index.js`
2. **Remove ChatbotContainer** from `frontend/src/App.js`
3. **Delete created files:**
   - All files in `backend/src/infrastructure/grpc/`
   - All files in `backend/src/services/` related to chatbot
   - All files in `backend/src/presentation/` related to chatbot
   - `frontend/src/hooks/useChatbot.js`
   - `frontend/src/components/ChatbotContainer.js`
   - `backend/proto/` directory (if only contains coordinator.proto)
4. **Revert config changes:**
   - Remove RAG URL from `frontend/src/config.js`
   - Remove gRPC config from `backend/src/config.js`
5. **Remove dependencies:**
   - Remove `@grpc/grpc-js` and `@grpc/proto-loader` from `backend/package.json`

**Result:** Complete rollback with zero impact on existing functionality.

---

## ✅ Pre-Implementation Checklist

Before proceeding with implementation:

- [x] Review this plan with team
- [x] Confirm RAG service URL: `https://rag-production-3a4c.up.railway.app/`
- [x] Confirm microservice identifier: `"DIRECTORY"`
- [x] Obtain coordinator.proto file structure (from GRPC_COMMUNICATION_ARCHITECTURE.md)
- [x] Confirm Coordinator gRPC endpoint: `coordinator:50051` (with env var overrides)
- [x] Confirm SSL configuration: `GRPC_USE_SSL=false` (dev), `true` (prod)
- [ ] Verify PRIVATE_KEY is configured (existing)
- [ ] Create branch: `chatbot-grpc-integration`
- [ ] Get approval: "YES, proceed"

---

## 📝 Next Steps After Approval

1. **Create branch:**
   ```bash
   git checkout -b chatbot-grpc-integration
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   npm install @grpc/grpc-js @grpc/proto-loader
   ```

3. **Implement in order:**
   - Backend: Proto file → gRPC client → Service → Controller → Route
   - Frontend: Hook → Container → App integration
   - Configuration: Env vars → Config files

4. **Test end-to-end:**
   - Login → Chatbot appears → Send query → Verify Coordinator call → Verify response

5. **Commit with clear messages:**
   - Each logical unit in separate commit
   - Clear commit messages describing changes

---

## 🎯 Success Criteria

Integration is successful when:

- ✅ Chatbot widget appears after user login
- ✅ Widget initializes with correct user context
- ✅ Queries sent from widget reach Coordinator via gRPC
- ✅ Coordinator routes queries correctly
- ✅ Responses return to widget
- ✅ No breaking changes to existing flows
- ✅ All tests pass
- ✅ No console errors
- ✅ Graceful error handling works

---

## ✅ Configuration Values (Confirmed)

### 1. RAG Service URL
**Production:** `https://rag-production-3a4c.up.railway.app/`  
**Environment Variable:** `REACT_APP_RAG_SERVICE_URL`

### 2. Microservice Identifier
**Value:** `"DIRECTORY"` (exact string, case-sensitive as specified)

### 3. Proto File Structure
**Location:** `backend/proto/rag/v1/coordinator.proto`  
**Exact Content (from GRPC_COMMUNICATION_ARCHITECTURE.md):**
```protobuf
syntax = "proto3";
package rag.v1;

service CoordinatorService {
  rpc Route(RouteRequest) returns (RouteResponse);
}

message RouteRequest {
  string tenant_id = 1;
  string user_id = 2;
  string query_text = 3;
  string requester_service = 4;
  map<string, string> context = 5;
  string envelope_json = 6;  // Universal Envelope JSON
}

message RouteResponse {
  repeated string target_services = 1;
  map<string, string> normalized_fields = 2;
  string envelope_json = 3;
  string routing_metadata = 4;
}
```

### 4. Coordinator gRPC Endpoint
**Default:** `coordinator:50051`  
**Environment Variables (with overrides):**
- `COORDINATOR_GRPC_URL` (full URL, e.g., `coordinator:50051`)
- `GRPC_COORDINATOR_HOST` (host only, defaults to `coordinator`)
- `GRPC_COORDINATOR_PORT` (port only, defaults to `50051`)

**Note:** In Railway production, `coordinator` resolves via internal networking.

### 5. SSL/TLS Configuration
**Development:** `GRPC_USE_SSL=false` (insecure credentials)  
**Production:** `GRPC_USE_SSL=true` (SSL/TLS credentials)

---

**END OF INTEGRATION PLAN**

**Status:** ✅ UPDATED WITH CONFIRMED VALUES - READY FOR APPROVAL  
**Next Action:** Wait for "YES, proceed" approval before implementation

