/**
 * Database Query Executor
 * Supports PostgreSQL
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";

export interface DatabaseQueryConfig {
  databaseType: "postgresql";
  connectionString: string;
  query: string;
  params?: unknown[];
}

interface QueryResult {
  rows: unknown[];
  rowCount: number;
  command: string;
  affectedRows: number;
  success: boolean;
}

export async function executeDatabase(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as DatabaseQueryConfig;
  const { connectionString, query, params } = config;

  if (!connectionString) {
    return {
      success: false,
      output: null,
      error: "Connection string is required",
    };
  }

  if (!query) {
    return {
      success: false,
      output: null,
      error: "Query is required",
    };
  }

  // Interpolate connection string and query with context
  const interpolatedConnectionString = interpolate(
    connectionString,
    context.interpolation,
  );
  const interpolatedQuery = interpolate(query, context.interpolation);

  try {
    // Dynamic import for postgres
    const { default: postgres } = await import("postgres");
    const sql = postgres(interpolatedConnectionString);

    try {
      const result = await sql.unsafe(
        interpolatedQuery,
        (params || []) as never[],
      );

      const command =
        interpolatedQuery.trim().split(/\s+/)[0]?.toUpperCase() || "QUERY";
      const isWriteOperation = ["INSERT", "UPDATE", "DELETE"].includes(command);

      const queryResult: QueryResult = {
        rows: Array.isArray(result) ? result : [],
        rowCount: isWriteOperation
          ? (result.count ?? 0)
          : Array.isArray(result)
            ? result.length
            : 0,
        command,
        affectedRows: result.count ?? 0,
        success: true,
      };

      return {
        success: true,
        output: queryResult,
      };
    } finally {
      await sql.end();
    }
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : "Database query failed",
    };
  }
}
