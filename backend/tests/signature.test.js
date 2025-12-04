const crypto = require('crypto');
const { generateSignature, verifySignature } = require('../src/utils/signature');

describe('signature utils', () => {
  test('generateSignature and verifySignature round-trip with ECDSA P-256', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });

    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

    const serviceName = 'directory-service';
    const payload = { foo: 'bar', count: 3 };

    const sig = generateSignature(serviceName, privatePem, payload);
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(0);

    const ok = verifySignature(serviceName, sig, publicPem, payload);
    expect(ok).toBe(true);

    // Tampered payload should fail verification
    const bad = verifySignature(serviceName, sig, publicPem, { foo: 'baz', count: 3 });
    expect(bad).toBe(false);
  });
});


