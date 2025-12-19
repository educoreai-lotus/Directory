# CURSOR PROMPT - Add GRPC Support to Microservice

## 🎯 OBJECTIVE

Enable this microservice to receive GRPC requests from Coordinator for:
1. **Real-time Queries** - Specific user questions
2. **Batch Sync** - Large data synchronization for RAG

**Key Requirement:** The same GRPC Process RPC handles both modes, automatically detecting which type based on envelope payload.

---

## ⚠️ CRITICAL REQUIREMENTS

### 1. RESPONSE FORMAT - NO WRAPPERS! ⚠️

**CRITICAL:** The `data` field in your response must be:
- ✅ **Direct array** of items: `data: [item1, item2, ...]`
- ✅ **Object with `items`**: `data: { items: [...], page: 1, ... }`

**❌ NEVER wrap in extra fields like:**
```javascript
// ❌ WRONG - Don't do this!
data: {
  entries: [...]     // NO!
  records: [...]     // NO!
  results: [...]     // NO!
  reports: [...]     // NO!
}
```

**✅ CORRECT formats:**
```javascript
// ✅ Format 1: Direct array (Real-time)
data: [
  { report_id: "r1", report_name: "Report 1", ... },
  { report_id: "r2", report_name: "Report 2", ... }
]

// ✅ Format 2: Object with items (Batch)
data: {
  items: [
    { report_id: "r1", ... },
    { report_id: "r2", ... }
  ],
  page: 1,
  limit: 1000,
  total: 5000
}
```

**Why this matters:**
- Coordinator scans `data` to check response quality
- Extra wrapper fields confuse the quality check
- Your response will be rejected if wrapped incorrectly

---

### 2. DATA_STRUCTURE_REPORT.json - MANDATORY! ⚠️

**YOU MUST CREATE THIS FILE at the end of implementation!**

**Location:** `[your-service-root]/DATA_STRUCTURE_REPORT.json`

**This is NOT optional!** RAG Service needs this to process your data.

See the complete section at the end of this PROMPT for details.

---

## 📋 PREREQUISITES

### Required Dependencies

**Add to `package.json`:**
```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.9.0",
    "@grpc/proto-loader": "^0.7.10"
  }
}
```

Run: `npm install`

---

## 📁 FILE STRUCTURE TO CREATE

```
[your-microservice]/
├── proto/
│   └── microservice.proto           ← NEW: Proto definition
├── src/
│   ├── grpc/
│   │   ├── server.js                ← NEW: GRPC server
│   │   └── handlers/
│   │       └── processHandler.js    ← NEW: Process RPC handler
│   ├── services/
│   │   └── [existing services]      ← KEEP: Your business logic
│   └── index.js                     ← MODIFY: Start GRPC server
├── .env                             ← MODIFY: Add GRPC_PORT
└── DATA_STRUCTURE_REPORT.json       ← CREATE: After implementation ⭐
```

---

## 🔧 IMPLEMENTATION

### Step 1: Create Proto File

**File:** `proto/microservice.proto`

```protobuf
syntax = "proto3";
package microservice.v1;

service MicroserviceAPI {
  rpc Process (ProcessRequest) returns (ProcessResponse);
}

message ProcessRequest {
  string envelope_json = 1;
  map<string, string> metadata = 2;
}

message ProcessResponse {
  bool success = 1;
  string envelope_json = 2;
  string error = 3;
}
```

**Why:** This is the standard proto for all microservices - same for everyone.

---

### Step 2: Create GRPC Server

**File:** `src/grpc/server.js`

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const processHandler = require('./handlers/processHandler');
const logger = require('../utils/logger');

/**
 * GRPC Server for Microservice
 */
class GrpcServer {
  constructor() {
    this.server = null;
    this.port = process.env.GRPC_PORT || 50051;
  }

  /**
   * Start GRPC server
   */
  async start() {
    try {
      logger.info('Starting GRPC server', {
        service: process.env.SERVICE_NAME || 'microservice',
        port: this.port
      });

      // Load proto file
      const PROTO_PATH = path.join(__dirname, '../../proto/microservice.proto');
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      });

