# Batch and On-Demand Request Guide for Microservices Receiving Requests from MS8 Learning Analytics

## Overview

**This guide is for microservices that RECEIVE requests from MS8 Learning Analytics (both batch and on-demand).**

MS8 Learning Analytics sends two types of requests:
1. **Batch Requests:** Scheduled bulk data ingestion with pagination support via `cursor`
2. **On-Demand Requests:** User-triggered, filtered data requests for specific users/companies

This guide explains:
- What MS8 Learning Analytics sends in batch and on-demand requests
- What MS8 Learning Analytics expects in your responses
- How to handle pagination for batch requests
- How to handle filters for on-demand requests

**⚠️ IMPORTANT:**
- This guide describes **MS8 Learning Analytics' request/response format** only
- **You are responsible** for implementing pagination in your microservice using your own methods
- MS8 Learning Analytics will automatically loop through all pages, but **you must handle each page request correctly**
- Your implementation details (AI engine, database queries, etc.) are **your responsibility**
- Requests are routed through **Coordinator Microservice** which uses `service_origin` and `action` fields for routing

## Coordinator Routing

**All batch requests go through the Coordinator Microservice:**

1. **MS8 Learning Analytics** sends request to Coordinator with:
   - `requester_service: "LearningAnalytics"`
   - `payload.service_origin`: Your service identifier (e.g., `"directory"`, `"coursebuilder"`)
   - `payload.action`: Routing instruction with pattern `"batch:ROUTE_TO_ServiceName: [description]"`

2. **Coordinator** uses these fields to route the request to your microservice:
   - Primary routing field: `payload.service_origin` (e.g., `"directory"` → routes to directory-service)
   - Validation: `payload.action` must contain `"ROUTE_TO_ServiceName"` matching the `service_origin` value

3. **Your Microservice** receives the request and returns filled data

4. **Coordinator** forwards the response back to MS8 Learning Analytics

**Note:** If you receive a request without `service_origin`, it may be a direct request (bypassing Coordinator) or an older format request.

## Batch vs On-Demand Requests: Key Differences

### Batch Requests

**Purpose:** Scheduled bulk data ingestion for periodic synchronization (runs daily at 02:00 UTC)

**Characteristics:**
- ✅ **Pagination:** Uses `cursor` field for paginated responses
- ✅ **Scope:** Fetches ALL data (no user/company filters)
- ✅ **Type:** `payload.type = "batch"`
- ✅ **Action:** `"batch:ROUTE_TO_ServiceName: [description]"`
- ❌ **No filters:** Does NOT include `user_id`, `company_id`, `filters`, or `reason` fields
- ✅ **Response:** Must include `pagination` object with `total_records`, `returned_records`, `next_cursor`, `has_more`

**When to use:** Batch requests are for initial data ingestion and periodic full synchronization of all historical data.

### On-Demand Requests

**Purpose:** User-triggered manual refresh for specific users/companies (dashboard refresh, manual refresh)

**Characteristics:**
- ❌ **No Pagination:** Does NOT use `cursor` field (user-specific, typically smaller dataset)
- ✅ **Filters:** Includes `user_id`, `company_id`, `filters`, and `reason` fields
- ✅ **Type:** `payload.type = "on-demand"`
- ✅ **Action:** `"on-demand:ROUTE_TO_ServiceName: [description]"`
- ✅ **User-specific:** Fetches data filtered by user/company
- ❌ **No pagination:** Response does NOT need `pagination` object (single response with filtered data)

**When to use:** On-demand requests are for refreshing specific user/company data when a user manually triggers a refresh or views their dashboard.

## Batch Request Format from MS8 Learning Analytics

MS8 Learning Analytics sends batch requests in this format:

```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "type": "batch",
    "action": "batch:ROUTE_TO_ServiceName: Fetching [data description] from [ServiceName] service to populate learning analytics database",
    "service_origin": "directory",  // Service identifier (e.g., "directory", "coursebuilder", "contentstudio", "assessment", "skillsengine", "learnerai", "devlab")
    "cursor": "550e8400-e29b-41d4-a716-446655440000"  // Optional: null for first page, then the next_cursor from your previous response
  },
  "response": {
    // Empty structure with field names that MS8 expects you to fill
    // Structure depends on your service's data contract
  }
}
```

