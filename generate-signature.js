// Script to generate signature for Postman testing
// Usage: node generate-signature.js

const crypto = require('crypto');
const fs = require('fs');

// Your request body
const requestBody = {
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

// Service name from your request
const SERVICE_NAME = "directory";

// Get PRIVATE_KEY from environment variable or file
const PRIVATE_KEY = process.env.PRIVATE_KEY || (() => {
  try {
    // Try to read from file if exists
    if (fs.existsSync('./private-key.pem')) {
      return fs.readFileSync('./private-key.pem', 'utf8');
    }
  } catch (e) {
    // Ignore
  }
  return null;
})();

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found!');
  console.error('Set it as environment variable: PRIVATE_KEY="your-key-here"');
  console.error('Or create a file: private-key.pem');
  process.exit(1);
}

// Normalize PRIVATE_KEY (handle escaped newlines)
let normalizedPrivateKey = PRIVATE_KEY;
if (normalizedPrivateKey.includes('\\n')) {
  normalizedPrivateKey = normalizedPrivateKey.replace(/\\n/g, '\n');
}

// Build message: educoreai-{serviceName}-{sha256(JSON.stringify(payload))}
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

// Generate signature
function generateSignature(serviceName, privateKeyPem, payload) {
  const msg = buildMessage(serviceName, payload);
  const sign = crypto.createSign('SHA256');
  sign.update(msg);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

try {
  const signature = generateSignature(SERVICE_NAME, normalizedPrivateKey, requestBody);
  
  console.log('\n✅ Signature generated successfully!\n');
  console.log('📋 Postman Headers:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('X-Service-Name: directory');
  console.log(`X-Signature: ${signature}`);
  console.log('Content-Type: application/json');
  console.log('─────────────────────────────────────────────────────────\n');
  
  console.log('📤 Request URL:');
  console.log('POST https://coordinator-production-6004.up.railway.app/api/fill-content-metrics/\n');
  
  console.log('📦 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n');
  
} catch (error) {
  console.error('❌ Error generating signature:', error.message);
  console.error(error.stack);
  process.exit(1);
}

