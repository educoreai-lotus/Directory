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
  const url = `${COORDINATOR_URL}/api/fill-content-metrics/`;

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add signature if private key is configured
  if (PRIVATE_KEY) {
    const sig = generateSignature(SERVICE_NAME, PRIVATE_KEY, envelope);
    headers['X-Service-Name'] = SERVICE_NAME;
    headers['X-Signature'] = sig;
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(envelope),
  });

  const data = await resp.json().catch(() => ({}));

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

  return { resp, data };
}

module.exports = { postToCoordinator };