### Key Fields in Request

**`payload.type`:**
- Always `"batch"` for batch requests
- Indicates this is a batch ingestion request (not on-demand)

**`payload.action`:**
- Contains routing instruction in format: `"batch:ROUTE_TO_ServiceName: [description]"`
- Example: `"batch:ROUTE_TO_Directory: Fetching organizational hierarchy data from Directory service to populate learning analytics database"`
- Used by Coordinator for routing to the correct microservice
- Includes service name in format `ROUTE_TO_ServiceName` (e.g., `ROUTE_TO_Directory`, `ROUTE_TO_CourseBuilder`)

**`payload.service_origin`:**
- **CRITICAL:** Service identifier for Coordinator routing
- Values: `"directory"`, `"coursebuilder"`, `"contentstudio"`, `"assessment"`, `"skillsengine"`, `"learnerai"`, `"devlab"`, `"marketplace"`
- This is the PRIMARY routing field that Coordinator uses to determine target service
- Must match the service name in `action` field's `ROUTE_TO_ServiceName` pattern

**`payload.cursor`:**
- **First page:** `null` or missing
- **Subsequent pages:** The `next_cursor` value from your previous response
- **Your responsibility:** Use this cursor to return the next page of data

**`response` structure:**
- Contains field names that MS8 expects you to fill
- Structure matches your service's data contract
- Empty values (empty strings `""` or `null`) indicate fields that need to be filled

## Response Format Expected by MS8 Learning Analytics

MS8 Learning Analytics expects responses in this format:

```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    // Echo of the request payload
  },
  "response": {
    "version": "2025-01-27",  // Your service version
    "fetched_at": "2025-01-27T10:30:00Z",  // Timestamp when data was fetched
    "pagination": {
      "total_records": 5000,        // REQUIRED: Total count of all records
      "returned_records": 1000,     // REQUIRED: Records in current page
      "next_cursor": "550e8400-e29b-41d4-a716-446655440001",  // REQUIRED: Last record's ID from this page (null if last page)
      "has_more": true              // REQUIRED: True if more pages available
    },
    // Your service-specific data arrays (e.g., "courses", "learning_paths", "attempts", etc.)
    "your_data_array": [ /* records */ ]
  }
}
```

### Required Pagination Fields

**MS8 Learning Analytics requires these fields in `response.pagination`:**

1. **`total_records`** (number, required)
   - Total count of all records available
   - Use a COUNT query or similar method to get total count
   - Should be the same across all pages

2. **`returned_records`** (number, required)
   - Number of records in the current page
   - Should match the length of your data array
   - Typically 1000 for non-last pages, less for last page

3. **`next_cursor`** (string | null, required)
   - **First/Intermediate pages:** Last record's primary key value from current page
   - **Last page:** `null`
   - MS8 will use this value as `payload.cursor` in the next request
   - **Critical:** Must be the actual last record's ID, not a placeholder

4. **`has_more`** (boolean, required)
   - **`true`:** More pages available (when `returned_records` equals page size and `next_cursor` is not null)
   - **`false`:** Last page (when `returned_records` is less than page size, or `next_cursor` is null)

### Generic Pagination Structure (Recommended)

**✅ RECOMMENDED: Use generic field names for all services:**

```json
{
  "pagination": {
    "total_records": 0,        // Generic: total count of all records
    "returned_records": 0,     // Generic: records in current page
    "next_cursor": "",         // Cursor for next page (null if last page)
    "has_more": false          // True if more pages available
  }
}
```

**Benefits of generic structure:**
- ✅ Works for ALL services (no service-specific logic needed)
- ✅ Consistent across all microservices
- ✅ Easier to implement and maintain
- ✅ MS8 Learning Analytics checks for these field names first

### Alternative: Service-Specific Field Names

If you need service-specific field names for backward compatibility:

```json
{
  "pagination": {
    "total_courses": 0,           // Service-specific (if your service uses courses)
    "returned_courses": 0,        // Service-specific
    "next_cursor": "",
    "has_more": false
  }
}
```

**Note:** MS8 Learning Analytics will check both generic (`total_records`) and service-specific field names, but generic names are preferred for new implementations.

