/**
 * Split Transform Executor
 * Splits an array into individual items for separate processing
 * Similar to Loop but outputs all items at once
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";

interface SplitConfig {
  source: string; // Path to array
  mode: "items" | "chunks" | "batches";
  chunkSize?: number;
}

export async function executeSplit(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as SplitConfig;
  const { source, mode = "items", chunkSize = 10 } = config;

  if (!source) {
    return {
      success: false,
      output: null,
      error: "Source array is required",
    };
  }

  // Get the source array
  let sourceArray: unknown[];

  try {
    // Try interpolation first
    const interpolated = interpolate(`{{ ${source} }}`, context.interpolation);

    if (typeof interpolated === "string" && interpolated.startsWith("[")) {
      sourceArray = JSON.parse(interpolated);
    } else if (Array.isArray(interpolated)) {
      sourceArray = interpolated;
    } else {
      // Direct path resolution
      const parts = source.split(".");
      let current: unknown = context.interpolation;
      for (const part of parts) {
        if (current && typeof current === "object") {
          current = (current as Record<string, unknown>)[part];
        }
      }
      if (Array.isArray(current)) {
        sourceArray = current;
      } else {
        return {
          success: false,
          output: null,
          error: `Source "${source}" is not an array`,
        };
      }
    }
  } catch {
    return {
      success: false,
      output: null,
      error: `Failed to parse source array from "${source}"`,
    };
  }

  // Process based on mode
  let output: unknown;

  switch (mode) {
    case "items":
      // Each item becomes a separate output
      output = {
        items: sourceArray,
        count: sourceArray.length,
      };
      break;

    case "chunks":
    case "batches": {
      // Split into chunks of specified size
      const chunks: unknown[][] = [];
      for (let i = 0; i < sourceArray.length; i += chunkSize) {
        chunks.push(sourceArray.slice(i, i + chunkSize));
      }
      output = {
        chunks,
        chunkCount: chunks.length,
        totalItems: sourceArray.length,
      };
      break;
    }

    default:
      output = {
        items: sourceArray,
        count: sourceArray.length,
      };
  }

  return {
    success: true,
    output,
  };
}
