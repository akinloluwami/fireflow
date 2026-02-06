/**
 * Filter Transform Executor
 * Filters array items based on a condition
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";

interface FilterConfig {
  source: string; // Variable path to the array, e.g., "trigger.items"
  field: string; // Field to check on each item
  operator: string; // Comparison operator
  value: string; // Value to compare against
}

export async function executeFilter(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as FilterConfig;
  const { source, field, operator, value } = config;

  if (!source) {
    return {
      success: false,
      output: null,
      error: "Source array is required",
    };
  }

  // Get the source array
  const interpolatedSource = interpolate(
    `{{ ${source} }}`,
    context.interpolation,
  );
  let sourceArray: unknown[];

  try {
    // Try to parse if it's a JSON string
    if (
      typeof interpolatedSource === "string" &&
      interpolatedSource.startsWith("[")
    ) {
      sourceArray = JSON.parse(interpolatedSource);
    } else if (Array.isArray(interpolatedSource)) {
      sourceArray = interpolatedSource;
    } else {
      // Try to get from context directly
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

  // Interpolate the comparison value
  const interpolatedValue = interpolate(value || "", context.interpolation);

  // Filter the array
  const filtered = sourceArray.filter((item) => {
    if (item === null || item === undefined) return false;

    // Get the field value from the item
    let itemValue: unknown = item;
    if (field) {
      const fieldParts = field.split(".");
      for (const part of fieldParts) {
        if (itemValue && typeof itemValue === "object") {
          itemValue = (itemValue as Record<string, unknown>)[part];
        } else {
          itemValue = undefined;
          break;
        }
      }
    }

    // Compare based on operator
    switch (operator) {
      case "equals":
        return String(itemValue) === interpolatedValue;
      case "not_equals":
        return String(itemValue) !== interpolatedValue;
      case "contains":
        return String(itemValue).includes(interpolatedValue);
      case "not_contains":
        return !String(itemValue).includes(interpolatedValue);
      case "greater_than":
        return Number(itemValue) > Number(interpolatedValue);
      case "less_than":
        return Number(itemValue) < Number(interpolatedValue);
      case "greater_or_equal":
        return Number(itemValue) >= Number(interpolatedValue);
      case "less_or_equal":
        return Number(itemValue) <= Number(interpolatedValue);
      case "is_empty":
        return (
          !itemValue || (typeof itemValue === "string" && !itemValue.trim())
        );
      case "is_not_empty":
        return (
          !!itemValue &&
          (typeof itemValue !== "string" || itemValue.trim().length > 0)
        );
      case "starts_with":
        return String(itemValue).startsWith(interpolatedValue);
      case "ends_with":
        return String(itemValue).endsWith(interpolatedValue);
      case "matches_regex":
        try {
          const regex = new RegExp(interpolatedValue);
          return regex.test(String(itemValue));
        } catch {
          return false;
        }
      default:
        return true;
    }
  });

  return {
    success: true,
    output: {
      items: filtered,
      count: filtered.length,
      originalCount: sourceArray.length,
    },
  };
}
