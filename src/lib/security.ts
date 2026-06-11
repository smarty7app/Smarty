import crypto from "crypto";

/**
 * Generates a cryptographically secure random secret for the merchant
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates the HMAC signature of a given payload
 * @param payload The raw string body or object to be signed
 * @param signature The signature provided in the headers (x-smarty-signature)
 * @param secret The merchant's webhook secret
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}