## Pagination Flow

### How MS8 Learning Analytics Handles Pagination

**MS8 Learning Analytics will automatically loop through all pages** - you only need to handle one page at a time:

1. **First Request:**
   - MS8 sends: `payload.cursor = null`
   - You return: First page of data + `pagination.next_cursor` (last record's ID)

2. **Subsequent Requests:**
   - MS8 sends: `payload.cursor = <your previous next_cursor value>`
   - You return: Next page of data + `pagination.next_cursor` (last record's ID)

3. **Last Request:**
   - MS8 sends: `payload.cursor = <your previous next_cursor value>`
   - You return: Last page of data + `pagination.next_cursor = null` + `has_more = false`

4. **MS8 Stops:**
   - When `pagination.next_cursor` is `null` or `has_more` is `false`

**⚠️ Important for Your Service:**
- MS8 will send multiple requests (one per page)
- Each request will have `payload.cursor` (null for first page, then the `next_cursor` from previous response)
- You only need to handle ONE page per request
- Return `next_cursor` in your response so MS8 knows when to stop
- MS8 handles the loop - you don't need to implement the loop yourself

## What You Need to Implement

**Your responsibility (implementation details are up to you):**

1. **Detect `payload.cursor`:**
   - Check if `payload.cursor` is present in the request
   - `null` or missing = first page
   - Value present = subsequent page

2. **Use cursor for pagination:**
   - Use `payload.cursor` to fetch the next page of data
   - Implementation method is up to you (SQL WHERE clause, API pagination, etc.)
   - Return records starting after the cursor value

3. **Calculate pagination metadata:**
   - `total_records`: Total count of all records (same across all pages)
   - `returned_records`: Number of records in current page
   - `next_cursor`: Last record's primary key from current page (null if last page)
   - `has_more`: Boolean indicating if more pages exist

4. **Return correct response format:**
   - Include `pagination` object with all required fields
   - Include your service-specific data arrays
   - Ensure `next_cursor` is the actual last record's ID (not a placeholder)

## On-Demand Request Format from MS8 Learning Analytics

MS8 Learning Analytics sends on-demand requests in this format:

```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "type": "on-demand",
    "action": "on-demand:ROUTE_TO_ServiceName: Manual refresh of [ServiceName] data requested by user",
    "service_origin": "directory",  // Service identifier (e.g., "directory", "coursebuilder", "contentstudio", "assessment", "skillsengine", "learnerai", "devlab")
    "user_id": "550e8400-e29b-41d4-a716-446655440103",  // User ID filter (may be null for company-wide requests)
    "company_id": "C123",  // Company ID filter (may be null for user-specific requests)
    "reason": "manual_refresh"  // Reason for request: "manual_refresh", "dashboard_refresh", "user_request"
  },
  "response": {
    // Empty structure with field names that MS8 expects you to fill
    // Structure depends on your service's data contract
  }
}
```

### Key Fields in On-Demand Request

**`payload.type`:**
- Always `"on-demand"` for on-demand requests
- Indicates this is a user-triggered request (not batch)

**`payload.action`:**
- Contains routing instruction in format: `"on-demand:ROUTE_TO_ServiceName: [description]"`
- Example: `"on-demand:ROUTE_TO_Directory: Manual refresh of Directory data requested by user"`
- Used by Coordinator for routing to the correct microservice
- Includes service name in format `ROUTE_TO_ServiceName` (e.g., `ROUTE_TO_Directory`, `ROUTE_TO_CourseBuilder`)

**`payload.service_origin`:**
- **CRITICAL:** Service identifier for Coordinator routing
- Values: `"directory"`, `"coursebuilder"`, `"contentstudio"`, `"assessment"`, `"skillsengine"`, `"learnerai"`, `"devlab"`, `"marketplace"`
- This is the PRIMARY routing field that Coordinator uses to determine target service
- Must match the service name in `action` field's `ROUTE_TO_ServiceName` pattern

**`payload.user_id`:**
- **User-specific filter:** UUID of the user whose data should be fetched
- May be `null` if request is company-wide (not user-specific)
- **Your responsibility:** Filter data by this user ID if provided

**`payload.company_id`:**
- **Company-specific filter:** Company identifier for company-wide data requests
- May be `null` if request is user-specific only
- **Your responsibility:** Filter data by this company ID if provided

**`payload.reason`:**
- **Request reason:** Explains why the request was made
- Common values:
  - `"manual_refresh"`: User manually triggered refresh (dashboard refresh button)
  - `"dashboard_refresh"`: Automatic refresh for dashboard display
  - `"user_request"`: General user-initiated request
- **Note:** This is informational - you can use it for logging/analytics but it doesn't affect data filtering

**`payload.filters`:**
- **NOT USED:** Filters are not included in on-demand requests
- Filtering is done by `user_id` and `company_id` only
- Course-related filters are excluded - MS8 fetches ALL data for the user/company

**`response` structure:**
- Contains field names that MS8 expects you to fill
- Structure matches your service's data contract
- Empty values (empty strings `""` or `null`) indicate fields that need to be filled
- **Note:** On-demand responses do NOT need `pagination` object (single response, not paginated)

### On-Demand Response Format Expected by MS8 Learning Analytics

MS8 Learning Analytics expects on-demand responses in this format:

```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    // Echo of the request payload
  },
  "response": {
    "version": "2025-01-27",  // Your service version
    "fetched_at": "2025-01-27T10:30:00Z",  // Timestamp when data was fetched
    // Your service-specific data fields (filtered by user_id/company_id from request)
    // Structure matches your service's data contract - each service has different field names
    // Examples by service:
    //   - Directory: "hierarchy", "company_name", "kpis", etc.
    //   - Skills Engine: "user_competencies", "target_competencies", "user_id", "user_name"
    //   - Course Builder: "courses" (array with lessons, enrollments, etc.)
    //   - Assessment: "attempts" (array of attempt objects)
    //   - Content Studio: "courses", "topics_stand_alone"
    //   - Learner AI: "learning_paths"
    //   - DevLab: "competitions"
    // NO pagination object needed (on-demand is single response with filtered data)
  }
}
```

### Key Differences: On-Demand vs Batch Responses

**On-Demand Response:**
- ❌ **NO `pagination` object** (single response, not paginated)
- ✅ **Filtered data** (only data matching `user_id`/`company_id`/`filters` from request)
- ✅ **Single response** (all filtered data in one response)

**Batch Response:**
- ✅ **REQUIRES `pagination` object** (paginated responses)
- ✅ **ALL data** (no filters, fetches everything)
- ✅ **Multiple responses** (one per page, MS8 loops through pages)

## What You Need to Implement for On-Demand Requests

**Your responsibility (implementation details are up to you):**

1. **Detect request type:**
   - Check `payload.type`: `"on-demand"` = on-demand request, `"batch"` = batch request
   - On-demand requests do NOT have `payload.cursor` field

2. **Apply filters:**
   - Use `payload.user_id` to filter data by user (if provided, not null)
   - Use `payload.company_id` to filter data by company (if provided, not null)
   - **Note:** Filters field is not used - filtering is done by user_id and company_id only

3. **Return filtered data:**
   - Return only the data that matches the filters from the request
   - Do NOT include `pagination` object in on-demand responses
   - Return all filtered data in a single response

4. **Handle null values:**
   - If `user_id` is null, return company-wide data (filtered by `company_id` if provided)
   - If `company_id` is null, return user-specific data (filtered by `user_id` if provided)
   - If both are null, return all data (though this is uncommon for on-demand requests)

## Testing Scenarios

### Test Case 1: First Page (No Cursor)
**Request:**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "type": "batch",
    "action": "batch:ROUTE_TO_YourService: Fetching data from YourService to populate learning analytics database",
    "service_origin": "yourservice",
    "cursor": null
  },
  "response": {
    // Empty template structure
  }
}
```

**Expected Response:**
- Returns first page of records (typically 1000 records)
- `pagination.next_cursor` = last record's ID (not null)
- `pagination.has_more` = true (if more than 1000 records exist)
- `pagination.total_records` = total count
- `pagination.returned_records` = number of records in this page

### Test Case 2: Subsequent Page (With Cursor)
**Request:**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "type": "batch",
    "action": "batch:ROUTE_TO_YourService: Fetching data from YourService to populate learning analytics database",
    "service_origin": "yourservice",
    "cursor": "550e8400-e29b-41d4-a716-446655440000"
  },
  "response": {
    // Empty template structure
  }
}
```

