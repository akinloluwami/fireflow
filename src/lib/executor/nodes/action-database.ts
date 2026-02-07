/**
 * Database Query Executor
 * Supports PostgreSQL with credential-based or connection string authentication
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/credentials/encryption";
import type { PostgresCredentialData } from "@/lib/credentials/types";

export interface DatabaseQueryConfig {
  databaseType: "postgresql";
  connectionString?: string;
  credentialId?: string;
  query: string;
  params?: unknown[];
  timeout?: number;
  maxRows?: number;
}

interface QueryResult {
  rows: unknown[];
  rowCount: number;
  command: string;
  affectedRows: number;
  success: boolean;
}

/**
 * Build a PostgreSQL connection string from credential data
 * Returns the connectionString directly if provided, otherwise builds from individual fields
 */
function buildConnectionString(cred: PostgresCredentialData): string {
  // If a connection string is directly provided, use it
  if (cred.connectionString) {
    return cred.connectionString;
  }

  // Otherwise build from individual fields
  const { host, port, database, user, password, ssl } = cred;
  if (!host || !port || !database || !user || !password) {
    throw new Error("Missing required connection fields");
  }
  const sslParam = ssl ? "?sslmode=require" : "";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}${sslParam}`;
}

/**
 * Fetch and decrypt a credential by ID for a specific user
 */
async function fetchCredential(
  credentialId: string,
  userId: string,
): Promise<PostgresCredentialData | null> {
  const result = await db
    .select()
    .from(credentials)
    .where(
      and(eq(credentials.id, credentialId), eq(credentials.userId, userId)),
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const credential = result[0];

  if (credential.type !== "postgres") {
    throw new Error(`Expected postgres credential, got ${credential.type}`);
  }

  return decrypt<PostgresCredentialData>(credential.encryptedData);
}

export async function executeDatabase(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as DatabaseQueryConfig;
  const { connectionString, credentialId, query, params, timeout, maxRows } =
    config;

  // Validate: need either credentialId or connectionString
  if (!credentialId && !connectionString) {
    return {
      success: false,
      output: null,
      error: "Either a credential or connection string is required",
    };
  }

  if (!query) {
    return {
      success: false,
      output: null,
      error: "Query is required",
    };
  }

  // Determine the connection string to use
  let finalConnectionString: string;

  try {
    if (credentialId) {
      // Fetch credential from database
      const userId = context.userId;
      if (!userId) {
        return {
          success: false,
          output: null,
          error: "User context required for credential-based connection",
        };
      }

      const credData = await fetchCredential(credentialId, userId);
      if (!credData) {
        return {
          success: false,
          output: null,
          error: "Credential not found or access denied",
        };
      }

      finalConnectionString = buildConnectionString(credData);
    } else {
      // Use provided connection string, interpolated with context
      finalConnectionString = interpolate(
        connectionString!,
        context.interpolation,
      );
    }
  } catch (error) {
    return {
      success: false,
      output: null,
      error:
        error instanceof Error ? error.message : "Failed to resolve connection",
    };
  }

  // Interpolate query with context
  const interpolatedQuery = interpolate(query, context.interpolation);

  try {
    // Dynamic import for postgres
    const { default: postgres } = await import("postgres");
    const sql = postgres(finalConnectionString, {
      connect_timeout: timeout ? Math.floor(timeout / 1000) : 30,
      max: 1, // Single connection for workflow execution
    });

    try {
      const result = await sql.unsafe(
        interpolatedQuery,
        (params || []) as never[],
      );

      const command =
        interpolatedQuery.trim().split(/\s+/)[0]?.toUpperCase() || "QUERY";
      const isWriteOperation = ["INSERT", "UPDATE", "DELETE"].includes(command);

      // Apply maxRows limit if specified
      const rawRows = Array.isArray(result) ? [...result] : [];
      const rows =
        maxRows && rawRows.length > maxRows
          ? rawRows.slice(0, maxRows)
          : rawRows;

      const queryResult: QueryResult = {
        rows,
        rowCount: isWriteOperation ? (result.count ?? 0) : rows.length,
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
