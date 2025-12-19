#!/usr/bin/env node
/**
 * Test script to send Skills Engine request for Sally Hamdan
 * Uses provided employee and company data
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
    console.log('✅ Loaded PRIVATE_KEY from file');
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

// Sally Hamdan's data
const sallyData = {
  user_id: '959249d3-0cbe-4814-be9c-c38d0223fd6d', // UUID from database
  user_name: 'Sally Hamdan',
  company_id: 'ba3dff4a-9177-4b74-b77e-6bdd6488de86',
  company_name: 'Lotus techhub',
  employee_type: 'regular', // Skills Engine expects "regular" or "trainer" (not "regular_employee")
  path_career: 'Senior Software Engineer', // target_role_in_company
  raw_data: {
    linkedin: {
      "id": "BzFZ2lrEDv",
      "name": "Jasmine Mograby",
      "email": "jasmine.mograby@gmail.com",
      "locale": {
        "country": "US",
        "language": "en"
      },
      "picture": "https://media.licdn.com/dms/image/v2/D4D03AQHMGOHeMdeFgA/profile-displayphoto-scale_200_200/B4DZqcTcp9GwAY-/0/1763558935871?e=1767225600&v=beta&t=8ZmiIRXzXjOGLIRqbQD9_Ucgui6xnlRl6w5DPqa-3Ko",
      "headline": null,
      "fetched_at": "2025-12-16T11:07:01.481Z",
      "given_name": "Jasmine",
      "family_name": "Mograby",
      "access_token": "AQUmmMUF6Hd1Ap4LCscZqJkp-GzB5F_dY8oPDGdqt1S0i-HnTs6xAiQ2q3AfZPS1-LG4LO9rESgjKoAITnk_xWSSfa8gM_lxTymAJTQ94xrW9OLmwxP2m1OJjSY864mW4a2Whf2NER1-iox159WHd_8FkkUQzsK18bPzOaE8F6y7D8zD5UwBRMvLuYVSTPsxfrm1erc7PW5gaxUZmVg_PyN84NB1DYjkjcd4od-B2bzg-TbfZhNccZ7X5Ar_TDQOignS-7gqKjW-cEgm0DRjfpFMDm3BQZTHQnxrJkoWjPIBHMfRs1WjUZtoJq1j13oSk2R-8CQfEX6vhWApEK0fFMB5WKTayw",
      "connected_at": "2025-12-16T11:07:01.481Z",
      "refresh_token": null,
      "email_verified": true,
      "token_expires_at": "2026-02-14T11:07:00.481Z"
    },
    github: {
      "id": 247459414,
      "bio": null,
      "blog": "",
      "name": null,
      "email": "educore.ai@lotushub.net",
      "login": "educoreai-lotus",
      "scope": "read:user,repo,user:email",
      "company": null,
      "location": null,
      "followers": 0,
      "following": 0,
      "avatar_url": "https://avatars.githubusercontent.com/u/247459414?v=4",
      "created_at": "2025-12-02T20:12:32Z",
      "fetched_at": "2025-12-16T11:06:38.457Z",
      "token_type": "bearer",
      "updated_at": "2025-12-12T09:57:54Z",
      "access_token": "gho_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "connected_at": "2025-12-16T11:06:38.457Z",
      "public_repos": 8,
      "repositories": [
        {
          "id": 1108711982,
          "url": "https://github.com/educoreai-lotus/LearningAnalytics",
          "name": "LearningAnalytics",
          "forks": 0,
          "stars": 0,
          "topics": [],
          "is_fork": false,
          "language": "JavaScript",
          "clone_url": "https://github.com/educoreai-lotus/LearningAnalytics.git",
          "full_name": "educoreai-lotus/LearningAnalytics",
          "pushed_at": "2025-12-16T11:06:07Z",
          "created_at": "2025-12-02T20:17:32Z",
          "is_private": true,
          "updated_at": "2025-12-16T11:06:11Z",
          "description": null,
          "languages_url": "https://api.github.com/repos/educoreai-lotus/LearningAnalytics/languages",
          "commit_history": {
            "commit_frequency": "active",
            "last_commit_date": "2025-12-16T11:05:57.000Z",
            "commit_messages_sample": [
              {
                "date": "2025-12-16T11:05:57Z",
                "message": "Add ALL JSONB field mappings to ensure complete coverage - Add JSONB fields: primary_hr_contact, app"
              }
            ],
            "days_since_last_commit": 0,
            "total_commits_analyzed": 10
          },
          "default_branch": "main"
        },
        {
          "id": 1108711470,
          "url": "https://github.com/educoreai-lotus/Assessment",
          "name": "Assessment",
          "forks": 0,
          "stars": 0,
          "topics": [],
          "is_fork": false,
          "language": "JavaScript",
          "clone_url": "https://github.com/educoreai-lotus/Assessment.git",
          "full_name": "educoreai-lotus/Assessment",
          "pushed_at": "2025-12-16T11:05:24Z",
          "created_at": "2025-12-02T20:16:24Z",
          "is_private": false,
          "updated_at": "2025-12-16T11:05:29Z",
          "description": null,
          "languages_url": "https://api.github.com/repos/educoreai-lotus/Assessment/languages",
          "commit_history": {
            "commit_frequency": "active",
            "last_commit_date": "2025-12-16T11:04:56.000Z",
            "commit_messages_sample": [
              {
                "date": "2025-12-16T11:04:56Z",
                "message": "chore(integrations): include both target_service and targetService in envelope for Coordinator routi"
              }
            ],
            "days_since_last_commit": 0,
            "total_commits_analyzed": 10
          },
          "default_branch": "main"
        },
        {
          "id": 1108712572,
          "url": "https://github.com/educoreai-lotus/RAG",
          "name": "RAG",
          "forks": 0,
          "stars": 0,
          "topics": [],
          "is_fork": false,
          "language": "JavaScript",
          "clone_url": "https://github.com/educoreai-lotus/RAG.git",
          "full_name": "educoreai-lotus/RAG",
          "pushed_at": "2025-12-16T11:04:03Z",
          "created_at": "2025-12-02T20:18:44Z",
          "is_private": true,
          "updated_at": "2025-12-16T11:04:07Z",
          "description": null,
          "languages_url": "https://api.github.com/repos/educoreai-lotus/RAG/languages",
          "commit_history": {
            "commit_frequency": "active",
            "last_commit_date": "2025-12-16T11:03:50.000Z",
            "commit_messages_sample": [
              {
                "date": "2025-12-16T11:03:50Z",
                "message": "Fix: Remove duplicate 'origin' declaration causing syntax error"
              }
            ],
            "days_since_last_commit": 0,
            "total_commits_analyzed": 10
          },
          "default_branch": "main"
        },
        {
          "id": 1108711303,
          "url": "https://github.com/educoreai-lotus/SkillsEngine",
          "name": "SkillsEngine",
          "forks": 0,
          "stars": 0,
          "topics": [],
          "is_fork": false,
          "language": "JavaScript",
          "clone_url": "https://github.com/educoreai-lotus/SkillsEngine.git",
          "full_name": "educoreai-lotus/SkillsEngine",
          "pushed_at": "2025-12-16T10:46:55Z",
          "created_at": "2025-12-02T20:16:03Z",
          "is_private": false,
          "updated_at": "2025-12-16T10:47:00Z",
          "description": null,
          "languages_url": "https://api.github.com/repos/educoreai-lotus/SkillsEngine/languages",
          "commit_history": {
            "commit_frequency": "active",
            "last_commit_date": "2025-12-16T10:46:39.000Z",
            "commit_messages_sample": [
              {
                "date": "2025-12-16T10:46:39Z",
                "message": "feat: scope broad gap analysis to career path competencies only"
              }
            ],
            "days_since_last_commit": 0,
            "total_commits_analyzed": 10
          },
          "default_branch": "main"
        },
        {
          "id": 1108712383,
          "url": "https://github.com/educoreai-lotus/DevLab",
          "name": "DevLab",
          "forks": 0,
          "stars": 0,
          "topics": [],
          "is_fork": false,
          "language": "JavaScript",
          "clone_url": "https://github.com/educoreai-lotus/DevLab.git",
          "full_name": "educoreai-lotus/DevLab",
          "pushed_at": "2025-12-16T09:12:16Z",
          "created_at": "2025-12-02T20:18:22Z",
          "is_private": false,
          "updated_at": "2025-12-16T09:12:20Z",
          "description": null,
          "languages_url": "https://api.github.com/repos/educoreai-lotus/DevLab/languages",
          "commit_history": {
            "commit_frequency": "active",
            "last_commit_date": "2025-12-16T09:11:38.000Z",
            "commit_messages_sample": [
              {
                "date": "2025-12-16T09:11:38Z",
                "message": "Add AI Thinking avatar animation to CompetitionPlay - time-based cosmetic animation"
              }
            ],
            "days_since_last_commit": 0,
            "total_commits_analyzed": 10
          },
          "default_branch": "main"
        },
        {
          "id": 1108710669,
          "url": "https://github.com/educoreai-lotus/ContentStudio",
          "name": "ContentStudio",
          "forks": 0,
          "stars": 0,
          "topics": [],
          "is_fork": false,
          "language": "JavaScript",
          "clone_url": "https://github.com/educoreai-lotus/ContentStudio.git",
          "full_name": "educoreai-lotus/ContentStudio",
          "pushed_at": "2025-12-16T07:07:53Z",
          "created_at": "2025-12-02T20:14:46Z",
          "is_private": false,
          "updated_at": "2025-12-16T07:07:57Z",
          "description": null,
          "languages_url": "https://api.github.com/repos/educoreai-lotus/ContentStudio/languages",
          "commit_history": {
            "commit_frequency": "active",
            "last_commit_date": "2025-12-16T07:07:09.000Z",
            "commit_messages_sample": [
              {
                "date": "2025-12-16T07:07:09Z",
                "message": "Add logging for image variable structure to debug name field issue"
              }
            ],
            "days_since_last_commit": 0,
            "total_commits_analyzed": 10
          },
          "default_branch": "main"
        },
        {
          "id": 1108711788,
          "url": "https://github.com/educoreai-lotus/LearnerAI",
          "name": "LearnerAI",
          "forks": 0,
          "stars": 0,
          "topics": [],
          "is_fork": false,
          "language": "JavaScript",
          "clone_url": "https://github.com/educoreai-lotus/LearnerAI.git",
          "full_name": "educoreai-lotus/LearnerAI",
          "pushed_at": "2025-12-16T00:15:56Z",
          "created_at": "2025-12-02T20:17:08Z",
          "is_private": false,
          "updated_at": "2025-12-16T00:15:59Z",
          "description": null,
          "languages_url": "https://api.github.com/repos/educoreai-lotus/LearnerAI/languages",
          "commit_history": {
            "commit_frequency": "active",
            "last_commit_date": "2025-12-16T00:15:55.000Z",
            "commit_messages_sample": [
              {
                "date": "2025-12-16T00:15:55Z",
                "message": "Update API_ENDPOINTS.md"
              }
            ],
            "days_since_last_commit": 0,
            "total_commits_analyzed": 10
          },
          "default_branch": "main"
        },
        {
          "id": 1108711646,
          "url": "https://github.com/educoreai-lotus/CourseBuilder",
          "name": "CourseBuilder",
          "forks": 0,
          "stars": 0,
          "topics": [],
          "is_fork": false,
          "language": "JavaScript",
          "clone_url": "https://github.com/educoreai-lotus/CourseBuilder.git",
          "full_name": "educoreai-lotus/CourseBuilder",
          "pushed_at": "2025-12-15T23:25:36Z",
          "created_at": "2025-12-02T20:17:08Z",
          "is_private": false,
          "updated_at": "2025-12-15T23:25:40Z",
          "description": null,
          "languages_url": "https://api.github.com/repos/educoreai-lotus/CourseBuilder/languages",
          "commit_history": {
            "commit_frequency": "active",
            "last_commit_date": "2025-12-15T23:25:35.000Z",
            "commit_messages_sample": [
              {
                "date": "2025-12-15T23:25:35Z",
                "message": "Update COURSE_BUILDER_CONNECTION.md to match actual code implementation"
              }
            ],
            "days_since_last_commit": 0,
            "total_commits_analyzed": 10
          },
          "default_branch": "main"
        }
      ]
    }
  }
};

async function sendSkillsEngineRequest() {
  console.log('\n🧪 ===== SENDING SKILLS ENGINE REQUEST (Sally Hamdan) =====\n');
  console.log('📋 Employee Data:');
  console.log(`   UUID: ${sallyData.user_id}`);
  console.log(`   Name: ${sallyData.user_name}`);
  console.log(`   Company: ${sallyData.company_name}`);
  console.log(`   Type: ${sallyData.employee_type}`);
  console.log(`   Target Role: ${sallyData.path_career}`);
  console.log(`   LinkedIn data: ${Object.keys(sallyData.raw_data.linkedin).length} keys`);
  console.log(`   GitHub data: ${Object.keys(sallyData.raw_data.github).length} keys`);
  console.log(`   GitHub repositories: ${sallyData.raw_data.github.repositories?.length || 0}`);

  // Build payload (matching MicroserviceClient.getEmployeeSkills structure)
  const payload = {
    user_id: sallyData.user_id, // UUID, not employee_id from CSV
    user_name: sallyData.user_name,
    company_id: sallyData.company_id,
    company_name: sallyData.company_name,
    employee_type: sallyData.employee_type,
    path_career: sallyData.path_career,
    raw_data: sallyData.raw_data
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

// Run the test
sendSkillsEngineRequest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

