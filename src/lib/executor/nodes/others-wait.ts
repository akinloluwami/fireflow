/**
 * Wait/Delay Node Executor
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";

interface WaitConfig {
  duration: number;
  unit: "ms" | "s" | "m" | "h";
}

export async function executeWait(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as WaitConfig;
  const { duration, unit } = config;

  if (!duration || duration <= 0) {
    return {
      success: true,
      output: { waited: 0, skipped: true },
    };
  }

  // Convert duration to milliseconds
  let durationMs = duration;
  switch (unit) {
    case "s":
      durationMs = duration * 1000;
      break;
    case "m":
      durationMs = duration * 60 * 1000;
      break;
    case "h":
      durationMs = duration * 60 * 60 * 1000;
      break;
    case "ms":
    default:
      durationMs = duration;
  }

  // Cap at 5 minutes for safety in testing
  const maxWait = 5 * 60 * 1000;
  const actualWait = Math.min(durationMs, maxWait);

  // Wait for the duration
  await new Promise((resolve) => setTimeout(resolve, actualWait));

  return {
    success: true,
    output: {
      waited: actualWait,
      unit: "ms",
      requestedDuration: duration,
      requestedUnit: unit,
    },
  };
}
