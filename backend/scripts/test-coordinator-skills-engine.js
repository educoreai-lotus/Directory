#!/usr/bin/env node
/**
 * Test script to send a POST request to Coordinator for Skills Engine microservice
 * Tests the "get_employee_skills_for_directory_profile" action
 * 
 * Usage:
 *   node backend/scripts/test-coordinator-skills-engine.js
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

// Test envelope - matches the structure sent when enriching a profile
const testEnvelope = {
  "requester_service": "directory-service",
  "payload": {
    "action": "get_employee_skills_for_directory_profile",
    "target_service": "skills-engine",
    "employee_id": "EMP001",
    "company_id": "c1d2e3f4-5678-9012-3456-789012345678",
    "employee_type": "regular_employee",
    "raw_data": {
      "linkedin": {
        "id": "linkedin-user-id-123",
        "name": "John Doe",
        "given_name": "John",
        "family_name": "Doe",
        "email": "john.doe@example.com",
        "picture": "https://media.licdn.com/dms/image/...",
        "locale": "en_US",
        "headline": "Senior Software Engineer at TechCorp",
        "positions": [
          {
            "title": "Senior Software Engineer",
            "companyName": "TechCorp Inc.",
            "description": "Leading development of scalable web applications...",
            "startDate": "2020-01-01",
            "endDate": "Current"
          }
        ]
      },
      "github": {
        "login": "johndoe",
        "id": 12345678,
        "name": "John Doe",
        "email": "john.doe@example.com",
        "bio": "Full-stack developer passionate about JavaScript, React, Node.js",
        "company": "TechCorp Inc.",
        "location": "San Francisco, CA",
        "blog": "https://johndoe.dev",
        "public_repos": 25,
        "followers": 150,
        "following": 80,
        "repositories": [
          {
            "id": 123456789,
            "name": "awesome-project",
            "full_name": "johndoe/awesome-project",
            "description": "An awesome project built with React and Node.js",
            "language": "JavaScript",
            "stargazers_count": 42,
            "forks_count": 10,
            "created_at": "2023-01-15T10:30:00Z",
            "updated_at": "2024-11-19T15:45:00Z"
          }
        ]
      }
    }
  },
  "response": {
    "user_id": 0,
    "competencies": [],
    "relevance_score": 0
  }
};

async function testCoordinatorRequest() {
  console.log('\n🧪 ===== TESTING COORDINATOR → SKILLS ENGINE REQUEST =====\n');
  
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
      console.log('   Check Coordinator logs to verify it routed to Skills Engine microservice');
      console.log('   Action:', testEnvelope.payload.action);
      console.log('   Target Service:', testEnvelope.payload.target_service);
    } else {
      console.log('\n⚠️  Request returned non-OK status');
      console.log('   Status:', response.status);
      console.log('   This might indicate:');
      console.log('     - Coordinator rejected the signature');
      console.log('     - Action not recognized');
      console.log('     - Skills Engine microservice error');
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

