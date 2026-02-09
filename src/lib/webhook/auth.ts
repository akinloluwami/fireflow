/**
 * Webhook Authentication Utilities
 *
 * Supports two authentication methods:
 * 1. Bearer Token - Simple, just include token in Authorization header
 * 2. HMAC-SHA256 - More secure, proves payload integrity
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type WebhookAuthMethod = "bearer" | "hmac";

/**
 * Generate a cryptographically secure webhook secret/token
 * Format: whsec_<64 hex characters>
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString("hex")}`;
}

/**
 * Validate Bearer token using timing-safe comparison
 */
export function validateBearerToken(
  authHeader: string | null,
  secret: string,
): boolean {
  if (!authHeader) {
    return false;
  }

  // Expected format: Bearer <token>
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return false;
  }

  const providedToken = parts[1];

  try {
    return timingSafeEqual(Buffer.from(providedToken), Buffer.from(secret));
  } catch {
    return false;
  }
}

/**
 * Compute the HMAC-SHA256 signature for a payload
 * Returns format: sha256=<hex>
 */
export function computeWebhookSignature(
  payload: string,
  secret: string,
): string {
  const hmac = createHmac("sha256", secret).update(payload).digest("hex");
  return `sha256=${hmac}`;
}

/**
 * Validate a webhook signature using timing-safe comparison
 *
 * @param payload - The raw request body as a string
 * @param signature - The signature from the X-Webhook-Signature header
 * @param secret - The webhook secret for this workflow
 * @returns true if valid, false otherwise
 */
export function validateWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) {
    return false;
  }

  // Expected format: sha256=<hex>
  const parts = signature.split("=");
  if (parts.length !== 2) {
    return false;
  }

  const [algorithm, providedHash] = parts;
  if (algorithm !== "sha256") {
    return false;
  }

  // Validate hex format
  if (!/^[a-f0-9]{64}$/i.test(providedHash)) {
    return false;
  }

  const expectedHash = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(providedHash, "hex"),
      Buffer.from(expectedHash, "hex"),
    );
  } catch {
    // Buffers have different lengths (shouldn't happen with validation above)
    return false;
  }
}

/**
 * Header name for webhook signatures
 */
export const WEBHOOK_SIGNATURE_HEADER = "x-webhook-signature";

/**
 * Generate example curl command for Bearer token
 */
export function generateBearerCurlExample(
  webhookUrl: string,
  secret: string,
  payload = '{"example": "data"}',
): string {
  return `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${secret}" \\
  -d '${payload}'`;
}

/**
 * Generate example curl command for HMAC signature
 */
export function generateHmacCurlExample(
  webhookUrl: string,
  secret: string,
  payload = '{"example": "data"}',
): string {
  const signature = computeWebhookSignature(payload, secret);
  return `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Signature: ${signature}" \\
  -d '${payload}'`;
}
