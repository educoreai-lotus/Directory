#!/usr/bin/env node
/**
 * Test script to send Skills Engine request via Coordinator
 * Shows exactly what is sent and what response is received
 * 
 * Usage: 
 *   node backend/scripts/test-skills-engine-request.js
 * 
 * Environment variables:
 *   - COORDINATOR_URL (default: https://coordinator-production-6004.up.railway.app)
 *   - PRIVATE_KEY (required for signature)
 *   - SERVICE_NAME (default: directory-service)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Use built-in fetch (Node 18+)
let fetch;
try {
  if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
  } else {
    fetch = require('node-fetch');
  }
} catch (e) {
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
          res.status = res.statusCode;
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

// Load private key
let PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  const privateKeyPath = path.join(__dirname, '..', 'src', 'security', 'directory-private-key.pem');
  if (fs.existsSync(privateKeyPath)) {
    PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
    console.log('✅ Loaded PRIVATE_KEY from file');
  } else {
    console.error('❌ PRIVATE_KEY not found!');
    console.error('Set it as environment variable: PRIVATE_KEY="your-key-here"');
    process.exit(1);
  }
} else {
  if (PRIVATE_KEY.includes('\\n')) {
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
  }
}

const SERVICE_NAME = process.env.SERVICE_NAME || 'directory-service';
const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-6004.up.railway.app';

// Signature generation
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

// Example employee data (UPDATE THESE VALUES)
const employeeData = {
  user_id: 'YOUR_EMPLOYEE_UUID_HERE', // Employee UUID from database
  user_name: 'Jasmine Mograby',
  company_id: 'YOUR_COMPANY_UUID_HERE', // Company UUID from database
  company_name: 'Lotus techhub',
  employee_type: 'regular', // 'regular' or 'trainer'
  path_career: 'Training & Development Director', // target_role_in_company
  preferred_language: 'en', // 'en', 'ar', etc.
  raw_data: {
    linkedin: {
      // Add LinkedIn data here (or leave empty object)
    },
    github: {
      // Add GitHub data here (or leave empty object)
    }
  }
};

async function testSkillsEngineRequest() {
  console.log('\n🧪 ===== TESTING SKILLS ENGINE REQUEST =====\n');
  console.log('📋 Employee Data:');
  console.log(`   UUID: ${employeeData.user_id}`);
  console.log(`   Name: ${employeeData.user_name}`);
  console.log(`   Company: ${employeeData.company_name}`);
  console.log(`   Type: ${employeeData.employee_type}`);
  console.log(`   Target Role: ${employeeData.path_career}`);
  console.log(`   Preferred Language: ${employeeData.preferred_language}`);
  console.log(`   LinkedIn data: ${Object.keys(employeeData.raw_data.linkedin).length} keys`);
  console.log(`   GitHub data: ${Object.keys(employeeData.raw_data.github).length} keys`);

  // Build payload
  const payload = {
    user_id: employeeData.user_id,
    user_name: employeeData.user_name,
    company_id: employeeData.company_id,
    company_name: employeeData.company_name,
    employee_type: employeeData.employee_type,
    path_career: employeeData.path_career || null,
    preferred_language: employeeData.preferred_language,
    raw_data: employeeData.raw_data
  };

  // Build Coordinator envelope
  const envelope = {
    requester_service: SERVICE_NAME,
    payload: {
      action: 'get_employee_skills_for_directory_profile',
      target_service: 'skills-engine-service',
      ...payload
    },
    response: {
      user_id: null,
      competencies: [],
      relevance_score: 0
    }
  };

  console.log('\n📦 Request Envelope:');
  console.log(JSON.stringify(envelope, null, 2));

  // Generate signature
  console.log('\n🔐 Generating digital signature...');
  const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, envelope);
  console.log('✅ Signature generated');

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'X-Service-Name': SERVICE_NAME,
    'X-Signature': signature
  };

  // Send request
  const url = `${COORDINATOR_URL}/api/fill-content-metrics/`;
  console.log('\n🚀 Sending POST request to Coordinator...');
  console.log(`   URL: ${url}`);
  console.log(`   Action: ${envelope.payload.action}`);
  console.log(`   Target Service: ${envelope.payload.target_service}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope)
    });

    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);
    console.log('📥 Response Headers:');
    console.log(JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    const responseData = await response.json();
    console.log('\n📥 Response Body:');
    console.log(JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.success !== false) {
      console.log('\n✅ SUCCESS! Skills Engine processed the request');
      const skills = responseData.data?.response || responseData.response || responseData.data || responseData;
      if (skills.competencies) {
        console.log(`\n📊 Skills Data:`);
        console.log(`   Competencies: ${skills.competencies.length || 0}`);
        console.log(`   Relevance Score: ${skills.relevance_score || 0}`);
        if (skills.competencies.length > 0) {
          console.log(`\n   First Competency: ${skills.competencies[0].name || 'N/A'}`);
        }
      }
    } else {
      console.log('\n❌ ERROR: Request failed');
      console.log(`   Message: ${responseData.message || responseData.error || 'Unknown error'}`);
    }

    // Generate Postman template
    console.log('\n\n📋 ===== POSTMAN TEMPLATE =====\n');
    console.log('Method: POST');
    console.log(`URL: ${url}\n`);
    console.log('Headers:');
    console.log(JSON.stringify({
      'Content-Type': 'application/json',
      'X-Service-Name': SERVICE_NAME,
      'X-Signature': signature
    }, null, 2));
    console.log('\nBody (raw JSON):');
    console.log(JSON.stringify(envelope, null, 2));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
if (require.main === module) {
  testSkillsEngineRequest().catch(console.error);
}

module.exports = { testSkillsEngineRequest };

