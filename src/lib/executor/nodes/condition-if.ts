/**
 * If-Else Condition Executor
 */

import type { WorkflowNode, ConditionConfig } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";

export async function executeIfElse(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as ConditionConfig;
  const { field, operator, value } = config;

  // Get the field value from trigger data or variables
  const fieldValue =
    context.interpolation.variables[field] ??
    context.interpolation.trigger[field];

  // Evaluate condition
  const result = evaluateCondition(fieldValue, operator, value);

  return {
    success: true,
    output: { evaluated: true, field, operator, value, fieldValue, result },
    conditionResult: result,
  };
}

function evaluateCondition(
  fieldValue: unknown,
  operator: ConditionConfig["operator"],
  compareValue: string,
): boolean {
  const strFieldValue = String(fieldValue ?? "");
  const numFieldValue = Number(fieldValue);
  const numCompareValue = Number(compareValue);

  switch (operator) {
    case "equals":
      return strFieldValue === compareValue;

    case "not-equals":
      return strFieldValue !== compareValue;

    case "contains":
      return strFieldValue.toLowerCase().includes(compareValue.toLowerCase());

    case "greater":
      return !isNaN(numFieldValue) && numFieldValue > numCompareValue;

    case "less":
      return !isNaN(numFieldValue) && numFieldValue < numCompareValue;

    default:
      return false;
  }
}
