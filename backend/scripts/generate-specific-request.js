#!/usr/bin/env node
/**
 * Generate specific Postman request with exact employee name
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
  if (PRIVATE_KEY.includes('\\n')) {
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
  }
}

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

// Exact request with your data
const requestBody = {
  "requester_service": "directory-service",
  "payload": {
    "action": "enroll_employees_career_path",
    "learning_flow": "CAREER_PATH_DRIVEN",
    "company_id": "ba3dff4a-9177-4b74-b77e-6bdd6488de86",
    "company_name": "Lotus techhub",
    "learners": [
      {
        "learner_id": "210dc7a7-9808-445c-8eb7-51c217e3919c",
        "learner_name": "Sana Mohanna",
        "preferred_language": "en"
      }
    ]
  },
  "response": {}
};

const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, requestBody);

console.log('\n✅ ===== COMPLETE POSTMAN REQUEST (COPY-PASTE READY) =====\n');
console.log('📍 URL:');
console.log(`${COORDINATOR_URL}/api/fill-content-metrics/\n`);
console.log('🔑 Headers:');
console.log(`Content-Type: application/json`);
console.log(`X-Service-Name: ${SERVICE_NAME}`);
console.log(`X-Signature: ${signature}\n`);
console.log('📦 Request Body:');
console.log(JSON.stringify(requestBody, null, 2));
console.log('\n');

