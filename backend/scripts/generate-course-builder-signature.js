#!/usr/bin/env node
/**
 * Generate Postman-ready Course Builder enrollment request with signature
 * 
 * Usage:
 *   node backend/scripts/generate-course-builder-signature.js
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
    console.log('✅ Loaded PRIVATE_KEY from file:', privateKeyPath);
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
  console.log('✅ PRIVATE_KEY loaded from environment variable');
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

// Request body from user
const requestBody = {
  "requester_service": "directory-service",
  "payload": {
    "action": "enroll_employees_career_path",
    "learning_flow": "CAREER_PATH_DRIVEN",
    "company_id": "ba3dff4a-9177-4b74-b77e-6bdd6488de86",
    "company_name": "Lotus techhub",
    "learners": [
      {
        "learner_id": "b2c3d4e5-f6a7-8901-2345-678901234567",
        "learner_name": "Sara Neer",
        "preferred_language": "en"
      }
    ]
  },
  "response": {}
};

// Generate signature
console.log('\n🔐 Generating digital signature...');
const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, requestBody);
console.log('✅ Signature generated successfully!\n');

// Output Postman-ready information
console.log('✅ ===== COMPLETE POSTMAN REQUEST (COPY-PASTE READY) =====\n');
console.log('📍 URL:');
console.log(`POST ${COORDINATOR_URL}/api/fill-content-metrics/\n`);
console.log('🔑 Headers:');
console.log(`Content-Type: application/json`);
console.log(`X-Service-Name: ${SERVICE_NAME}`);
console.log(`X-Signature: ${signature}\n`);
console.log('📦 Request Body:');
console.log(JSON.stringify(requestBody, null, 2));
console.log('\n');