**Expected Response:**
- Returns next page of records (starting after cursor)
- `pagination.next_cursor` = last record's ID (or null if last page)
- `pagination.has_more` = false (if last page)
- `pagination.total_records` = same total count as first page
- `pagination.returned_records` = number of records in this page

### Test Case 3: Last Page
**Request:**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "type": "batch",
    "action": "batch:ROUTE_TO_YourService: Fetching data from YourService to populate learning analytics database",
    "service_origin": "yourservice",
    "cursor": "last-record-id-uuid"
  },
  "response": {
    // Empty template structure
  }
}
```

**Expected Response:**
- Returns remaining records (< 1000)
- `pagination.next_cursor` = null
- `pagination.has_more` = false
- `pagination.total_records` = same total count
- `pagination.returned_records` = number of records in this page

### Test Case 4: On-Demand Request (User-Specific)
**Request:**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "type": "on-demand",
    "action": "on-demand:ROUTE_TO_YourService: Manual refresh of YourService data requested by user",
    "service_origin": "yourservice",
    "user_id": "550e8400-e29b-41d4-a716-446655440103",
    "company_id": null,
    "reason": "manual_refresh"
  },
  "response": {
    // Empty template structure
  }
}
```

**Expected Response:**
- Returns ALL data for the specified user (filtered by `user_id`)
- ❌ **NO `pagination` object** (on-demand is single response, not paginated)
- Data should match the `user_id` from the request
- Single response with all filtered data

