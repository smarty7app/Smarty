import crypto from "crypto";

/**
 * Generates a secure 32-byte webhook secret token.
 */
export function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifies the digital signature of a webhook payload.
 * @param {string} payload - The raw request body as a string.
 * @param {string} signature - The signature header from the request.
 * @param {string} secret - The merchant's webhook secret.
 */
export function verifySignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    return false;
  }
}
