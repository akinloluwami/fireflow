/**
 * Code Executor
 * Executes JavaScript code in a sandboxed environment
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import {
  validateCode,
  createSandbox,
  truncateOutput,
  executeWithTimeout,
} from "../sandbox";

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

  // SECURITY: Validate code for dangerous patterns
  const validation = validateCode(code);
  if (!validation.valid) {
    return {
      success: false,
      output: null,
      error: `Security error: ${validation.error}`,
    };
  }

  try {
    // Build node outputs for easier access
    const nodeOutputs: Record<string, unknown> = {};
    for (const [nodeId, nodeData] of Object.entries(
      context.interpolation.nodes,
    )) {
      nodeOutputs[nodeId] = nodeData.output;
    }

    // Create secure sandbox
    const sandbox = createSandbox({
      trigger: context.interpolation.trigger,
      nodes: nodeOutputs,
      variables: context.interpolation.variables,
      loop: context.interpolation.loop,
    });

    // Create a function from the code
    // Using Function constructor with validated code
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;

    // Wrap the code to handle both explicit returns and expression results
    const wrappedCode = `
      "use strict";
      with (sandbox) {
        ${code}
      }
    `;

    const fn = new AsyncFunction("sandbox", wrappedCode);

    // Execute with timeout protection
    const result = await executeWithTimeout(async () => await fn(sandbox));

    // Update variables in context if the code set any
    Object.assign(context.interpolation.variables, sandbox.variables);

    return {
      success: true,
      output: truncateOutput(result ?? null),
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
