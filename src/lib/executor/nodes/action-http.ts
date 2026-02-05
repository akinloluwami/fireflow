/**
 * HTTP Request Executor
 */

import type { WorkflowNode, HttpRequestConfig } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate, interpolateDeep } from "../interpolate";

export async function executeHttp(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as HttpRequestConfig;
  const { method, url, headers, body, authentication } = config;

  if (!url) {
    return {
      success: false,
      output: null,
      error: "URL is required",
    };
  }

  // Interpolate URL and body
  const interpolatedUrl = interpolate(url, context.interpolation);
  const interpolatedBody = body
    ? interpolate(body, context.interpolation)
    : undefined;

  // Build headers
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers
      ? (interpolateDeep(headers, context.interpolation) as Record<
          string,
          string
        >)
      : {}),
  };

  // Handle authentication
  if (authentication === "bearer") {
    const extConfig = config as unknown as Record<string, unknown>;
    const token = extConfig.token as string;
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${interpolate(
        token,
        context.interpolation,
      )}`;
    }
  } else if (authentication === "api-key") {
    const extConfig = config as unknown as Record<string, unknown>;
    const apiKey = extConfig.apiKey as string;
    const apiKeyHeader = (extConfig.apiKeyHeader as string) || "X-API-Key";
    if (apiKey) {
      requestHeaders[apiKeyHeader] = interpolate(apiKey, context.interpolation);
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: requestHeaders,
    };

    if (interpolatedBody && method !== "GET") {
      fetchOptions.body = interpolatedBody;
    }

    const response = await fetch(interpolatedUrl, fetchOptions);
    const contentType = response.headers.get("content-type") || "";

    let responseData: unknown;
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      success: response.ok,
      output: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
      },
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : "HTTP request failed",
    };
  }
}