### Test Case 5: On-Demand Request (Company-Wide)
**Request:**
```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "type": "on-demand",
    "action": "on-demand:ROUTE_TO_YourService: Manual refresh of YourService data requested by user",
    "service_origin": "yourservice",
    "user_id": null,
    "company_id": "C123",
    "reason": "dashboard_refresh",
    "filters": {
      "role": "manager"
    }
  },
  "response": {
    // Empty template structure
  }
}
```

**Expected Response:**
- Returns ALL data for the specified company (filtered by `company_id` and `filters.role`)
- ❌ **NO `pagination` object** (on-demand is single response, not paginated)
- Data should match the `company_id` and any additional filters from the request
- Single response with all filtered data

## Common Issues

### ❌ Issue 1: Missing Pagination Metadata
**Problem:** Response doesn't include `pagination` object
**Impact:** MS8 cannot determine if more pages exist
**Fix:** Always include `pagination` object with all required fields in batch responses

### ❌ Issue 2: Cursor Not Used
**Problem:** Service ignores `payload.cursor` and always returns first page
**Impact:** MS8 receives duplicate data
**Fix:** Use `payload.cursor` to fetch the correct page of data

### ❌ Issue 3: Wrong Cursor Type
**Problem:** Cursor is UUID but service treats it as string (or vice versa)
**Impact:** Pagination may fail or return incorrect results
**Fix:** Handle cursor type correctly based on your primary key data type

### ❌ Issue 4: Infinite Loop
**Problem:** `next_cursor` always returns same value
**Impact:** MS8 loops infinitely requesting the same page
**Fix:** Ensure `next_cursor` is the actual last record's ID from current page, not a placeholder or constant

### ❌ Issue 5: Incorrect `has_more` Flag
**Problem:** `has_more` is always `true` or always `false`
**Impact:** MS8 may stop too early or loop infinitely
**Fix:** Set `has_more = true` only when `returned_records` equals page size AND `next_cursor` is not null

### ❌ Issue 6: On-Demand Request Returns Pagination (WRONG)
**Problem:** On-demand response includes `pagination` object
**Impact:** MS8 may try to paginate on-demand responses, causing errors
**Fix:** On-demand responses should NOT include `pagination` object - return single response with filtered data

### ❌ Issue 7: On-Demand Request Ignores user_id/company_id
**Problem:** Service ignores `user_id` or `company_id` and returns all data
**Impact:** MS8 receives incorrect/unfiltered data for on-demand requests
**Fix:** Always filter data by `user_id`/`company_id` provided in on-demand requests

