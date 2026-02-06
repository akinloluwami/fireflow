/**
 * Set Variable Transform Executor
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";

interface Variable {
  id: string;
  name: string;
  value: string;
}

interface SetVariableConfig {
  // New format: array of variables
  variables?: Variable[] | Record<string, string>;
  // Legacy format: single variable
  variableName?: string;
  value?: string;
}

export async function executeSetVariable(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as SetVariableConfig;
  const results: Record<string, unknown> = {};

  // Handle new array format
  if (config.variables) {
    const vars = config.variables;

    // Array of { id, name, value }
    if (Array.isArray(vars)) {
      for (const v of vars) {
        if (!v.name?.trim()) continue; // Skip empty names

        const interpolatedValue = interpolate(
          v.value || "",
          context.interpolation,
        );
        const parsedValue = tryParseJson(interpolatedValue);

        context.interpolation.variables[v.name.trim()] = parsedValue;
        results[v.name.trim()] = parsedValue;
      }
    }
    // Object format { name: value }
    else if (typeof vars === "object") {
      for (const [name, value] of Object.entries(vars)) {
        if (!name?.trim()) continue;

        const interpolatedValue = interpolate(
          value || "",
          context.interpolation,
        );
        const parsedValue = tryParseJson(interpolatedValue);

        context.interpolation.variables[name.trim()] = parsedValue;
        results[name.trim()] = parsedValue;
      }
    }
  }
  // Handle legacy single variable format
  else if (config.variableName) {
    const { variableName, value } = config;

    const interpolatedValue = interpolate(value || "", context.interpolation);
    const parsedValue = tryParseJson(interpolatedValue);

    context.interpolation.variables[variableName] = parsedValue;
    results[variableName] = parsedValue;
  }

  if (Object.keys(results).length === 0) {
    return {
      success: false,
      output: null,
      error: "No valid variables defined",
    };
  }

  return {
    success: true,
    output: results,
  };
}

function tryParseJson(value: string): unknown {
  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      return JSON.parse(value);
    } catch {
      // Keep as string if not valid JSON
    }
  }
  return value;
}
