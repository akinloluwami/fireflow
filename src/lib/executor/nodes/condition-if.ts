/**
 * If-Else Condition Executor
 */

import type { WorkflowNode, ConditionConfig } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import {
  resolveValue,
  type ExecutionContext as VariableResolverContext,
} from "@/lib/workflow/variable-resolver";

export async function executeIfElse(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as ConditionConfig;
  const { field, operator, value } = config;

  // Build context for variable resolver
  const resolverContext: VariableResolverContext = {
    trigger: {
      type: "webhook",
      ...context.triggerData,
    },
    nodes: Object.fromEntries(
      Object.entries(context.interpolation.nodes || {}).map(
        ([nodeId, nodeData]) => [
          nodeId,
          { output: nodeData.output, executedAt: new Date().toISOString() },
        ],
      ),
    ),
    execution: {
      id: context.executionId,
      workflowId: context.workflowId,
      startedAt: new Date().toISOString(),
      status: "running",
    },
  };

  // Resolve the field value using variable resolver (handles {{ trigger.body.amount }} etc.)
  const fieldValue = resolveValue(field, resolverContext);

  // Also resolve the compare value in case it contains variables
  const compareValue = resolveValue(value || "", resolverContext);

  // Evaluate condition
  const result = evaluateCondition(fieldValue, operator, String(compareValue));

  return {
    success: true,
    output: { evaluated: true, field, operator, value, fieldValue, result },
    conditionResult: result,
  };
}

function evaluateCondition(
  fieldValue: unknown,
  operator: string,
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

    case "not-contains":
      return !strFieldValue.toLowerCase().includes(compareValue.toLowerCase());

    case "greater":
      return !isNaN(numFieldValue) && numFieldValue > numCompareValue;

    case "greater-or-equal":
      return !isNaN(numFieldValue) && numFieldValue >= numCompareValue;

    case "less":
      return !isNaN(numFieldValue) && numFieldValue < numCompareValue;

    case "less-or-equal":
      return !isNaN(numFieldValue) && numFieldValue <= numCompareValue;

    case "is-empty":
      return (
        fieldValue === null || fieldValue === undefined || strFieldValue === ""
      );

    case "is-not-empty":
      return (
        fieldValue !== null && fieldValue !== undefined && strFieldValue !== ""
      );

    case "starts-with":
      return strFieldValue.toLowerCase().startsWith(compareValue.toLowerCase());

    case "ends-with":
      return strFieldValue.toLowerCase().endsWith(compareValue.toLowerCase());

    case "regex":
      try {
        const regex = new RegExp(compareValue);
        return regex.test(strFieldValue);
      } catch {
        return false;
      }

    default:
      return false;
  }
}
