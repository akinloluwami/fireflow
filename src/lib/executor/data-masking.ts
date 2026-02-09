/**
 * Data Masking Utility
 *
 * Masks sensitive data before storing in execution logs.
 * This helps protect PII and credentials from being exposed in logs.
 */

// Patterns that indicate sensitive field names
const SENSITIVE_FIELD_PATTERNS = [
  // Credentials & Auth
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /apikey/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /bearer/i,
  /authorization/i,
  /auth[_-]?token/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
  /credential/i,
  /oauth/i,
  /jwt/i,
  /session[_-]?id/i,
  /session[_-]?token/i,

  // Personal Identifiable Information (PII)
  /ssn/i,
  /social[_-]?security/i,
  /tax[_-]?id/i,
  /national[_-]?id/i,
  /passport/i,
  /driver[_-]?license/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /cvc/i,
  /expir/i, // expiry, expiration, expires
  /account[_-]?number/i,
  /routing[_-]?number/i,
  /bank[_-]?account/i,
  /iban/i,
  /swift/i,
  /bic/i,

  // Contact info that might be sensitive in some contexts
  /phone/i,
  /mobile/i,
  /cell/i,

  // Health info
  /medical/i,
  /health/i,
  /diagnosis/i,
  /prescription/i,
  /insurance[_-]?id/i,

  // Encryption keys
  /encryption[_-]?key/i,
  /signing[_-]?key/i,
  /hmac/i,
];

// Patterns that match sensitive values (for when field names aren't indicative)
const SENSITIVE_VALUE_PATTERNS = [
  // Bearer tokens
  /^Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/,
  // JWTs
  /^eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/,
  // API keys (common formats)
  /^sk[-_][a-zA-Z0-9]{20,}$/, // Stripe-style
  /^pk[-_][a-zA-Z0-9]{20,}$/, // Stripe-style
  /^xox[baprs]-[a-zA-Z0-9\-]+$/, // Slack tokens
  /^ghp_[a-zA-Z0-9]{36,}$/, // GitHub PAT
  /^gho_[a-zA-Z0-9]{36,}$/, // GitHub OAuth
  /^npm_[a-zA-Z0-9]{36,}$/, // npm tokens
  // Credit card numbers (basic pattern)
  /^\d{13,19}$/,
  // SSN pattern
  /^\d{3}-\d{2}-\d{4}$/,
];

const MASK = "***MASKED***";
const PARTIAL_MASK = "***";

/**
 * Check if a field name indicates sensitive data
 */
function isSensitiveFieldName(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

/**
 * Check if a value looks like sensitive data
 */
function isSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Mask a sensitive string value, optionally preserving a preview
 */
function maskString(value: string, preservePreview = false): string {
  if (!preservePreview || value.length <= 8) {
    return MASK;
  }
  // Show first 4 and last 4 characters
  return value.slice(0, 4) + PARTIAL_MASK + value.slice(-4);
}

/**
 * Recursively mask sensitive data in an object
 */
export function maskSensitiveData(
  data: unknown,
  parentKey = "",
  depth = 0,
): unknown {
  // Prevent infinite recursion
  if (depth > 20) {
    return "[MAX_DEPTH_EXCEEDED]";
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data === "string") {
    // Check if parent key indicates sensitivity
    if (isSensitiveFieldName(parentKey)) {
      return maskString(data, true);
    }
    // Check if value itself looks sensitive
    if (isSensitiveValue(data)) {
      return maskString(data, true);
    }
    return data;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    // Numbers in sensitive fields should be masked (e.g., SSN as number)
    if (isSensitiveFieldName(parentKey)) {
      return MASK;
    }
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item, index) =>
      maskSensitiveData(item, `${parentKey}[${index}]`, depth + 1),
    );
  }

  // Handle objects
  if (typeof data === "object") {
    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      masked[key] = maskSensitiveData(value, key, depth + 1);
    }

    return masked;
  }

  return data;
}

/**
 * Mask sensitive data specifically for execution logging
 * This is the main entry point for the execution engine
 */
export function maskExecutionData(data: unknown): unknown {
  try {
    return maskSensitiveData(data);
  } catch (error) {
    // If masking fails, return a safe placeholder
    console.error("[DataMasking] Failed to mask data:", error);
    return { __masked: true, reason: "masking_failed" };
  }
}

/**
 * Check if data contains any sensitive fields (for validation/testing)
 */
export function containsSensitiveData(data: unknown, depth = 0): boolean {
  if (depth > 20) return false;

  if (typeof data === "string") {
    return isSensitiveValue(data);
  }

  if (Array.isArray(data)) {
    return data.some((item) => containsSensitiveData(item, depth + 1));
  }

  if (typeof data === "object" && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveFieldName(key)) return true;
      if (containsSensitiveData(value, depth + 1)) return true;
    }
  }

  return false;
}
