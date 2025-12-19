#!/usr/bin/env node
/**
 * Direct test script to send Skills Engine request to Coordinator
 * Accepts employee UUID as command line argument
 * 
 * Usage:
 *   node backend/scripts/test-skills-engine-direct.js <employee_uuid>
 * 
 * Or provide all details manually:
 *   node backend/scripts/test-skills-engine-direct.js <employee_uuid> <employee_name> <company_id> <company_name> <employee_type> <target_role>
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

async function sendSkillsEngineRequest(employeeData) {
  const {
    user_id,
    user_name,
    company_id,
    company_name,
    employee_type,
    path_career,
    raw_data
  } = employeeData;

  console.log('\n🧪 ===== SENDING SKILLS ENGINE REQUEST =====\n');
  console.log('📋 Employee Data:');
  console.log(`   UUID: ${user_id}`);
  console.log(`   Name: ${user_name}`);
  console.log(`   Company: ${company_name}`);
  console.log(`   Type: ${employee_type}`);
  console.log(`   Target Role: ${path_career || 'N/A'}`);
  console.log(`   LinkedIn data: ${raw_data?.linkedin ? 'Yes' : 'No'}`);
  console.log(`   GitHub data: ${raw_data?.github ? 'Yes' : 'No'}`);

  // Build payload
  const payload = {
    user_id,
    user_name,
    company_id,
    company_name,
    employee_type,
    path_career: path_career || null,
    raw_data: raw_data || { linkedin: {}, github: {} }
  };

  // Build Coordinator envelope
  const envelope = {
    requester_service: SERVICE_NAME,
    payload: {
      action: 'get_employee_skills_for_directory_profile',
      target_service: 'skills-engine',
      ...payload
    },
    response: {
      user_id: null,
      competencies: [],
      relevance_score: 0
    }
  };

  console.log('\n📦 Request Payload:');
  console.log(JSON.stringify(payload, null, 2));

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

    console.log('\n📥 Response received:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   OK: ${response.ok}`);

    let responseData;
    try {
      responseData = await response.json();
      console.log('\n📋 Response Body:');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (jsonError) {
      const textResponse = await response.text();
      console.log('\n📋 Response Body (text):');
      console.log(textResponse.substring(0, 1000));
    }

    if (response.ok) {
      console.log('\n✅ ✅ ✅ REQUEST SUCCESSFUL! ✅ ✅ ✅');
      console.log('   Coordinator accepted the request and routed to Skills Engine');
    } else {
      console.log('\n⚠️  Request returned non-OK status');
    }

    console.log('\n✨ ===== TEST COMPLETE =====\n');
  } catch (error) {
    console.error('\n❌ ❌ ❌ REQUEST FAILED ❌ ❌ ❌');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node test-skills-engine-direct.js <employee_uuid> [employee_name] [company_id] [company_name] [employee_type] [target_role]');
  console.error('\nExample:');
  console.error('  node test-skills-engine-direct.js 210dc7a7-9808-445c-8eb7-51c217e3919c "Sally Hamdan" ba3dff4a-9177-4b74-b77e-6bdd6488de86 "Lotus techhub" regular_employee "HR Specialist"');
  process.exit(1);
}

// Try to fetch employee data from backend API if URL provided
const DIRECTORY_URL = process.env.DIRECTORY_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'https://directory-production-addc.up.railway.app';

async function fetchEmployeeData(employeeUuid) {
  try {
    console.log(`\n🔍 Fetching employee data from Directory API...`);
    console.log(`   URL: ${DIRECTORY_URL}/api/v1/employees/${employeeUuid}`);
    
    const response = await fetch(`${DIRECTORY_URL}/api/v1/employees/${employeeUuid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.AUTH_TOKEN || 'dummy-token'}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const employee = data.response || data;
      
      console.log(`✅ Found employee: ${employee.full_name} (${employee.email})`);
      
      // Parse raw data
      let linkedinData = {};
      let githubData = {};
      
      if (employee.linkedin_data) {
        try {
          linkedinData = typeof employee.linkedin_data === 'string' 
            ? JSON.parse(employee.linkedin_data) 
            : employee.linkedin_data;
        } catch (e) {
          console.warn(`⚠️  Failed to parse LinkedIn data`);
        }
      }
      
      if (employee.github_data) {
        try {
          githubData = typeof employee.github_data === 'string'
            ? JSON.parse(employee.github_data)
            : employee.github_data;
        } catch (e) {
          console.warn(`⚠️  Failed to parse GitHub data`);
        }
      }
      
      // Get company data
      const companyResponse = await fetch(`${DIRECTORY_URL}/api/v1/companies/${employee.company_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.AUTH_TOKEN || 'dummy-token'}`,
          'Content-Type': 'application/json'
        }
      });
      
      let companyName = 'Unknown Company';
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        companyName = (companyData.response || companyData).company_name || companyName;
      }
      
      // Get roles to determine employee type
      const rolesResponse = await fetch(`${DIRECTORY_URL}/api/v1/employees/${employeeUuid}/roles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.AUTH_TOKEN || 'dummy-token'}`,
          'Content-Type': 'application/json'
        }
      });
      
      let employeeType = 'regular_employee';
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        const roles = rolesData.response || rolesData;
        if (Array.isArray(roles) && roles.some(r => r.role_type === 'TRAINER')) {
          employeeType = 'trainer';
        }
      }
      
      return {
        user_id: employee.id,
        user_name: employee.full_name,
        company_id: employee.company_id.toString(),
        company_name: companyName,
        employee_type: employeeType,
        path_career: employee.target_role_in_company || null,
        raw_data: {
          linkedin: linkedinData || {},
          github: githubData || {}
        }
      };
    } else {
      console.warn(`⚠️  Could not fetch from API (status ${response.status}), using provided data`);
      return null;
    }
  } catch (error) {
    console.warn(`⚠️  Could not fetch from API: ${error.message}, using provided data`);
    return null;
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node test-skills-engine-direct.js <employee_uuid>');
  console.error('\nExample:');
  console.error('  node test-skills-engine-direct.js 210dc7a7-9808-445c-8eb7-51c217e3919c');
  process.exit(1);
}

const employeeUuid = args[0];

// Try to fetch from API, fallback to minimal data
fetchEmployeeData(employeeUuid).then(employeeData => {
  if (!employeeData) {
    // Fallback to minimal data
    console.log('⚠️  Using minimal test data. Provide full employee details for complete test.');
    employeeData = {
      user_id: employeeUuid,
      user_name: args[1] || 'Sally Hamdan',
      company_id: args[2] || 'ba3dff4a-9177-4b74-b77e-6bdd6488de86',
      company_name: args[3] || 'Lotus techhub',
      employee_type: args[4] || 'regular_employee',
      path_career: args[5] || null,
      raw_data: {
        linkedin: {},
        github: {}
      }
    };
  }
  
  return sendSkillsEngineRequest(employeeData);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

