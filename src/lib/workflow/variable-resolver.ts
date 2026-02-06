/**
 * Variable Resolver
 *
 * Parses and resolves {{ expression }} syntax in node configurations.
 * Supports referencing data from trigger and previous node outputs.
 */

/**
 * Execution context that flows through the workflow
 */
export interface ExecutionContext {
  /** Data from the trigger node */
  trigger: {
    type: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    [key: string]: unknown;
  };

  /** Outputs from executed nodes, keyed by node ID */
  nodes: Record<
    string,
    {
      output: unknown;
      executedAt: string;
      duration?: number;
    }
  >;

  /** Current execution metadata */
  execution: {
    id: string;
    workflowId: string;
    startedAt: string;
    status: string;
  };

  /** Current loop iteration context (only set inside loops) */
  loop?: {
    item: unknown;
    index: number;
    total: number;
    isFirst: boolean;
    isLast: boolean;
    [key: string]: unknown;
  };
}

/**
 * Variable reference info extracted from an expression
 */
export interface VariableRef {
  /** Full path: "trigger.body.email" or "nodes.abc123.output.data" */
  path: string;

  /** Source type: "trigger" | "nodes" | "execution" | "loop" */
  source: "trigger" | "nodes" | "execution" | "loop";

  /** For node references, the node ID */
  nodeId?: string;

  /** The remaining path after the source */
  subPath: string[];
}

/**
 * Regular expression to match {{ expression }} syntax
 */
const VARIABLE_REGEX = /\{\{\s*([^}]+)\s*\}\}/g;

/**
 * Parse a string and extract all variable references
 */
export function parseVariables(input: string): VariableRef[] {
  const refs: VariableRef[] = [];
  let match: RegExpExecArray | null;

  while ((match = VARIABLE_REGEX.exec(input)) !== null) {
    const path = match[1].trim();
    const ref = parseVariablePath(path);
    if (ref) {
      refs.push(ref);
    }
  }

  // Reset regex state
  VARIABLE_REGEX.lastIndex = 0;

  return refs;
}

/**
 * Parse a single variable path into a VariableRef
 */
export function parseVariablePath(path: string): VariableRef | null {
  const parts = path.split(".");

  if (parts.length === 0) return null;

  const source = parts[0] as VariableRef["source"];

  if (source === "trigger") {
    return {
      path,
      source: "trigger",
      subPath: parts.slice(1),
    };
  }

  if (source === "nodes") {
    if (parts.length < 2) return null;
    const nodeId = parts[1];
    // Skip "output" if present: nodes.abc.output.data -> data
    const hasOutput = parts[2] === "output";
    const subPath = hasOutput ? parts.slice(3) : parts.slice(2);
    return {
      path,
      source: "nodes",
      nodeId,
      subPath,
    };
  }

  if (source === "execution") {
    return {
      path,
      source: "execution",
      subPath: parts.slice(1),
    };
  }

  if (source === "loop") {
    return {
      path,
      source: "loop",
      subPath: parts.slice(1),
    };
  }

  return null;
}

/**
 * Resolve a variable reference against an execution context
 */
export function resolveVariable(
  ref: VariableRef,
  context: ExecutionContext,
): unknown {
  let value: unknown;

  switch (ref.source) {
    case "trigger":
      value = context.trigger;
      break;
    case "nodes":
      if (!ref.nodeId) return undefined;
      value = context.nodes[ref.nodeId]?.output;
      break;
    case "execution":
      value = context.execution;
      break;
    case "loop":
      if (!context.loop) return undefined;
      value = context.loop;
      break;
    default:
      return undefined;
  }

  // Navigate the subPath
  for (const key of ref.subPath) {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

/**
 * Resolve all variables in a string, replacing {{ }} with actual values
 */
export function resolveString(
  input: string,
  context: ExecutionContext,
): string {
  return input.replace(VARIABLE_REGEX, (match, path) => {
    const ref = parseVariablePath(path.trim());
    if (!ref) return match;

    const value = resolveVariable(ref, context);

    if (value === undefined || value === null) {
      return "";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

/**
 * Resolve variables in any value (string, object, array)
 * Recursively processes nested structures
 */
export function resolveValue(
  input: unknown,
  context: ExecutionContext,
): unknown {
  if (typeof input === "string") {
    // Check if the entire string is a single variable reference
    const trimmed = input.trim();
    if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
      const path = trimmed.slice(2, -2).trim();
      const ref = parseVariablePath(path);
      if (ref) {
        // Return the actual value (not stringified)
        return resolveVariable(ref, context);
      }
    }
    // Otherwise, do string interpolation
    return resolveString(input, context);
  }

  if (Array.isArray(input)) {
    return input.map((item) => resolveValue(item, context));
  }

  if (typeof input === "object" && input !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = resolveValue(value, context);
    }
    return result;
  }

  // Numbers, booleans, null - return as-is
  return input;
}

/**
 * Check if a string contains any variable references
 */
export function hasVariables(input: string): boolean {
  VARIABLE_REGEX.lastIndex = 0;
  const result = VARIABLE_REGEX.test(input);
  VARIABLE_REGEX.lastIndex = 0;
  return result;
}

/**
 * Build a variable path string for insertion
 */
export function buildVariablePath(
  source: "trigger" | "nodes" | "execution" | "loop",
  nodeId: string | null,
  path: string[],
): string {
  if (source === "trigger") {
    return `{{ trigger.${path.join(".")} }}`;
  }

  if (source === "loop") {
    return `{{ loop.${path.join(".")} }}`;
  }

  if (source === "nodes" && nodeId) {
    return `{{ nodes.${nodeId}.output.${path.join(".")} }}`;
  }

  if (source === "execution") {
    return `{{ execution.${path.join(".")} }}`;
  }

  return "";
}

/**
 * Get a shortened display version of a variable path
 */
export function getShortVariablePath(path: string): string {
  const parts = path.split(".");

  // "nodes.abc123.output.data.email" -> "data.email"
  if (parts[0] === "nodes" && parts[2] === "output") {
    return parts.slice(3).join(".");
  }

  // "trigger.body.email" -> "body.email"
  if (parts[0] === "trigger") {
    return parts.slice(1).join(".");
  }

  return path;
}

/**
 * Create an empty execution context
 */
export function createEmptyContext(
  workflowId: string,
  executionId: string,
): ExecutionContext {
  return {
    trigger: { type: "manual" },
    nodes: {},
    execution: {
      id: executionId,
      workflowId,
      startedAt: new Date().toISOString(),
      status: "running",
    },
  };
}
