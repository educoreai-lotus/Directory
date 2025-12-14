#!/usr/bin/env node
/**
 * Generate Postman-ready request details for Learner AI - sending_new_decision_maker
 * 
 * Usage:
 *   node backend/scripts/get-postman-learner-ai-new-decision-maker.js
 */

const fs = require('fs');
const path = require('path');
const { generateSignature } = require('../src/utils/signature');

// Load configuration
const SERVICE_NAME = process.env.SERVICE_NAME || 'directory-service';
const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-6004.up.railway.app';

// Load private key
let PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  const privateKeyPath = path.join(__dirname, '..', 'src', 'security', 'directory-private-key.pem');
  if (fs.existsSync(privateKeyPath)) {
    PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
  } else {
    console.error('❌ PRIVATE_KEY not found!');
    process.exit(1);
  }
} else {
  // Normalize escaped newlines
  if (PRIVATE_KEY.includes('\\n')) {
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
  }
}

// Request envelope - exact structure from user's request
const requestBody = {
  "requester_service": "directory",
  "payload": {
    "action": "sending_new_decision_maker",
    "company_id": "c1d2e3f4-5678-9012-3456-789012345678",
    "company_name": "TechCorp Inc.",
    "approval_policy": "manual",
    "decision_maker": {
      "employee_id": "123e4567-e89b-12d3-a456-426614174000",
      "employee_name": "Sarah Joh",
      "employee_email": "sarah.johnson@techcorp.com"
    }
  },
  "response": {}
};

// Generate signature
console.log('\n🔐 Generating digital signature...');
const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, requestBody);
console.log('✅ Signature generated');

// Output Postman-ready information
console.log('\n📋 ===== POSTMAN REQUEST DETAILS =====\n');
console.log('📍 URL:');
console.log(`${COORDINATOR_URL}/api/fill-content-metrics/`);
console.log('\n🔑 Headers:');
console.log(`Content-Type: application/json`);
console.log(`X-Service-Name: ${SERVICE_NAME}`);
console.log(`X-Signature: ${signature}`);
console.log('\n📦 Request Body (JSON):');
console.log(JSON.stringify(requestBody, null, 2));
console.log('\n✨ ===== COPY TO POSTMAN =====\n');
console.log('Method: POST');
console.log(`URL: ${COORDINATOR_URL}/api/fill-content-metrics/`);
console.log('\nHeaders:');
console.log(`  Content-Type: application/json`);
console.log(`  X-Service-Name: ${SERVICE_NAME}`);
console.log(`  X-Signature: ${signature}`);
console.log('\nBody (raw JSON):');
console.log(JSON.stringify(requestBody, null, 2));

