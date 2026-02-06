/**
 * Function/Transform Executor
 * Transforms data using a JavaScript expression
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";

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

  try {
    // Build execution context
    const sandbox = {
      trigger: context.interpolation.trigger,
      nodes: {} as Record<string, unknown>,
      variables: context.interpolation.variables,
      loop: context.interpolation.loop,
      // Utilities
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

    // Flatten node outputs
    for (const [nodeId, nodeData] of Object.entries(
      context.interpolation.nodes,
    )) {
      sandbox.nodes[nodeId] = nodeData.output;
    }

    // Evaluate the expression
    // For simple expressions like "trigger.items.map(i => i.name)"
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;

    const fn = new AsyncFunction(
      "sandbox",
      `with (sandbox) { return ${expression}; }`,
    );
    const result = await fn(sandbox);

    return {
      success: true,
      output: result,
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
