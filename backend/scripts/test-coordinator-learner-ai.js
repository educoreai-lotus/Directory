#!/usr/bin/env node
/**
 * Test script to send a POST request to Coordinator for Learner AI microservice
 * Tests the "sending_decision_maker_to_approve_learning_path" action
 * 
 * Usage:
 *   node backend/scripts/test-coordinator-learner-ai.js
 * 
 * Environment variables required:
 *   - COORDINATOR_URL (or uses default from config)
 *   - PRIVATE_KEY (or loads from backend/src/security/directory-private-key.pem)
 *   - SERVICE_NAME (defaults to 'directory-service')
 */

const fs = require('fs');
const path = require('path');
const { generateSignature } = require('../src/utils/signature');

// Use built-in fetch (Node 18+) or require node-fetch if available
let fetch;
try {
  // Try built-in fetch first (Node 18+)
  if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
  } else {
    // Fallback to node-fetch if available
    fetch = require('node-fetch');
  }
} catch (e) {
  // If node-fetch is not available, try to use https module
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');
  
  fetch = async (url, options = {}) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    return new Promise((resolve, reject) => {
      const req = protocol.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          res.text = () => Promise.resolve(data);
          res.json = () => Promise.resolve(JSON.parse(data));
          resolve(res);
        });
      });
      
      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  };
}

// Load configuration
const SERVICE_NAME = process.env.SERVICE_NAME || 'directory-service';
const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-6004.up.railway.app';

// Load private key
let PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  const privateKeyPath = path.join(__dirname, '..', 'src', 'security', 'directory-private-key.pem');
  if (fs.existsSync(privateKeyPath)) {
    PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
    console.log('✅ Loaded PRIVATE_KEY from file:', privateKeyPath);
  } else {
    console.error('❌ PRIVATE_KEY not found!');
    console.error('Set it as environment variable: PRIVATE_KEY="your-key-here"');
    console.error(`Or create a file: ${privateKeyPath}`);
    process.exit(1);
  }
} else {
  console.log('✅ PRIVATE_KEY loaded from environment variable');
  // Normalize escaped newlines
  if (PRIVATE_KEY.includes('\\n')) {
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
  }
}

// Test envelope - exact structure from user's request
const testEnvelope = {
  "requester_service": "directory",
  "payload": {
    "action": "sending_decision_maker_to_approve_learning_path",
    "company_id": "550e8400-e29b-41d4-a716-446655440000",
    "company_name": "TechCorp Inc.",
    "approval_policy": "manual",
    "decision_maker": {
      "employee_id": "123e4567-e89b-12d3-a456-426614174000",
      "employee_name": "Sarah Johnson",
      "employee_email": "sarah.johnson@techcorp.com"
    }
  },
  "response": {}
};

async function testCoordinatorRequest() {
  console.log('\n🧪 ===== TESTING COORDINATOR → LEARNER AI REQUEST =====\n');
  
  // Build URL
  const url = `${COORDINATOR_URL}/api/fill-content-metrics/`;
  console.log('📍 Coordinator URL:', url);
  console.log('🔑 Service Name:', SERVICE_NAME);
  console.log('\n📦 Request Envelope:');
  console.log(JSON.stringify(testEnvelope, null, 2));
  
  // Generate signature
  console.log('\n🔐 Generating digital signature...');
  let signature;
  try {
    signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, testEnvelope);
    console.log('✅ Signature generated successfully');
    console.log('   Signature length:', signature.length, 'characters');
    console.log('   Signature (first 50 chars):', signature.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ Signature generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'X-Service-Name': SERVICE_NAME,
    'X-Signature': signature
  };
  
  console.log('\n📤 Request Headers:');
  console.log('   Content-Type:', headers['Content-Type']);
  console.log('   X-Service-Name:', headers['X-Service-Name']);
  console.log('   X-Signature:', headers['X-Signature'].substring(0, 50) + '...');
  
  // Send request
  console.log('\n🚀 Sending POST request to Coordinator...');
  console.log('   Method: POST');
  console.log('   URL:', url);
  console.log('   Body size:', JSON.stringify(testEnvelope).length, 'bytes');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(testEnvelope)
    });
    
    console.log('\n📥 Response received:');
    console.log('   Status:', response.status, response.statusText);
    console.log('   OK:', response.ok);
    console.log('   Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`     ${key}: ${value}`);
    }
    
    // Parse response
    let responseData;
    try {
      responseData = await response.json();
      console.log('\n📋 Response Body:');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (jsonError) {
      const textResponse = await response.text();
      console.log('\n📋 Response Body (text):');
      console.log(textResponse.substring(0, 500));
      console.error('\n❌ Failed to parse JSON response:', jsonError.message);
    }
    
    // Check if request was successful
    if (response.ok) {
      console.log('\n✅ ✅ ✅ REQUEST SUCCESSFUL! ✅ ✅ ✅');
      console.log('   Coordinator accepted the request');
      console.log('   Check Coordinator logs to verify it routed to Learner AI microservice');
    } else {
      console.log('\n⚠️  Request returned non-OK status');
      console.log('   Status:', response.status);
      console.log('   This might indicate:');
      console.log('     - Coordinator rejected the signature');
      console.log('     - Action not recognized');
      console.log('     - Learner AI microservice error');
    }
    
    console.log('\n✨ ===== TEST COMPLETE =====\n');
    
  } catch (error) {
    console.error('\n❌ ❌ ❌ REQUEST FAILED ❌ ❌ ❌');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Tip: Check COORDINATOR_URL - cannot resolve hostname');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Coordinator service may be offline');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('\n💡 Tip: Request timeout - Coordinator may be slow or unreachable');
    }
    
    process.exit(1);
  }
}

// Run the test
testCoordinatorRequest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

