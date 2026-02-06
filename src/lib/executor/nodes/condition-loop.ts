/**
 * Loop Node Executor
 * Iterates over an array, executing downstream nodes for each item
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import {
  resolveValue,
  type ExecutionContext as VariableResolverContext,
} from "@/lib/workflow/variable-resolver";

interface LoopConfig {
  items: string;
  itemVariable?: string;
  indexVariable?: string;
  maxIterations?: number;
}

export interface LoopIterationContext {
  item: unknown;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
}

export async function executeLoop(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as LoopConfig;
  const {
    items: itemsExpression,
    itemVariable = "item",
    indexVariable = "index",
    maxIterations = 100,
  } = config;

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

  // Resolve the items array
  const resolvedItems = resolveValue(itemsExpression, resolverContext);

  // Validate it's an array
  if (!Array.isArray(resolvedItems)) {
    return {
      success: false,
      output: null,
      error: `Loop items must be an array, got ${typeof resolvedItems}`,
    };
  }

  // Apply max iterations limit
  const safeMaxIterations = Math.min(maxIterations, 1000);
  const itemsToProcess = resolvedItems.slice(0, safeMaxIterations);
  const wasLimited = resolvedItems.length > safeMaxIterations;

  // Generate loop iterations (the actual iteration happens in the engine)
  const iterations: LoopIterationContext[] = itemsToProcess.map(
    (item, index) => ({
      item,
      index,
      total: itemsToProcess.length,
      isFirst: index === 0,
      isLast: index === itemsToProcess.length - 1,
    }),
  );

  return {
    success: true,
    output: {
      iterations,
      totalItems: resolvedItems.length,
      processedItems: itemsToProcess.length,
      wasLimited,
      itemVariable,
      indexVariable,
    },
    // Special property for the executor to handle loop iterations
    loopIterations: iterations,
  };
}

/**
 * Build the loop context that will be available inside the loop body
 */
export function buildLoopContext(
  iteration: LoopIterationContext,
  itemVariable: string,
  indexVariable: string,
): Record<string, unknown> {
  return {
    loop: {
      [itemVariable]: iteration.item,
      [indexVariable]: iteration.index,
      item: iteration.item,
      index: iteration.index,
      total: iteration.total,
      isFirst: iteration.isFirst,
      isLast: iteration.isLast,
    },
  };
}
