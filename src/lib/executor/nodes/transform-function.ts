/**
 * Function/Transform Executor
 * Transforms data using a JavaScript expression
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import {
  validateCode,
  createSandbox,
  truncateOutput,
  executeWithTimeout,
} from "../sandbox";

interface FunctionConfig {
  expression: string;
}

export async function executeFunction(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as FunctionConfig;
  const { expression } = config;

  if (!expression?.trim()) {
    return {
      success: false,
      output: null,
      error: "No expression provided",
    };
  }

  // SECURITY: Validate expression for dangerous patterns
  const validation = validateCode(expression);
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

    // Evaluate the expression
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;

    const fn = new AsyncFunction(
      "sandbox",
      `"use strict"; with (sandbox) { return ${expression}; }`,
    );

    // Execute with timeout protection
    const result = await executeWithTimeout(async () => await fn(sandbox));

    return {
      success: true,
      output: truncateOutput(result),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Expression evaluation failed";

    return {
      success: false,
      output: null,
      error: errorMessage,
    };
  }
}
