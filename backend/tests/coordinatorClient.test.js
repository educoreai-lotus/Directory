const crypto = require('crypto');
const fetch = require('node-fetch');

jest.mock('node-fetch', () => jest.fn());

// Mock coordinatorKey to avoid needing a real public key in tests
jest.mock('../src/security/coordinatorKey', () => ({
  COORDINATOR_PUBLIC_KEY: null,
}));

const { postToCoordinator } = require('../src/infrastructure/CoordinatorClient');

describe('CoordinatorClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('postToCoordinator attaches X-Service-Name and X-Signature headers', async () => {
    // Generate a temporary ECDSA key pair for testing
    const { privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });

    process.env.SERVICE_NAME = 'directory-service';
    process.env.COORDINATOR_URL = 'https://coordinator-production-e0a0.up.railway.app';
    process.env.PRIVATE_KEY = privatePem;

    const envelope = {
      requester_service: 'directory-service',
      payload: { action: 'test_action', value: 42 },
      response: { result: '' },
    };

    // Mock fetch response
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { response: { result: 'ok' } } }),
      headers: {
        get: () => null, // no signature headers in mock
      },
    });

    const { data } = await postToCoordinator(envelope);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://coordinator-production-e0a0.up.railway.app/api/fill-content-metrics/');

    // Headers should include service name and signature
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-Service-Name']).toBe('directory-service');
    expect(typeof options.headers['X-Signature']).toBe('string');
    expect(options.headers['X-Signature'].length).toBeGreaterThan(0);

    // Body should be the stringified envelope
    expect(options.body).toBe(JSON.stringify(envelope));

    // Data should be parsed JSON from response
    expect(data).toEqual({ success: true, data: { response: { result: 'ok' } } });
  });
});


