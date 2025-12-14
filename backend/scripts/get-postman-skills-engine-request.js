#!/usr/bin/env node
/**
 * Generate Postman-ready Skills Engine request
 * This is the request sent to Coordinator → Skills Engine when enriching a profile
 * 
 * Usage:
 *   node backend/scripts/get-postman-skills-engine-request.js
 * 
 * Note: Uses sample data structure. Replace with real employee data from database if needed.
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

// Sample employee data structure (matches what comes from database)
// Replace these with actual values from your database
const sampleEmployee = {
  employee_id: 'EMP001',
  company_id: 'c1d2e3f4-5678-9012-3456-789012345678',
  employee_type: 'regular_employee', // or 'trainer'
  raw_data: {
    linkedin: {
      id: 'linkedin-user-id-123',
      name: 'John Doe',
      given_name: 'John',
      family_name: 'Doe',
      email: 'john.doe@example.com',
      picture: 'https://media.licdn.com/dms/image/...',
      locale: 'en_US',
      headline: 'Senior Software Engineer at TechCorp',
      positions: [
        {
          title: 'Senior Software Engineer',
          companyName: 'TechCorp Inc.',
          description: 'Leading development of scalable web applications...',
          startDate: '2020-01-01',
          endDate: 'Current'
        }
      ]
    },
    github: {
      login: 'johndoe',
      id: 12345678,
      name: 'John Doe',
      email: 'john.doe@example.com',
      bio: 'Full-stack developer passionate about JavaScript, React, Node.js',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      blog: 'https://johndoe.dev',
      public_repos: 25,
      followers: 150,
      following: 80,
      repositories: [
        {
          id: 123456789,
          name: 'awesome-project',
          full_name: 'johndoe/awesome-project',
          description: 'An awesome project built with React and Node.js',
          language: 'JavaScript',
          stargazers_count: 42,
          forks_count: 10,
          created_at: '2023-01-15T10:30:00Z',
          updated_at: '2024-11-19T15:45:00Z'
        }
      ]
    }
  }
};

// Build payload (same structure as MicroserviceClient.getEmployeeSkills)
const payload = {
  action: 'get_employee_skills_for_directory_profile',
  target_service: 'skills-engine',
  employee_id: sampleEmployee.employee_id,
  company_id: sampleEmployee.company_id,
  employee_type: sampleEmployee.employee_type,
  raw_data: sampleEmployee.raw_data
};

// Build response template (same structure as MicroserviceClient.getEmployeeSkills)
const responseTemplate = {
  user_id: 0,
  competencies: [],
  relevance_score: 0,
  gap: {
    missing_skills: []
  }
};

// Build Coordinator envelope (same structure as callMicroservice)
const requestBody = {
  requester_service: 'directory-service',
  payload,
  response: responseTemplate
};

// Generate signature
console.log('\n🔐 Generating digital signature...');
const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, requestBody);
console.log('✅ Signature generated');

// Output Postman-ready information
console.log('\n📋 ===== POSTMAN SKILLS ENGINE REQUEST DETAILS =====\n');
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
console.log('  - This is the request sent when enriching an employee profile');
console.log('  - Action: get_employee_skills_for_directory_profile');
console.log('  - Target Service: skills-engine');
console.log('  - Raw data includes LinkedIn and GitHub JSON from database');
console.log(`  - Employee Type: ${sampleEmployee.employee_type}`);
console.log(`  - Employee ID: ${sampleEmployee.employee_id}`);
console.log(`  - Company ID: ${sampleEmployee.company_id}`);
console.log('\n💡 To use real data from database:');
console.log('  1. Query employees table for employee with linkedin_data or github_data');
console.log('  2. Replace sampleEmployee values with actual database values');
console.log('  3. Run this script again to generate new signature');
