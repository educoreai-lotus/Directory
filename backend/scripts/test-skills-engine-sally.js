#!/usr/bin/env node
/**
 * Test script to send a POST request to Coordinator for Skills Engine microservice
 * Fetches real employee data (Sally Hamdan) from database and sends to Skills Engine
 * 
 * Usage:
 *   node backend/scripts/test-skills-engine-sally.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load configuration and database connection
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // dotenv not available, use environment variables directly
}
const EmployeeRepository = require('../src/infrastructure/EmployeeRepository');
const CompanyRepository = require('../src/infrastructure/CompanyRepository');

// Use built-in fetch (Node 18+) or require node-fetch if available
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
    console.log('✅ Loaded PRIVATE_KEY from file:', privateKeyPath);
  } else {
    console.error('❌ PRIVATE_KEY not found!');
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

async function testSkillsEngineRequest() {
  console.log('\n🧪 ===== TESTING SKILLS ENGINE REQUEST (Sally Hamdan) =====\n');

  const employeeRepository = new EmployeeRepository();
  const companyRepository = new CompanyRepository();

  try {
    // Find Sally Hamdan by email or name
    const searchQuery = `
      SELECT id FROM employees 
      WHERE LOWER(email) LIKE '%sally%hamdan%' 
         OR LOWER(full_name) LIKE '%sally%hamdan%'
      LIMIT 1
    `;
    
    console.log('🔍 Searching for Sally Hamdan in database...');
    const searchResult = await employeeRepository.pool.query(searchQuery);
    
    let employee;
    
    if (searchResult.rows.length === 0) {
      console.error('❌ Sally Hamdan not found in database!');
      console.log('💡 Trying to find any employee with enriched profile...');
      
      // Fallback: find any employee with LinkedIn or GitHub data
      const fallbackQuery = `
        SELECT id FROM employees
        WHERE (linkedin_data IS NOT NULL OR github_data IS NOT NULL)
          AND enrichment_completed = true
        LIMIT 1
      `;
      
      const fallbackResult = await employeeRepository.pool.query(fallbackQuery);
      if (fallbackResult.rows.length === 0) {
        console.error('❌ No employees with enriched profiles found!');
        process.exit(1);
      }
      
      employee = await employeeRepository.findById(fallbackResult.rows[0].id);
      console.log(`✅ Found employee: ${employee.full_name} (${employee.email})`);
    } else {
      employee = await employeeRepository.findById(searchResult.rows[0].id);
      console.log(`✅ Found: ${employee.full_name} (${employee.email})`);
      console.log(`   Employee UUID: ${employee.id}`);
    }
    
    // Get company
    const company = await companyRepository.findById(employee.company_id);
    if (!company) {
      console.error('❌ Company not found!');
      process.exit(1);
    }
    
    console.log(`   Company: ${company.company_name}`);
    await sendRequest(employee, company, employeeRepository);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function sendRequest(employee, company, employeeRepository) {
  try {
    // Get employee roles to determine type
    const rolesQuery = 'SELECT role_type FROM employee_roles WHERE employee_id = $1';
    const rolesResult = await employeeRepository.pool.query(rolesQuery, [employee.id]);
    const roles = rolesResult.rows.map(row => row.role_type);
    const isTrainer = roles.includes('TRAINER');
    const employeeType = isTrainer ? 'trainer' : 'regular_employee';
    
    console.log(`\n📋 Employee Details:`);
    console.log(`   UUID: ${employee.id}`);
    console.log(`   Name: ${employee.full_name}`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   Company: ${company.company_name}`);
    console.log(`   Current Role: ${employee.current_role_in_company}`);
    console.log(`   Target Role: ${employee.target_role_in_company}`);
    console.log(`   Employee Type: ${employeeType}`);
    console.log(`   Roles: ${roles.join(', ') || 'none'}`);

    // Parse raw data
    let linkedinData = {};
    let githubData = {};
    
    if (employee.linkedin_data) {
      try {
        linkedinData = typeof employee.linkedin_data === 'string' 
          ? JSON.parse(employee.linkedin_data) 
          : employee.linkedin_data;
        console.log(`\n✅ LinkedIn data found (${Object.keys(linkedinData).length} keys)`);
      } catch (e) {
        console.warn(`⚠️  Failed to parse LinkedIn data: ${e.message}`);
      }
    } else {
      console.log(`\n⚠️  No LinkedIn data found`);
    }
    
    if (employee.github_data) {
      try {
        githubData = typeof employee.github_data === 'string'
          ? JSON.parse(employee.github_data)
          : employee.github_data;
        console.log(`✅ GitHub data found (${Object.keys(githubData).length} keys)`);
        if (githubData.repositories) {
          console.log(`   Repositories: ${githubData.repositories.length}`);
        }
      } catch (e) {
        console.warn(`⚠️  Failed to parse GitHub data: ${e.message}`);
      }
    } else {
      console.log(`⚠️  No GitHub data found`);
    }

    // Build payload (matching MicroserviceClient.getEmployeeSkills structure)
    const payload = {
      user_id: employee.id, // UUID, not employee_id from CSV
      user_name: employee.full_name,
      company_id: employee.company_id.toString(),
      company_name: company.company_name,
      employee_type: employeeType,
      path_career: employee.target_role_in_company || null,
      raw_data: {
        linkedin: linkedinData || {},
        github: githubData || {}
      }
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

// Run the test
testSkillsEngineRequest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

