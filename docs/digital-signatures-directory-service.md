# Digital Signatures - Directory Service → Coordinator

## 1. Summary

The Directory backend signs all outbound requests to the **Coordinator** using **ECDSA P-256** digital signatures.

- **Target**: `POST ${COORDINATOR_URL}/api/fill-content-metrics/`
- **Service name**: `directory-service`
- **Headers added**:
  - `X-Service-Name`
  - `X-Signature`

Coordinator may also sign its responses back to Directory. Directory verifies these signatures in a **non-blocking** way (warnings only, no hard failures).

---

## 2. Signing Rules

### 2.1 Message Format

We always sign a message built from **service name + payload hash**:

```text
educoreai-{serviceName}-{sha256(JSON.stringify(payload))}
```

Implementation (see `backend/src/utils/signature.js`):

```js
const crypto = require('crypto');

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
```

### 2.2 Signature Algorithm

- Algorithm: **ECDSA P-256** with **SHA-256** digest
- Key format: **PEM**
- Encoding: **base64**

Functions:

- `generateSignature(serviceName, privateKeyPem, payload)`
- `verifySignature(serviceName, signature, publicKeyPem, payload)`

File: `backend/src/utils/signature.js`.

---

## 3. Outbound Calls to Coordinator

### 3.1 Coordinator Client

File: `backend/src/infrastructure/CoordinatorClient.js`

- Uses `node-fetch` to call Coordinator:
  - URL: `POST ${COORDINATOR_URL}/api/fill-content-metrics/`
- Builds envelope:

```js
{
  requester_service: SERVICE_NAME,          // 'directory-service'
  payload: { action, target_service, ... }, // original payload + routing info
  response: { ... }                         // response template
}
```

### 3.2 Headers Sent

When `PRIVATE_KEY` is set:

- `X-Service-Name: directory-service`
- `X-Signature: <base64-encoded ECDSA signature>`

Signature covers the **full envelope** (requester_service + payload + response).

Minimal example:

```js
const { generateSignature } = require('../utils/signature');

const sig = generateSignature('directory-service', PRIVATE_KEY, envelope);
headers['X-Service-Name'] = 'directory-service';
headers['X-Signature'] = sig;
```

The `CoordinatorClient.postToCoordinator(envelope)` helper is used by `MicroserviceClient` so all outbound calls are signed automatically.

---

## 4. Inbound Responses from Coordinator

### 4.1 Response Format

Coordinator typically returns:

```json
{
  "success": true,
  "data": {
    // filled response template
  }
}
```

### 4.2 Signature Verification (Optional / Non-Blocking)

For each response from Coordinator:

1. Read headers:
   - `x-service-name`
   - `x-service-signature`
2. If:
   - `x-service-name === 'coordinator'`
   - `x-service-signature` is present
   - `COORDINATOR_PUBLIC_KEY` is configured

   → Verify signature using the JSON body.

If verification fails, we **log a warning** and continue:

```js
if (!ok) {
  console.warn('[CoordinatorClient] Invalid Coordinator signature');
}
```

We **do not** reject the response on signature failure (non-blocking verification).

---

## 5. Environment Variables

Set these in your environment (e.g., Railway, `.env`):

```env
SERVICE_NAME=directory-service
COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app

# ECDSA P-256 private key for signing (PEM, single line or properly escaped)
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Optional: Coordinator public key (if not loaded from file)
COORDINATOR_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

### Notes

- In this repo, the Coordinator public key is loaded from:
  - File: `backend/src/security/coordinator-public-key.pem`
  - Loader: `backend/src/security/coordinatorKey.js`
- You can also expose it via env if needed, but the file-based approach is already wired.

---

## 6. How Directory Uses Signatures

### 6.1 Outbound (Directory → Coordinator)

1. Business logic in use cases builds an envelope for another microservice (Skills Engine, Course Builder, etc.).
2. `MicroserviceClient` maps the target microservice to:
   - `action` (descriptive string)
   - `target_service` (e.g., `"skills-engine"`)
3. `MicroserviceClient` calls:

```js
const { data: json } = await postToCoordinator(envelope);
```

4. `CoordinatorClient`:
   - Signs the envelope (if `PRIVATE_KEY` is set)
   - Sends headers `X-Service-Name` and `X-Signature`
   - Returns `{ resp, data }` to `MicroserviceClient`

### 6.2 Inbound (Coordinator → Directory)

1. Coordinator calls:
   - `POST /api/fill-content-metrics/` on Directory
2. `UniversalEndpointController` parses the envelope:
   - `requester_service`
   - `payload`
   - `response`
3. `FillContentMetricsUseCase`:
   - Uses AI-generated SQL to fill the response template
4. Directory returns:

```json
{
  "success": true,
  "data": {
    // exactly the response fields requested
  }
}
```

No signatures are required **into** Directory at this stage (signatures are enforced on **outbound** calls to Coordinator).

---

## 7. Testing

### 7.1 Signature Utility Tests

File: `backend/tests/signature.test.js` (see repo)

Tests:
- `generateSignature` produces a signature
- `verifySignature` validates a signature for the same payload/service name

### 7.2 Coordinator Client Tests

File: `backend/tests/coordinatorClient.test.js` (see repo)

Tests:
- `postToCoordinator` attaches:
  - `X-Service-Name`
  - `X-Signature`
- Signature is generated based on the full envelope

---

## 8. Operational Checklist

Before deploying:

1. **Set env vars**:
   - `SERVICE_NAME=directory-service`
   - `COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app`
   - `PRIVATE_KEY=<your ECDSA P-256 private key>`
2. Ensure `coordinator-public-key.pem` in `backend/src/security/` matches the Coordinator’s public key.
3. Restart the Directory service.
4. Verify that:
   - Requests to Coordinator no longer get `Authentication required. Please provide X-Service-Name and X-Signature headers.`
   - Logs show successful Coordinator calls.


