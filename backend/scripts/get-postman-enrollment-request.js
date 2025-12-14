#!/usr/bin/env node
/**
 * Generate Postman-ready enrollment request details (body + signature)
 * This is the request sent to Coordinator when enrolling employees to courses
 * 
 * Usage:
 *   node backend/scripts/get-postman-enrollment-request.js
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

// Sample enrollment request - matches the structure from EnrollEmployeesCareerPathUseCase
// This is what gets sent to Coordinator when you press "Enroll to Courses"
const requestBody = {
  "requester_service": "directory-service",
  "payload": {
    "action": "course_builder_enroll_career_path",
    "learning_flow": "CAREER_PATH_DRIVEN",
    "company_id": "c1d2e3f4-5678-9012-3456-789012345678",
    "company_name": "TechCorp Inc.",
    "learners": [
      {
        "learner_id": "123e4567-e89b-12d3-a456-426614174000",
        "learner_name": "Sarah Johnson",
        "company_id": "c1d2e3f4-5678-9012-3456-789012345678",
        "learning_flow_tag": "CAREER_PATH_DRIVEN",
        "preferred_language": "en"
      },
      {
        "learner_id": "223e4567-e89b-12d3-a456-426614174001",
        "learner_name": "John Doe",
        "company_id": "c1d2e3f4-5678-9012-3456-789012345678",
        "learning_flow_tag": "CAREER_PATH_DRIVEN",
        "preferred_language": "en"
      }
    ]
  },
  "response": {
    "success": false,
    "message": "",
    "enrollment_batch_id": "",
    "failed_employee_ids": []
  }
};

// Generate signature
const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, requestBody);

// Output Postman-ready information
console.log('\n📋 ===== POSTMAN ENROLLMENT REQUEST DETAILS =====\n');
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
console.log('\n📝 Notes:');
console.log('  - This is the request sent when enrolling employees to courses');
console.log('  - Action: course_builder_enroll_career_path');
console.log('  - Each learner must have exactly 5 fields:');
console.log('    1. learner_id (UUID)');
console.log('    2. learner_name (string)');
console.log('    3. company_id (UUID)');
console.log('    4. learning_flow_tag (always "CAREER_PATH_DRIVEN")');
console.log('    5. preferred_language (string or null)');
console.log('  - The response template is required by Coordinator');

