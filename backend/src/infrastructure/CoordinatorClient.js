// Coordinator Client
// Handles signed communication between Directory Service and Coordinator

const fetch = require('node-fetch');
const { generateSignature, verifySignature } = require('../utils/signature');

const SERVICE_NAME = process.env.SERVICE_NAME || 'directory-service';
const COORDINATOR_URL = process.env.COORDINATOR_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COORDINATOR_PUBLIC_KEY = process.env.COORDINATOR_PUBLIC_KEY || null;

/**
 * Post an envelope to Coordinator's unified endpoint with optional digital signature.
 * @param {Object} envelope - { requester_service, payload, response }
 * @returns {Promise<{ resp: Response, data: any }>}
 */
async function postToCoordinator(envelope) {
  console.log('[CoordinatorClient] ===== POST TO COORDINATOR START =====');
  console.log('[CoordinatorClient] COORDINATOR_URL from env:', COORDINATOR_URL);
  
  const url = `${COORDINATOR_URL}/api/fill-content-metrics/`;
  console.log('[CoordinatorClient] Full Coordinator URL:', url);
  console.log('[CoordinatorClient] Envelope being sent:', JSON.stringify(envelope, null, 2));

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add signature if private key is configured
  if (PRIVATE_KEY) {
    console.log('[CoordinatorClient] PRIVATE_KEY is configured, generating signature...');
    const sig = generateSignature(SERVICE_NAME, PRIVATE_KEY, envelope);
    headers['X-Service-Name'] = SERVICE_NAME;
    headers['X-Signature'] = sig;
    console.log('[CoordinatorClient] Signature generated, length:', sig.length);
  } else {
    console.warn('[CoordinatorClient] PRIVATE_KEY not configured, sending without signature');
  }

  console.log('[CoordinatorClient] Request headers:', JSON.stringify(headers, null, 2));
  console.log('[CoordinatorClient] Sending POST request to Coordinator...');

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(envelope),
  });

  console.log('[CoordinatorClient] Coordinator response received');
  console.log('[CoordinatorClient] Response status:', resp.status);
  console.log('[CoordinatorClient] Response statusText:', resp.statusText);
  console.log('[CoordinatorClient] Response headers:', JSON.stringify(Object.fromEntries(resp.headers.entries()), null, 2));

  const data = await resp.json().catch((err) => {
    console.error('[CoordinatorClient] Failed to parse JSON response:', err);
    return {};
  });
  
  console.log('[CoordinatorClient] Response data parsed:', JSON.stringify(data, null, 2));

  // Optional: verify Coordinator response signature (non-blocking)
  try {
    const respService = resp.headers.get('x-service-name');
    const respSignature = resp.headers.get('x-service-signature');

    if (respService === 'coordinator' && respSignature && COORDINATOR_PUBLIC_KEY) {
      const ok = verifySignature('coordinator', respSignature, COORDINATOR_PUBLIC_KEY, data);
      if (!ok) {
        console.warn('[CoordinatorClient] Invalid Coordinator signature');
      }
    }
  } catch (error) {
    console.warn('[CoordinatorClient] Signature verification error:', error.message);
  }

  console.log('[CoordinatorClient] ===== POST TO COORDINATOR COMPLETE =====');
  return { resp, data };
}

/**
 * STEP 1: Register service with Coordinator
 * POST ${COORDINATOR_URL}/register
 * @param {string} serviceName - Service name
 * @param {string} endpoint - Service base endpoint URL
 * @param {string} version - Service version
 * @returns {Promise<{ resp: Response, data: any }>}
 */
async function registerService(serviceName, endpoint, version) {
  const url = `${COORDINATOR_URL}/register`;

  const body = {
    serviceName: serviceName,
    endpoint: endpoint,
    version: version
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add signature if private key is configured
  if (PRIVATE_KEY) {
    const sig = generateSignature(SERVICE_NAME, PRIVATE_KEY, body);
    headers['X-Service-Name'] = SERVICE_NAME;
    headers['X-Signature'] = sig;
  } else {
    // Still add service name even without signature
    headers['X-Service-Name'] = SERVICE_NAME;
  }

  console.log(`[CoordinatorClient] STEP 1: Registering service ${serviceName} with Coordinator...`);
  console.log(`[CoordinatorClient] URL: ${url}`);
  console.log(`[CoordinatorClient] Body:`, JSON.stringify(body, null, 2));
  console.log(`[CoordinatorClient] Headers:`, headers);

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));

  console.log(`[CoordinatorClient] Registration response status: ${resp.status}`);
  console.log(`[CoordinatorClient] Registration response data:`, JSON.stringify(data, null, 2));

  return { resp, data };
}

/**
 * STEP 2: Upload migration file to Coordinator
 * POST ${COORDINATOR_URL}/register/<serviceId>/migration
 * @param {string} serviceId - Service ID from step 1
 * @param {string} migrationFilePath - Path to migration JSON file
 * @returns {Promise<{ resp: Response, data: any }>}
 */
async function uploadMigration(serviceId, migrationFilePath) {
  const url = `${COORDINATOR_URL}/register/${serviceId}/migration`;
  const fs = require('fs');
  const FormData = require('form-data');

  // Create FormData and append file stream with exact field name "migration"
  const form = new FormData();
  form.append('migration', fs.createReadStream(migrationFilePath));

  // Get headers from FormData (includes Content-Type with boundary)
  // Do NOT set Content-Type manually - FormData handles it
  const headers = form.getHeaders();

  // Add signature if private key is configured
  // Read file content for signing
  if (PRIVATE_KEY) {
    const fileContent = fs.readFileSync(migrationFilePath, 'utf8');
    const migrationData = JSON.parse(fileContent);
    const sig = generateSignature(SERVICE_NAME, PRIVATE_KEY, migrationData);
    headers['X-Service-Name'] = SERVICE_NAME;
    headers['X-Signature'] = sig;
  } else {
    // Still add service name even without signature
    headers['X-Service-Name'] = SERVICE_NAME;
  }

  console.log(`[CoordinatorClient] STEP 2: Uploading migration file for service ${serviceId}...`);
  console.log(`[CoordinatorClient] URL: ${url}`);
  console.log(`[CoordinatorClient] File path: ${migrationFilePath}`);
  console.log(`[CoordinatorClient] Field name: migration`);
  console.log(`[CoordinatorClient] Headers:`, Object.keys(headers));

  const resp = await fetch(url, {
    method: 'POST',
    body: form,
    headers: headers
  });

  const data = await resp.json().catch(() => ({}));

  console.log(`[CoordinatorClient] Migration upload response status: ${resp.status}`);
  console.log(`[CoordinatorClient] Migration upload response data:`, JSON.stringify(data, null, 2));

  return { resp, data };
}

module.exports = { postToCoordinator, registerService, uploadMigration };


