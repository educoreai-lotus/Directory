#!/usr/bin/env node
/**
 * Generate Postman-ready Learner AI request with signature
 * This is the request sent to Coordinator when sending decision maker to Learner AI
 * 
 * Usage:
 *   node backend/scripts/generate-learner-ai-postman-request.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    console.error('Set it as environment variable: PRIVATE_KEY="your-key-here"');
    console.error(`Or create a file: ${privateKeyPath}`);
    process.exit(1);
  }
} else {
  // Normalize escaped newlines
  if (PRIVATE_KEY.includes('\\n')) {
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
  }
}

// Signature generation function
function buildMessage(serviceName, payload) {
  let msg = `educoreai-${serviceName}`;
  if (payload) {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    msg = `${msg}-${hash}`;
  }
  return msg;
}

function generateSignature(serviceName, privateKeyPem, payload) {
  const msg = buildMessage(serviceName, payload);
  const sign = crypto.createSign('SHA256');
  sign.update(msg);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

// Decision Maker data from Lotus Techhub
const COMPANY_ID = 'ba3dff4a-9177-4b74-b77e-6bdd6488de86';
const COMPANY_NAME = 'Lotus techhub';
const APPROVAL_POLICY = 'manual'; // From the company data
const DECISION_MAKER = {
  employee_id: '1061d974-2d2d-46ef-90bd-bfbc19a360ca', // UUID
  employee_name: 'Jasmine Mograby',
  employee_email: 'jasmine.mograby@lotustechhub.com'
};

function generateRequest() {
  // Build request body - matches Learner AI structure
  const payload = {
    action: 'sending_decision_maker_to_approve_learning_path',
    company_id: COMPANY_ID,
    company_name: COMPANY_NAME,
    approval_policy: APPROVAL_POLICY,
    decision_maker: DECISION_MAKER
  };

  const requestBody = {
    requester_service: 'directory-service',
    payload,
    response: {} // Empty response for outgoing requests
  };

  // Generate signature
  const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, requestBody);

  // Output Postman-ready information
  console.log('📋 ===== POSTMAN LEARNER AI REQUEST =====\n');
  console.log('📍 URL:');
  console.log(`POST ${COORDINATOR_URL}/api/fill-content-metrics/\n`);
  console.log('🔑 Headers:');
  console.log(`Content-Type: application/json`);
  console.log(`X-Service-Name: ${SERVICE_NAME}`);
  console.log(`X-Signature: ${signature}\n`);
  console.log('📦 Request Body (JSON):');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n✨ ===== COPY TO POSTMAN =====\n');
  console.log('Method: POST');
  console.log(`URL: ${COORDINATOR_URL}/api/fill-content-metrics/\n`);
  console.log('Headers:');
  console.log(`  Content-Type: application/json`);
  console.log(`  X-Service-Name: ${SERVICE_NAME}`);
  console.log(`  X-Signature: ${signature}\n`);
  console.log('Body (raw JSON):');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n📝 Notes:');
  console.log('  - Action: sending_decision_maker_to_approve_learning_path');
  console.log('  - Company: Lotus techhub');
  console.log('  - Decision Maker: Jasmine Mograby (EMP013)');
  console.log('  - Approval Policy: manual');
  console.log('  - The response field is empty {} for outgoing requests');
}

// Run
generateRequest();

