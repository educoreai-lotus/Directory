#!/usr/bin/env node
/**
 * Generate Postman-ready Course Builder enrollment request with signature
 * This is the request sent to Coordinator when enrolling employees to courses
 * 
 * Usage:
 *   node backend/scripts/generate-course-builder-postman-request.js
 * 
 * You can modify the company_id and learner IDs in the script or pass them as arguments
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

// You can modify these values or pass them as command line arguments
// Format: node script.js <company_id> <learner_id_1> <learner_id_2> ...
const args = process.argv.slice(2);

// Default values - REPLACE THESE WITH YOUR ACTUAL IDs FROM DATABASE
const DEFAULT_COMPANY_ID = args[0] || 'REPLACE_WITH_YOUR_COMPANY_UUID';
const DEFAULT_COMPANY_NAME = args[1] || 'TechCorp Global';
const DEFAULT_LEARNERS = args.slice(2).length > 0 
  ? args.slice(2).map((id, idx) => ({
      learner_id: id,
      learner_name: `Employee ${idx + 1}`,
      preferred_language: 'en'
    }))
  : [
      {
        learner_id: 'REPLACE_WITH_EMPLOYEE_UUID_1',
        learner_name: 'Jennifer Martinez',
        preferred_language: 'en'
      },
      {
        learner_id: 'REPLACE_WITH_EMPLOYEE_UUID_2',
        learner_name: 'Michael Chen',
        preferred_language: 'en'
      }
    ];

function generateRequest() {
  // Build request body - matches EnrollEmployeesCareerPathUseCase structure
  const payload = {
    action: 'enroll_employees_career_path',
    learning_flow: 'CAREER_PATH_DRIVEN',
    company_id: DEFAULT_COMPANY_ID,
    company_name: DEFAULT_COMPANY_NAME,
    learners: DEFAULT_LEARNERS
  };

  const requestBody = {
    requester_service: 'directory-service',
    payload,
    response: {} // Empty response for outgoing requests
  };

  // Generate signature
  const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, requestBody);

  // Output Postman-ready information
  console.log('📋 ===== POSTMAN COURSE BUILDER ENROLLMENT REQUEST =====\n');
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
  console.log('  - Action: enroll_employees_career_path');
  console.log('  - Learning Flow: CAREER_PATH_DRIVEN');
  console.log('  - Each learner has 3 fields:');
  console.log('    1. learner_id (UUID)');
  console.log('    2. learner_name (string)');
  console.log('    3. preferred_language (string)');
  console.log('  - company_id and learning_flow are at payload level, not in learners array');
  console.log('  - The response field is empty {} for outgoing requests');
  console.log('\n⚠️  IMPORTANT: Replace the placeholder UUIDs with your actual company and employee IDs!');
  console.log('   You can find these in your Supabase database:\n');
  console.log('   SELECT id, company_name FROM companies WHERE company_name = \'TechCorp Global\';');
  console.log('   SELECT id, full_name, email FROM employees WHERE company_id = \'<company_id>\' AND status = \'active\';\n');
}

generateRequest();