### ❌ Issue 8: Batch Request Includes User/Company Filters
**Problem:** Batch response is filtered by user/company when it should return ALL data
**Impact:** MS8 receives incomplete data for batch ingestion
**Fix:** Batch requests should return ALL data (no filters), only on-demand requests should filter by user/company

## Summary

### For Batch Requests

**For YOUR microservice receiving batch requests from MS8 Learning Analytics:**

1. ✅ Check `payload.type = "batch"` to identify batch requests
2. ✅ Check `payload.cursor` for pagination (null = first page, value = subsequent page)
3. ✅ Use cursor to fetch the correct page of data (implementation method is your choice)
4. ✅ Return ALL data (no user/company filters)
5. ✅ Return `pagination` metadata with **generic field names**:
   - `total_records` (total count of all records)
   - `returned_records` (records in current page)
   - `next_cursor` (last record's ID, null if last page)
   - `has_more` (true if more pages available)
6. ✅ Ensure `next_cursor` is the actual last record's ID from current page
7. ✅ Test with null cursor (first page) and with cursor (subsequent pages)

**MS8 Learning Analytics will automatically:**
- Send batch requests with `cursor` in payload
- Loop through all pages until `next_cursor` is null
- Merge all pages' data before persistence
- Check both generic (`total_records`) and service-specific field names for backward compatibility

### For On-Demand Requests

**For YOUR microservice receiving on-demand requests from MS8 Learning Analytics:**

1. ✅ Check `payload.type = "on-demand"` to identify on-demand requests
2. ✅ Filter data by `payload.user_id` if provided (not null)
3. ✅ Filter data by `payload.company_id` if provided (not null)
4. ✅ Return filtered data in single response
5. ✅ ❌ **DO NOT include `pagination` object** (on-demand is not paginated)
6. ✅ Test with user_id only, company_id only

**MS8 Learning Analytics will automatically:**
- Send on-demand requests with filters (`user_id`, `company_id`, `filters`)
- Expect single response with filtered data (no pagination)
- Use filtered data immediately for dashboard refresh

### Key Differences Summary

| Feature | Batch Requests | On-Demand Requests |
|---------|---------------|-------------------|
| **Type** | `payload.type = "batch"` | `payload.type = "on-demand"` |
| **Action** | `"batch:ROUTE_TO_ServiceName: [description]"` | `"on-demand:ROUTE_TO_ServiceName: [description]"` |
| **Pagination** | ✅ Uses `cursor`, requires `pagination` in response | ❌ No cursor, no pagination in response |
| **Filters** | ❌ No filters, returns ALL data | ✅ Uses `user_id`, `company_id` only (no filters object) |
| **Response Count** | Multiple responses (one per page) | Single response (all filtered data) |
| **Purpose** | Scheduled bulk ingestion | User-triggered refresh |
| **When Used** | Daily at 02:00 UTC | Dashboard refresh, manual refresh |

**⚠️ Remember:**

**For YOUR microservice receiving batch requests from MS8 Learning Analytics:**

1. ✅ Check `payload.cursor` for pagination (null = first page, value = subsequent page)
2. ✅ Use cursor to fetch the correct page of data (implementation method is your choice)
3. ✅ Return `pagination` metadata with **generic field names**:
   - `total_records` (total count of all records)
   - `returned_records` (records in current page)
   - `next_cursor` (last record's ID, null if last page)
   - `has_more` (true if more pages available)
4. ✅ Ensure `next_cursor` is the actual last record's ID from current page
5. ✅ Test with null cursor (first page) and with cursor (subsequent pages)

**MS8 Learning Analytics will automatically:**
- Send requests with `cursor` in payload
- Loop through all pages until `next_cursor` is null
- Merge all pages' data before persistence
- Check both generic (`total_records`) and service-specific field names for backward compatibility

**⚠️ Remember:**
- This guide describes **MS8 Learning Analytics' request/response format** only
- **You are responsible** for implementing pagination (batch) and filtering (on-demand) in your service
- Implementation details (AI engine, database queries, filtering logic, etc.) are **your choice**
- For batch requests: MS8 handles the pagination loop - you only need to handle one page per request
- For on-demand requests: MS8 expects single response with filtered data - no pagination needed
- Always check `payload.type` to determine if request is `"batch"` or `"on-demand"` and handle accordingly
