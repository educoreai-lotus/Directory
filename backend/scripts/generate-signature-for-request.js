#!/usr/bin/env node
/**
 * Generate signature for a specific request body
 * Usage: node backend/scripts/generate-signature-for-request.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load configuration
const SERVICE_NAME = process.env.SERVICE_NAME || 'directory-service';

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
        "learner_id": "98765432-10fe-dcba-9876-543210fedcba",
        "learner_name": "Katy ff",
        "preferred_language": "en"
      }
    ]
  },
  "response": {}
};

// Generate signature
const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, requestBody);

// Output
console.log('📋 ===== COURSE BUILDER ENROLLMENT REQUEST =====\n');
console.log('🔑 Signature:');
console.log(signature);
console.log('\n📦 Complete Request (with signature):\n');
console.log('Headers:');
console.log('  Content-Type: application/json');
console.log(`  X-Service-Name: ${SERVICE_NAME}`);
console.log(`  X-Signature: ${signature}\n`);
console.log('Body:');
console.log(JSON.stringify(requestBody, null, 2));
console.log('\n✨ Copy to Postman:\n');
console.log('URL: POST https://coordinator-production-6004.up.railway.app/api/fill-content-metrics/\n');
console.log('Headers (JSON):');
console.log(JSON.stringify({
  "Content-Type": "application/json",
  "X-Service-Name": SERVICE_NAME,
  "X-Signature": signature
}, null, 2));
console.log('\nBody (JSON):');
console.log(JSON.stringify(requestBody, null, 2));

