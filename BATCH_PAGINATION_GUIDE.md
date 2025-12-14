# Batch Pagination Guide for Microservices Receiving Requests from MS8 Learning Analytics

## Overview

**This guide is for microservices that RECEIVE batch requests from MS8 Learning Analytics.**

MS8 Learning Analytics sends batch requests with pagination support via `cursor` in the payload. This guide explains:
- What MS8 Learning Analytics sends in batch requests
- What MS8 Learning Analytics expects in your responses
- How to handle pagination for compatibility with MS8 Learning Analytics

**⚠️ IMPORTANT:**
- This guide describes **MS8 Learning Analytics' request/response format** only
- **You are responsible** for implementing pagination in your microservice using your own methods
- MS8 Learning Analytics will automatically loop through all pages, but **you must handle each page request correctly**
- Your implementation details (AI engine, database queries, etc.) are **your responsibility**

## Request Format from MS8 Learning Analytics

MS8 Learning Analytics sends batch requests in this format:

```json
{
  "requester_service": "LearningAnalytics",
  "payload": {
    "type": "batch",
    "action": "Batch ingestion: Fetching all historical data from [YourServiceName]...",
    "cursor": "550e8400-e29b-41d4-a716-446655440000"  // Optional: null for first page, then the next_cursor from your previous response
  },
  "response": {
    // Empty structure with field names that MS8 expects you to fill
    // Structure depends on your service's data contract
  }
}
```

### Key Fields in Request

**`payload.cursor`:**
- **First page:** `null` or missing
- **Subsequent pages:** The `next_cursor` value from your previous response
- **Your responsibility:** Use this cursor to return the next page of data

**`payload.type`:**
- Always `"batch"` for batch requests
- Indicates this is a batch ingestion request (not on-demand)

**`response` structure:**
- Contains field names that MS8 expects you to fill
- Structure matches your service's data contract
- Empty values indicate fields that need to be filled

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

## Testing Scenarios

### Test Case 1: First Page (No Cursor)
**Request:**
```json
{
  "payload": { "type": "batch", "cursor": null }
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
  "payload": { "type": "batch", "cursor": "550e8400-..." }
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
  "payload": { "type": "batch", "cursor": "last-record-id" }
}
```

**Expected Response:**
- Returns remaining records (< 1000)
- `pagination.next_cursor` = null
- `pagination.has_more` = false
- `pagination.total_records` = same total count
- `pagination.returned_records` = number of records in this page

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

## Summary

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
- **You are responsible** for implementing pagination in your service
- Implementation details (AI engine, database queries, etc.) are **your choice**
- MS8 handles the pagination loop - you only need to handle one page per request
