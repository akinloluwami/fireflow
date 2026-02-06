/**
 * Switch Node Executor
 * Routes to different branches based on matching case values
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import {
  resolveValue,
  type ExecutionContext as VariableResolverContext,
} from "@/lib/workflow/variable-resolver";

interface SwitchCase {
  id: string;
  value: string;
  label?: string;
}

interface SwitchConfig {
  field: string;
  cases: SwitchCase[];
  hasDefault?: boolean;
}

export async function executeSwitch(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as SwitchConfig;
  const { field, cases, hasDefault } = config;

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

  // Resolve the field value
  const fieldValue = resolveValue(field, resolverContext);
  const stringValue = String(fieldValue ?? "");

  // Find matching case
  let matchedCase: SwitchCase | null = null;
  let matchedIndex = -1;

  for (let i = 0; i < cases.length; i++) {
    const caseItem = cases[i];
    // Resolve case value in case it contains variables
    const caseValue = String(
      resolveValue(caseItem.value, resolverContext) ?? "",
    );

    if (stringValue === caseValue) {
      matchedCase = caseItem;
      matchedIndex = i;
      break;
    }
  }

  // Determine which branch to take
  const branchId = matchedCase ? matchedCase.id : hasDefault ? "default" : null;

  return {
    success: true,
    output: {
      field,
      fieldValue,
      matchedCase: matchedCase?.value ?? null,
      matchedLabel:
        matchedCase?.label ?? (hasDefault && !matchedCase ? "Default" : null),
      matchedIndex,
      branchId,
    },
    // For switch nodes, we use switchResult instead of conditionResult
    switchResult: branchId,
  };
}
