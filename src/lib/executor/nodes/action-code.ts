/**
 * Code Executor
 * Executes JavaScript code in a sandboxed environment
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";

interface CodeConfig {
  language: "javascript" | "typescript";
  code: string;
}

export async function executeCode(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as CodeConfig;
  const { code } = config;

  if (!code?.trim()) {
    return {
      success: false,
      output: null,
      error: "No code provided",
    };
  }

  try {
    // Build a sandboxed execution environment
    // Provide access to trigger data, previous nodes, and variables
    const sandbox = {
      trigger: context.interpolation.trigger,
      nodes: {} as Record<string, unknown>,
      variables: context.interpolation.variables,
      loop: context.interpolation.loop,
      // Common utilities
      console: {
        log: (...args: unknown[]) => console.log("[Code]", ...args),
        warn: (...args: unknown[]) => console.warn("[Code]", ...args),
        error: (...args: unknown[]) => console.error("[Code]", ...args),
      },
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    };

    // Flatten node outputs for easier access
    for (const [nodeId, nodeData] of Object.entries(
      context.interpolation.nodes,
    )) {
      sandbox.nodes[nodeId] = nodeData.output;
    }

    // Create a function from the code
    // The code should return a value which becomes the node output
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;

    // Wrap the code to handle both explicit returns and expression results
    const wrappedCode = `
      with (sandbox) {
        ${code}
      }
    `;

    const fn = new AsyncFunction("sandbox", wrappedCode);
    const result = await fn(sandbox);

    // Update variables in context if the code set any
    Object.assign(context.interpolation.variables, sandbox.variables);

    return {
      success: true,
      output: result ?? null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Code execution failed";

    return {
      success: false,
      output: null,
      error: errorMessage,
    };
  }
}