      // Load package
      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
      const microservice = protoDescriptor.microservice.v1;

      // Create server
      this.server = new grpc.Server();

      // Register Process handler
      this.server.addService(microservice.MicroserviceAPI.service, {
        Process: processHandler.handle.bind(processHandler)
      });

      // Bind and start
      this.server.bindAsync(
        `0.0.0.0:${this.port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
          if (error) {
            logger.error('Failed to start GRPC server', {
              service: process.env.SERVICE_NAME,
              error: error.message
            });
            throw error;
          }

          logger.info('GRPC server started', {
            service: process.env.SERVICE_NAME,
            port: port
          });
        }
      );

    } catch (error) {
      logger.error('GRPC server startup failed', {
        service: process.env.SERVICE_NAME,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Shutdown GRPC server
   */
  async shutdown() {
    if (this.server) {
      logger.info('Shutting down GRPC server', {
        service: process.env.SERVICE_NAME
      });

      return new Promise((resolve) => {
        this.server.tryShutdown(() => {
          logger.info('GRPC server shut down', {
            service: process.env.SERVICE_NAME
          });
          resolve();
        });
      });
    }
  }
}

module.exports = new GrpcServer();
```

---

### Step 3: Create Process Handler

**File:** `src/grpc/handlers/processHandler.js`

```javascript
const logger = require('../../utils/logger');

/**
 * Process RPC Handler
 * Handles both Real-time queries and Batch sync requests
 */
class ProcessHandler {
  /**
   * Handle Process RPC call
   * @param {Object} call - GRPC call object
   * @param {Function} callback - Response callback
   */
  async handle(call, callback) {
    const startTime = Date.now();
    let envelope;

    try {
      // 1. Parse envelope from request
      const envelopeJson = call.request.envelope_json;
      envelope = JSON.parse(envelopeJson);

      const {
        request_id,
        tenant_id,
        user_id,
        target_service,
        payload,
        metadata
      } = envelope;

      logger.info('[GRPC Process] Request received', {
        service: process.env.SERVICE_NAME,
        request_id,
        tenant_id,
        user_id,
        target_service,
        has_payload: !!payload,
        sync_type: payload?.sync_type
      });

      // 2. Detect mode: Real-time or Batch Sync
      const isBatchSync = payload?.sync_type === 'batch';

      let result;

      if (isBatchSync) {
        // ═══════════════════════════════════════
        // MODE 1: BATCH SYNC
        // ═══════════════════════════════════════
        logger.info('[GRPC Process - BATCH SYNC] Processing batch request', {
          service: process.env.SERVICE_NAME,
          request_id,
          page: payload.page,
          limit: payload.limit,
          since: payload.since
        });

        result = await this.handleBatchSync(envelope);

      } else {
        // ═══════════════════════════════════════
        // MODE 2: REAL-TIME QUERY
        // ═══════════════════════════════════════
        logger.info('[GRPC Process - REAL-TIME] Processing query', {
          service: process.env.SERVICE_NAME,
          request_id,
          query: payload?.query,
          context: payload?.context
        });

        result = await this.handleRealtimeQuery(envelope);
      }

      // 3. Build response envelope
      const responseEnvelope = {
        request_id,
        success: true,
        data: result.data,  // ⚠️ CRITICAL: Must be array or {items: []}
        metadata: {
          ...(result.metadata || {}),
          processed_at: new Date().toISOString(),
          service: process.env.SERVICE_NAME,
          duration_ms: Date.now() - startTime,
          mode: isBatchSync ? 'batch' : 'realtime'
        }
      };

      logger.info('[GRPC Process] Request completed', {
        service: process.env.SERVICE_NAME,
        request_id,
        duration_ms: Date.now() - startTime,
        mode: isBatchSync ? 'batch' : 'realtime',
        success: true
      });

      // 4. Return ProcessResponse
      callback(null, {
        success: true,
        envelope_json: JSON.stringify(responseEnvelope),
        error: ''
      });

    } catch (error) {
      logger.error('[GRPC Process] Request failed', {
        service: process.env.SERVICE_NAME,
        request_id: envelope?.request_id,
        error: error.message,
        stack: error.stack,
        duration_ms: Date.now() - startTime
      });

      // Return error response
      callback(null, {
        success: false,
        envelope_json: JSON.stringify({
          request_id: envelope?.request_id,
          success: false,
          error: error.message,
          metadata: {
            processed_at: new Date().toISOString(),
            service: process.env.SERVICE_NAME
          }
        }),
        error: error.message
      });
    }
  }

  /**
   * Handle Batch Sync request
   * @param {Object} envelope - Request envelope
   * @returns {Promise<Object>} Result with data
   */
  async handleBatchSync(envelope) {
    const {
      tenant_id,
      payload
    } = envelope;

    const {
      page = 1,
      limit = 1000,
      since
    } = payload;

    logger.info('[Batch Sync] Fetching data', {
      service: process.env.SERVICE_NAME,
      tenant_id,
      page,
      limit,
      since
    });

    // ⚡ TODO: YOUR BUSINESS LOGIC HERE
    // Query your database with pagination
    
    const offset = (page - 1) * limit;
    const data = await this.queryDatabase({
      tenant_id,
      limit,
      offset,
      since
    });

    // Check if there are more records
    const totalCount = await this.getTotalCount({
      tenant_id,
      since
    });
    const hasMore = (page * limit) < totalCount;

    logger.info('[Batch Sync] Data fetched', {
      service: process.env.SERVICE_NAME,
      tenant_id,
      page,
      records: data.length,
      total: totalCount,
      has_more: hasMore
    });

    // ⚠️ CRITICAL: Return format MUST be { items: [...] }
    return {
      data: {
        items: data,        // ⭐ Your actual data array
        page,
        limit,
        total: totalCount
      },
      metadata: {
        has_more: hasMore,
        page,
        total_pages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Handle Real-time Query
   * @param {Object} envelope - Request envelope
   * @returns {Promise<Object>} Result with data
   */
  async handleRealtimeQuery(envelope) {
    const {
      tenant_id,
      user_id,
      payload
    } = envelope;

    const query = payload?.query || '';

    logger.info('[Real-time Query] Processing', {
      service: process.env.SERVICE_NAME,
      tenant_id,
      user_id,
      query
    });

    // ⚡ TODO: YOUR BUSINESS LOGIC HERE
    // Parse query and execute appropriate action
    
    let data;
    
    if (query.includes('recent')) {
      data = await this.getRecentItems(tenant_id, user_id);
      
    } else if (query.includes('id') || query.includes('show')) {
      const id = this.extractId(query);
      data = await this.getItemById(tenant_id, id);
      
    } else {
      // Default action
      data = await this.getDefaultData(tenant_id, user_id);
    }

    logger.info('[Real-time Query] Data fetched', {
      service: process.env.SERVICE_NAME,
      tenant_id,
      user_id,
      records: Array.isArray(data) ? data.length : 1
    });

    // ⚠️ CRITICAL: Return data as direct array (not wrapped!)
    return {
      data: data,  // ⭐ Direct array of items or single item
      metadata: {
        query_type: this.detectQueryType(query)
      }
    };
  }

  /**
   * Query database with pagination (for Batch Sync)
   * ⚡ IMPLEMENT THIS based on your database and data model
   */
  async queryDatabase({ tenant_id, limit, offset, since }) {
    // TODO: Replace with your actual database query
    
    // Example (adapt to your DB and table):
    // return await db.YOUR_TABLE.findAll({
    //   where: {
    //     tenant_id: tenant_id,
    //     created_at: { $gte: new Date(since) }
    //   },
    //   limit: limit,
    //   offset: offset,
    //   order: [['created_at', 'DESC']]
    // });
    
    logger.warn('[Database Query] Not implemented - using placeholder', {
      service: process.env.SERVICE_NAME
    });
    
    return [];
  }

  /**
   * Get total count (for Batch Sync pagination)
   * ⚡ IMPLEMENT THIS based on your database and data model
   */
  async getTotalCount({ tenant_id, since }) {
    // TODO: Replace with your actual count query
    
    // Example (adapt to your DB and table):
    // const result = await db.YOUR_TABLE.count({
    //   where: {
    //     tenant_id: tenant_id,
    //     created_at: { $gte: new Date(since) }
    //   }
    // });
    // return result;
    
    return 0;
  }

  /**
   * Get recent items (for Real-time queries)
   * ⚡ IMPLEMENT THIS based on your business logic
   */
  async getRecentItems(tenant_id, user_id) {
    // TODO: Implement based on your data model
    
    // Example:
    // return await db.YOUR_TABLE.findAll({
    //   where: { tenant_id, user_id },
    //   limit: 10,
    //   order: [['created_at', 'DESC']]
    // });
    
    return [];
  }

  /**
   * Get item by ID (for Real-time queries)
   * ⚡ IMPLEMENT THIS based on your business logic
   */
  async getItemById(tenant_id, id) {
    // TODO: Implement based on your data model
    
    // Example:
    // return await db.YOUR_TABLE.findOne({
    //   where: { tenant_id, id }
    // });
    
    return null;
  }

  /**
   * Get default data (for Real-time queries)
   * ⚡ IMPLEMENT THIS based on your business logic
   */
  async getDefaultData(tenant_id, user_id) {
    // TODO: Implement based on your data model
    return [];
  }

  /**
   * Extract ID from query text
   */
  extractId(query) {
    const match = query.match(/\d+/);
    return match ? match[0] : null;
  }

  /**
   * Detect query type
   */
  detectQueryType(query) {
    if (query.includes('recent')) return 'recent';
    if (query.includes('id')) return 'by_id';
    return 'default';
  }
}

module.exports = new ProcessHandler();
```

---

### Step 4: Update Main Entry Point

**File:** `src/index.js`

**Add GRPC server startup:**

```javascript
// Add this import at the top
const grpcServer = require('./grpc/server');

// In your existing startup function, add:
async function startup() {
  try {
    // ... your existing startup code (HTTP server, DB, etc.) ...

    // Start GRPC server
    await grpcServer.start();

    logger.info('Microservice started successfully', {
      service: process.env.SERVICE_NAME,
      http_port: process.env.PORT || 3000,
      grpc_port: process.env.GRPC_PORT || 50051
    });

  } catch (error) {
    logger.error('Failed to start microservice', {
      service: process.env.SERVICE_NAME,
      error: error.message
    });
    process.exit(1);
  }
}

// In your existing shutdown function, add:
async function shutdown() {
  logger.info('Shutting down microservice', {
    service: process.env.SERVICE_NAME
  });

  // Shutdown GRPC server
  await grpcServer.shutdown();

  // ... your existing shutdown code (HTTP server, DB, etc.) ...

  process.exit(0);
}

// Make sure these exist:
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startup();
```

---

### Step 5: Add Environment Variables

**File:** `.env`

```bash
# GRPC Configuration
GRPC_PORT=50051

# Service Identification
SERVICE_NAME=your-service-name

# Your existing variables...
```

---

## 🚨 RESPONSE FORMAT - DETAILED EXAMPLES

### ✅ CORRECT - Real-time Response

```javascript
// Real-time query returns array directly
return {
  data: [
    {
      report_id: "report-789",
      report_name: "Monthly Learning Performance Report",
      report_type: "performance",
      generated_at: "2025-01-15T10:30:00.000Z",
      conclusions: { ... },
      metrics: { ... }
    },
    {
      report_id: "report-790",
      report_name: "Weekly Progress Report",
      report_type: "progress",
      ...
    }
  ],
  metadata: {
    query_type: "recent"
  }
};
```

### ✅ CORRECT - Batch Response

```javascript
// Batch sync returns object with items
return {
  data: {
    items: [
      { report_id: "r1", ... },
      { report_id: "r2", ... },
      // ... 1000 items
    ],
    page: 1,
    limit: 1000,
    total: 5000
  },
  metadata: {
    has_more: true,
    page: 1,
    total_pages: 5
  }
};
```

### ❌ WRONG - Wrapped Response

```javascript
// ❌ DON'T DO THIS - Extra wrapper!
return {
  data: {
    entries: [  // ❌ Wrong! No wrapper!
      { report_id: "r1", ... }
    ]
  }
};

// ❌ DON'T DO THIS - Extra wrapper!
return {
  data: {
    reports: [  // ❌ Wrong! No wrapper!
      { report_id: "r1", ... }
    ]
  }
};

// ❌ DON'T DO THIS - Extra wrapper!
return {
  data: {
    results: [  // ❌ Wrong! No wrapper!
      { report_id: "r1", ... }
    ]
  }
};
```

---

## 📊 STEP 6: CREATE DATA_STRUCTURE_REPORT.json

**MANDATORY STEP - DO NOT SKIP!**

After completing the implementation above, you MUST create a data structure report.

### File Location

```
[your-microservice-root]/DATA_STRUCTURE_REPORT.json
```

### Format (EXACT - Don't change!)

```json
{
  "service_name": "your-service-name",
  "description": "Brief description of what this service manages",
  "version": "1.0.0",
  "data_structure": {
    "field_name_1": "type",
    "field_name_2": "type",
    "nested_field": "object"
  },
  "field_descriptions": {
    "field_name_1": "What this field represents",
    "field_name_2": "What this field contains"
  },
  "sample_data": {
    "field_name_1": "actual example value",
    "field_name_2": 123,
    "nested_field": {
      "sub_field": "value"
    }
  },
  "notes": [
    "Any important information about the data structure",
    "Nested objects and their structure"
  ]
}
```

### How to Create It

**Step 1:** Look at your `queryDatabase()` implementation:

```javascript
async queryDatabase({ tenant_id, limit, offset, since }) {
  return await db.reports.findAll({
    attributes: [
      'report_id',
      'report_name',
      'report_type',
      'generated_at',
      'period',
      'conclusions',
      'metrics',
      'created_at',
      'updated_at'
    ],
    where: { tenant_id, created_at: { $gte: since } },
    limit, offset
  });
}
```

**Step 2:** Document each field:

```json
{
  "service_name": "managementreporting-service",
  "description": "Manages educational management reports and analytics",
  "version": "1.0.0",
  "data_structure": {
    "report_id": "string",
    "report_name": "string",
    "report_type": "string",
    "generated_at": "datetime",
    "period": "object",
    "conclusions": "object",
    "metrics": "object",
    "created_at": "datetime",
    "updated_at": "datetime"
  },
  "field_descriptions": {
    "report_id": "Unique report identifier",
    "report_name": "Display name of the report",
    "report_type": "Type of report (performance, analytics, etc.)",
    "generated_at": "When the report was generated",
    "period": "Time period covered by report (start/end dates)",
    "conclusions": "Report conclusions (summary, findings, recommendations)",
    "metrics": "Numerical metrics and statistics",
    "created_at": "When report was created",
    "updated_at": "Last modification timestamp"
  },
  "sample_data": {
    "report_id": "report-789",
    "report_name": "Monthly Learning Performance Report",
    "report_type": "performance",
    "generated_at": "2025-01-15T10:30:00.000Z",
    "period": {
      "start": "2025-01-01",
      "end": "2025-01-31"
    },
    "conclusions": {
      "summary": "Overall performance improved by 15%",
      "key_findings": [
        "Student engagement increased",
        "Completion rates rose from 72% to 87%"
      ],
      "recommendations": [
        "Continue current methods",
        "Focus on struggling students"
      ]
    },
    "metrics": {
      "total_students": 450,
      "active_students": 425,
      "completion_rate": 87.5,
      "average_score": 82.3
    },
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  },
  "notes": [
    "Conclusions contain nested arrays for findings and recommendations",
    "Period is always an object with start/end dates",
    "Metrics vary by report type"
  ]
}
```

### Allowed Field Types

Use ONLY these types:

```
string      - Text values (IDs, names)
text        - Long text (descriptions)
number      - Numeric values (decimals allowed)
integer     - Whole numbers only
boolean     - true/false
datetime    - ISO 8601 timestamp
date        - Date only (YYYY-MM-DD)
object      - Nested JSON object
array       - List/array of items
```

### Critical Rules for REPORT

1. ✅ Use REAL sample data (not "example", "test", "123")
2. ✅ Document ALL fields that appear in your data
3. ✅ Use exact key names: `service_name`, `data_structure`, etc.
4. ✅ File must be valid JSON
5. ✅ Save in microservice root directory

---

## ✅ FINAL CHECKLIST

Before marking implementation as complete:

### Files Created:
- [ ] `proto/microservice.proto`
- [ ] `src/grpc/server.js`
- [ ] `src/grpc/handlers/processHandler.js`
- [ ] Main entry point updated (GRPC server starts)
- [ ] `.env` updated (GRPC_PORT added)
- [ ] **`DATA_STRUCTURE_REPORT.json` created** ⭐⭐⭐

### Response Format:
- [ ] **Real-time returns direct array** (no wrapper!)
- [ ] **Batch returns `{ items: [...], page, total }`** (no wrapper!)
- [ ] Verified response format is correct

### Business Logic:
- [ ] `queryDatabase()` implemented (returns ALL records, paginated)
- [ ] `getTotalCount()` implemented
- [ ] `getRecentItems()` implemented (limited to 10-20)
- [ ] `getItemById()` implemented

### Testing:
- [ ] GRPC server starts successfully
- [ ] Real-time query works
- [ ] Batch sync works
- [ ] Both HTTP and GRPC work together
- [ ] Response format validated (no wrappers!)

### Report:
- [ ] DATA_STRUCTURE_REPORT.json created
- [ ] All fields documented
- [ ] Sample data is REAL
- [ ] File is valid JSON
- [ ] Saved in correct location

---

## 🎯 SUCCESS CRITERIA

**Implementation is complete when:**

1. ✅ GRPC server running on port 50051
2. ✅ HTTP server still works on port 3000
3. ✅ Real-time queries return direct array (NO WRAPPER!)
4. ✅ Batch sync returns `{items: [], page, total}` (NO WRAPPER!)
5. ✅ Pagination works correctly
6. ✅ Both modes handle requests correctly
7. ✅ **DATA_STRUCTURE_REPORT.json exists and is correct**

---

## 🚨 COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Wrapping Data

```javascript
// ❌ WRONG
return {
  data: {
    entries: items  // NO! Remove wrapper!
  }
};

// ✅ CORRECT
return {
  data: items  // Direct array
};
```

### ❌ Mistake 2: Missing REPORT

```
✅ GRPC implemented
✅ Server running
❌ No DATA_STRUCTURE_REPORT.json  // CRITICAL ERROR!
```

### ❌ Mistake 3: Placeholder Data in REPORT

```json
// ❌ WRONG
"sample_data": {
  "report_id": "123",
  "report_name": "Example Report"
}

// ✅ CORRECT
"sample_data": {
  "report_id": "report-789",
  "report_name": "Monthly Learning Performance Report"
}
```

---

## 📝 IMPLEMENTATION COMPLETE WHEN

All of these are true:

1. ✅ GRPC handlers implemented
2. ✅ Response format correct (no wrappers!)
3. ✅ Both modes work (real-time + batch)
4. ✅ Tests pass
5. ✅ **DATA_STRUCTURE_REPORT.json created**
6. ✅ Report has REAL sample data
7. ✅ Report format is correct

**Only then is the implementation truly complete!**

---

**This PROMPT ensures both correct implementation AND proper documentation for RAG Service integration.** 🚀
