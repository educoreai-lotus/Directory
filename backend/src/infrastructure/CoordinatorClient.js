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
  
  // Validate COORDINATOR_URL
  if (!COORDINATOR_URL) {
    const error = new Error('COORDINATOR_URL environment variable is not set');
    console.error('[CoordinatorClient] Validation error:', error.message);
    throw error;
  }
  
  const url = `${COORDINATOR_URL}/api/fill-content-metrics/`;
  console.log('[CoordinatorClient] Full Coordinator URL:', url);
  console.log('[CoordinatorClient] Envelope being sent:', JSON.stringify(envelope, null, 2));

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add signature if private key is configured
  if (PRIVATE_KEY) {
    console.log('[CoordinatorClient] PRIVATE_KEY is configured, generating signature...');
    console.log('[CoordinatorClient] PRIVATE_KEY details:', {
      exists: !!PRIVATE_KEY,
      type: typeof PRIVATE_KEY,
      length: PRIVATE_KEY.length,
      hasEscapedNewlines: PRIVATE_KEY.includes('\\n'),
      hasActualNewlines: PRIVATE_KEY.includes('\n'),
      startsWith: PRIVATE_KEY.substring(0, 30)
    });
    
    try {
      // Handle multiline PRIVATE_KEY - replace escaped newlines with actual newlines
      let normalizedPrivateKey = PRIVATE_KEY;
      if (normalizedPrivateKey.includes('\\n')) {
        console.log('[CoordinatorClient] Normalizing PRIVATE_KEY: replacing \\n with actual newlines');
        normalizedPrivateKey = normalizedPrivateKey.replace(/\\n/g, '\n');
      }
      
      console.log('[CoordinatorClient] Generating signature with normalized key...');
      const sig = generateSignature(SERVICE_NAME, normalizedPrivateKey, envelope);
      headers['X-Service-Name'] = SERVICE_NAME;
      headers['X-Signature'] = sig;
      console.log('[CoordinatorClient] Signature generated successfully, length:', sig.length);
    } catch (signatureError) {
      console.error('[CoordinatorClient] Signature generation failed:', signatureError);
      console.error('[CoordinatorClient] Signature error name:', signatureError?.name);
      console.error('[CoordinatorClient] Signature error message:', signatureError?.message);
      console.error('[CoordinatorClient] Signature error stack:', signatureError?.stack);
      throw new Error(`Failed to generate signature: ${signatureError?.message || 'Unknown signature error'}`);
    }
  } else {
    console.warn('[CoordinatorClient] PRIVATE_KEY not configured, sending without signature');
  }

  console.log('[CoordinatorClient] Request headers:', JSON.stringify(headers, null, 2));
  console.log('[CoordinatorClient] Sending POST request to Coordinator...');
  console.log('[CoordinatorClient] Request body size:', JSON.stringify(envelope).length, 'bytes');

  let resp;
  try {
    console.log('[CoordinatorClient] Executing fetch() to Coordinator...');
    resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope),
    });
    console.log('[CoordinatorClient] Fetch completed, response received');
  } catch (fetchError) {
    console.error('[CoordinatorClient] ===== FETCH ERROR =====');
    console.error('[CoordinatorClient] Fetch error name:', fetchError?.name);
    console.error('[CoordinatorClient] Fetch error message:', fetchError?.message);
    console.error('[CoordinatorClient] Fetch error code:', fetchError?.code);
    console.error('[CoordinatorClient] Fetch error stack:', fetchError?.stack);
    
    // Provide user-friendly error messages
    if (fetchError?.code === 'ENOTFOUND') {
      throw new Error(`Cannot resolve Coordinator hostname. Check COORDINATOR_URL: ${COORDINATOR_URL}`);
    } else if (fetchError?.code === 'ECONNREFUSED') {
      throw new Error(`Connection refused to Coordinator. Service may be offline: ${COORDINATOR_URL}`);
    } else if (fetchError?.code === 'ETIMEDOUT' || fetchError?.code === 'ECONNABORTED') {
      throw new Error(`Request timeout connecting to Coordinator: ${COORDINATOR_URL}`);
    } else {
      throw new Error(`Network error connecting to Coordinator: ${fetchError?.message || 'Unknown error'}`);
    }
  }

  console.log('[CoordinatorClient] Coordinator response received');
  console.log('[CoordinatorClient] Response status:', resp.status);
  console.log('[CoordinatorClient] Response statusText:', resp.statusText);
  console.log('[CoordinatorClient] Response ok:', resp.ok);
  console.log('[CoordinatorClient] Response headers:', JSON.stringify(Object.fromEntries(resp.headers.entries()), null, 2));

  let data;
  try {
    console.log('[CoordinatorClient] Parsing response JSON...');
    data = await resp.json();
    console.log('[CoordinatorClient] Response data parsed successfully');
    console.log('[CoordinatorClient] Response data parsed:', JSON.stringify(data, null, 2));
  } catch (jsonError) {
    console.error('[CoordinatorClient] Failed to parse JSON response:', jsonError);
    console.error('[CoordinatorClient] Response status:', resp.status);
    console.error('[CoordinatorClient] Response statusText:', resp.statusText);
    
    // Try to get text response for debugging
    try {
      const textResponse = await resp.text();
      console.error('[CoordinatorClient] Response body (text):', textResponse.substring(0, 500));
    } catch (textError) {
      console.error('[CoordinatorClient] Could not read response as text:', textError);
    }
    
    // Return empty data but don't crash - let the use case handle it
    data = {};
  }

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

  // Read migration file content
  const fileContent = fs.readFileSync(migrationFilePath, 'utf8');
  const migrationData = JSON.parse(fileContent);

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json'
  };

  // Add signature if private key is configured
  if (PRIVATE_KEY) {
    const sig = generateSignature(SERVICE_NAME, PRIVATE_KEY, migrationData);
    headers['X-Service-Name'] = SERVICE_NAME;
    headers['X-Signature'] = sig;
  } else {
    headers['X-Service-Name'] = SERVICE_NAME;
  }

  console.log(`[CoordinatorClient] STEP 2: Uploading migration file for service ${serviceId}...`);
  console.log(`[CoordinatorClient] URL: ${url}`);
  console.log(`[CoordinatorClient] File path: ${migrationFilePath}`);
  console.log(`[CoordinatorClient] Sending as JSON body`);
  console.log(`[CoordinatorClient] Headers:`, Object.keys(headers));
  console.log(`[CoordinatorClient] Migration data structure:`, {
    hasMigrationFile: !!migrationData.migrationFile,
    topLevelKeys: Object.keys(migrationData),
    fileSize: fileContent.length
  });

  // Send migration data as JSON in request body
  const resp = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(migrationData),
    headers: headers
  });

  const data = await resp.json().catch(() => ({}));

  console.log(`[CoordinatorClient] Migration upload response status: ${resp.status}`);
  console.log(`[CoordinatorClient] Migration upload response data:`, JSON.stringify(data, null, 2));

  return { resp, data };
}

module.exports = { postToCoordinator, registerService, uploadMigration };


