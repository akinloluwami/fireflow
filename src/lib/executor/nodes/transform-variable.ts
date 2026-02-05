/**
 * Set Variable Transform Executor
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";

interface SetVariableConfig {
  variableName: string;
  value: string;
}

export async function executeSetVariable(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as SetVariableConfig;
  const { variableName, value } = config;

  if (!variableName) {
    return {
      success: false,
      output: null,
      error: "Variable name is required",
    };
  }

  // Interpolate the value
  const interpolatedValue = interpolate(value || "", context.interpolation);

  // Try to parse as JSON if it looks like JSON
  let parsedValue: unknown = interpolatedValue;
  if (interpolatedValue.startsWith("{") || interpolatedValue.startsWith("[")) {
    try {
      parsedValue = JSON.parse(interpolatedValue);
    } catch {
      // Keep as string if not valid JSON
    }
  }

  // Set the variable in context
  context.interpolation.variables[variableName] = parsedValue;

  return {
    success: true,
    output: {
      variableName,
      value: parsedValue,
    },
  };
}
