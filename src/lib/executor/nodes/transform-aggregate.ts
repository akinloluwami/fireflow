/**
 * Aggregate Transform Executor
 * Combines multiple items/values into a single output
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";

interface AggregateConfig {
  source: string; // Path to array or data
  operation:
    | "array"
    | "sum"
    | "count"
    | "average"
    | "min"
    | "max"
    | "first"
    | "last"
    | "concat"
    | "unique";
  field?: string; // Optional field to aggregate on
}

export async function executeAggregate(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as AggregateConfig;
  const { source, operation = "array", field } = config;

  if (!source) {
    return {
      success: false,
      output: null,
      error: "Source is required",
    };
  }

  // Get the source data
  let sourceData: unknown[];

  try {
    const interpolated = interpolate(`{{ ${source} }}`, context.interpolation);

    if (typeof interpolated === "string" && interpolated.startsWith("[")) {
      sourceData = JSON.parse(interpolated);
    } else if (Array.isArray(interpolated)) {
      sourceData = interpolated;
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
        sourceData = current;
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
      error: `Failed to parse source from "${source}"`,
    };
  }

  // Extract field values if specified
  const getValues = (): unknown[] => {
    if (!field) return sourceData;
    return sourceData.map((item) => {
      if (item && typeof item === "object") {
        const parts = field.split(".");
        let current: unknown = item;
        for (const part of parts) {
          if (current && typeof current === "object") {
            current = (current as Record<string, unknown>)[part];
          }
        }
        return current;
      }
      return item;
    });
  };

  const values = getValues();
  let result: unknown;

  switch (operation) {
    case "array":
      result = values;
      break;

    case "sum":
      result = values.reduce((acc: number, v) => acc + (Number(v) || 0), 0);
      break;

    case "count":
      result = values.length;
      break;

    case "average": {
      const numValues = values.map((v) => Number(v) || 0);
      result =
        numValues.length > 0
          ? numValues.reduce((a, b) => a + b, 0) / numValues.length
          : 0;
      break;
    }

    case "min":
      result = Math.min(...values.map((v) => Number(v) || Infinity));
      break;

    case "max":
      result = Math.max(...values.map((v) => Number(v) || -Infinity));
      break;

    case "first":
      result = values[0];
      break;

    case "last":
      result = values[values.length - 1];
      break;

    case "concat":
      result = values.join("");
      break;

    case "unique":
      result = [
        ...new Set(
          values.map((v) => (typeof v === "object" ? JSON.stringify(v) : v)),
        ),
      ].map((v) => {
        try {
          return JSON.parse(v as string);
        } catch {
          return v;
        }
      });
      break;

    default:
      result = values;
  }

  return {
    success: true,
    output: {
      result,
      inputCount: sourceData.length,
      operation,
    },
  };
}
