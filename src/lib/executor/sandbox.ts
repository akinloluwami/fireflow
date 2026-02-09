/**
 * Secure Sandbox for Code Execution
 *
 * This module provides a restricted execution environment that prevents
 * access to Node.js internals, file system, network, and other dangerous APIs.
 */

// Blocked patterns that could be used for sandbox escape
const BLOCKED_PATTERNS = [
  // Process and global access
  /\bprocess\b/,
  /\bglobal\b/,
  /\bglobalThis\b/,
  // Module system
  /\brequire\b/,
  /\bimport\b/,
  /\bmodule\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
  // Constructor access for prototype pollution
  /\.constructor\b/,
  /\.__proto__\b/,
  /\bObject\.getPrototypeOf\b/,
  /\bObject\.setPrototypeOf\b/,
  /\bReflect\b/,
  /\bProxy\b/,
  // Dangerous globals
  /\beval\b/,
  /\bFunction\b(?!\s*\()/,
  /\bAsyncFunction\b/,
  /\bGeneratorFunction\b/,
  // Node.js specific
  /\bBuffer\b/,
  /\bchild_process\b/,
  /\bfs\b/,
  /\bnet\b/,
  /\bhttp\b/,
  /\bhttps\b/,
  /\bdns\b/,
  /\bos\b/,
  /\bpath\b/,
  /\bvm\b/,
  /\bworker_threads\b/,
  /\bcluster\b/,
  // Timing attacks
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\bsetImmediate\b/,
  // WebAssembly
  /\bWebAssembly\b/,
];

// Maximum execution time in milliseconds
const MAX_EXECUTION_TIME = 5000;

// Maximum output size in characters
const MAX_OUTPUT_SIZE = 1024 * 100; // 100KB

export interface SandboxResult {
  success: boolean;
  output: unknown;
  error?: string;
  logs: string[];
}

export interface SandboxContext {
  trigger: unknown;
  nodes: Record<string, unknown>;
  variables: Record<string, unknown>;
  loop?: unknown;
}

/**
 * Validates code for dangerous patterns before execution
 */
export function validateCode(code: string): { valid: boolean; error?: string } {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return {
        valid: false,
        error: `Blocked pattern detected: ${pattern.toString()}. This pattern is not allowed for security reasons.`,
      };
    }
  }

  // Check for template literals that might hide patterns
  // Look for ${...} that could contain blocked code
  const templateLiteralContent = code.match(/\$\{([^}]+)\}/g);
  if (templateLiteralContent) {
    for (const match of templateLiteralContent) {
      const innerCode = match.slice(2, -1);
      for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(innerCode)) {
          return {
            valid: false,
            error: `Blocked pattern detected in template literal: ${pattern.toString()}`,
          };
        }
      }
    }
  }

  // Check for string escapes that might hide patterns
  // Decode common escape sequences
  const decodedCode = code
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    );

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(decodedCode)) {
      return {
        valid: false,
        error: `Blocked pattern detected (encoded): ${pattern.toString()}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Creates a frozen sandbox object that can't be modified
 */
export function createSandbox(
  context: SandboxContext,
): Record<string, unknown> {
  const logs: string[] = [];

  const sandbox = {
    // User data (frozen copies)
    trigger: deepFreeze(structuredClone(context.trigger)),
    nodes: deepFreeze(structuredClone(context.nodes)),
    variables: structuredClone(context.variables), // Not frozen - users can modify
    loop: context.loop ? deepFreeze(structuredClone(context.loop)) : undefined,

    // Safe console
    console: Object.freeze({
      log: (...args: unknown[]) => {
        const msg = args.map(safeStringify).join(" ");
        logs.push(`[log] ${msg}`);
        if (logs.length > 100) logs.shift(); // Limit log entries
      },
      warn: (...args: unknown[]) => {
        const msg = args.map(safeStringify).join(" ");
        logs.push(`[warn] ${msg}`);
        if (logs.length > 100) logs.shift();
      },
      error: (...args: unknown[]) => {
        const msg = args.map(safeStringify).join(" ");
        logs.push(`[error] ${msg}`);
        if (logs.length > 100) logs.shift();
      },
    }),

    // Safe built-ins (frozen)
    JSON: Object.freeze({
      parse: JSON.parse.bind(JSON),
      stringify: JSON.stringify.bind(JSON),
    }),
    Math: Object.freeze({ ...Math }),
    Date: Object.freeze(Date),
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,

    // Safe array/object methods (return new objects, don't modify prototypes)
    Array: Object.freeze({
      isArray: Array.isArray.bind(Array),
      from: Array.from.bind(Array),
      of: Array.of.bind(Array),
    }),
    Object: Object.freeze({
      keys: Object.keys.bind(Object),
      values: Object.values.bind(Object),
      entries: Object.entries.bind(Object),
      fromEntries: Object.fromEntries.bind(Object),
      assign: Object.assign.bind(Object),
    }),
    String: Object.freeze(String),
    Number: Object.freeze(Number),
    Boolean: Object.freeze(Boolean),

    // Internal for log collection
    __logs: logs,
  };

  return sandbox;
}

/**
 * Deep freezes an object and all nested objects
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  Object.freeze(obj);

  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (
      value !== null &&
      typeof value === "object" &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  }

  return obj;
}

/**
 * Safely stringifies a value for logging
 */
function safeStringify(value: unknown): string {
  try {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    const str = JSON.stringify(value, null, 2);
    return str.length > 1000 ? str.slice(0, 1000) + "..." : str;
  } catch {
    return "[Object]";
  }
}

/**
 * Truncates output if too large
 */
export function truncateOutput(output: unknown): unknown {
  const str = safeStringify(output);
  if (str.length > MAX_OUTPUT_SIZE) {
    return {
      __truncated: true,
      preview: str.slice(0, 1000),
      message: `Output truncated. Original size: ${str.length} characters`,
    };
  }
  return output;
}

/**
 * Execute code with timeout
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = MAX_EXECUTION_TIME,
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Execution timeout: exceeded ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

export { MAX_EXECUTION_TIME, MAX_OUTPUT_SIZE };
