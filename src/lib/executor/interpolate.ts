/**
 * Variable Interpolation Engine
 *
 * Supports syntax:
 * - {{trigger.fieldName}} - Form field value from trigger data
 * - {{nodes.nodeId.output}} - Output from a previous node
 * - {{variables.myVar}} - Custom variable set during execution
 */

export interface InterpolationContext {
  trigger: Record<string, unknown>;
  nodes: Record<
    string,
    { output: unknown; error?: string | null; success?: boolean }
  >;
  variables: Record<string, unknown>;
  loop?: Record<string, unknown>;
}

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Interpolate variables in a string
 */
export function interpolate(
  template: string,
  context: InterpolationContext,
): string {
  return template.replace(VARIABLE_PATTERN, (match, path) => {
    const value = getNestedValue(context, path.trim());
    if (value === undefined) {
      return match; // Keep original if path not found
    }
    if (value === null) {
      return ""; // Return empty string for null values
    }
    return String(value);
  });
}

/**
 * Interpolate variables in any value (string, object, array)
 */
export function interpolateDeep(
  value: unknown,
  context: InterpolationContext,
): unknown {
  if (typeof value === "string") {
    return interpolate(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateDeep(item, context));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = interpolateDeep(val, context);
    }
    return result;
  }

  return value;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: InterpolationContext, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Extract all variable references from a template
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(VARIABLE_PATTERN);
  return Array.from(matches, (m) => m[1].trim());
}

/**
 * Create an empty context for interpolation
 */
export function createEmptyContext(): InterpolationContext {
  return {
    trigger: {},
    nodes: {},
    variables: {},
  };
}
