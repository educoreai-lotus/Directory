// Digital Signature Utilities for Directory Service
// ECDSA P-256 signing & verification using Node's crypto module

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

function generateSignature(serviceName, privateKeyPem, payload) {
  const msg = buildMessage(serviceName, payload);
  const sign = crypto.createSign('SHA256');
  sign.update(msg);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

function verifySignature(serviceName, signature, publicKeyPem, payload) {
  const msg = buildMessage(serviceName, payload);
  const verify = crypto.createVerify('SHA256');
  verify.update(msg);
  verify.end();
  return verify.verify(publicKeyPem, signature, 'base64');
}

module.exports = { generateSignature, verifySignature };


