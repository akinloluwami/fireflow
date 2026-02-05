// Tally Webhook Types & Helpers

export interface TallyField {
  key: string;
  label: string;
  type: string;
  value: unknown;
}

export interface TallyWebhookPayload {
  eventId: string;
  eventType: "FORM_RESPONSE";
  createdAt: string;
  data: {
    responseId: string;
    submissionId: string;
    formId: string;
    formName: string;
    createdAt: string;
    fields: TallyField[];
  };
}

/**
 * Parse Tally form fields into a flat object
 * Maps field labels to values (lowercase, snake_case)
 */
export function parseTallyFields(
  fields: TallyField[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    // Convert label to snake_case key
    const key = field.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    result[key] = field.value;

    // Also store by original key for direct access
    result[field.key] = field.value;
  }

  return result;
}

/**
 * Validate Tally webhook signature (optional, if configured)
 */
export function validateTallySignature(
  _payload: string,
  signature: string | null,
  secret: string | null,
): boolean {
  // Tally doesn't require signature validation by default
  // but we can implement HMAC validation if needed
  if (!secret || !signature) return true;

  // TODO: Implement HMAC-SHA256 validation if Tally adds this feature
  return true;
}
