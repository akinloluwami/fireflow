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
  const { method, url, headers, body, authentication, authCredentialId } =
    config;

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

  // Handle authentication using credentials
  if (authentication && authentication !== "none" && authCredentialId) {
    const credential = context.interpolation.credentials?.[authCredentialId];

    if (credential) {
      if (authentication === "bearer") {
        const token = credential.token as string;
        if (token) {
          requestHeaders["Authorization"] = `Bearer ${token}`;
        }
      } else if (authentication === "api_key") {
        const key = credential.key as string;
        const value = credential.value as string;
        const addTo = credential.addTo as string;

        if (key && value) {
          if (addTo === "header") {
            requestHeaders[key] = value;
          }
          // For query params, we'll append to URL below
        }
      } else if (authentication === "basic") {
        const username = credential.username as string;
        const password = credential.password as string;
        if (username && password) {
          const encoded = Buffer.from(`${username}:${password}`).toString(
            "base64",
          );
          requestHeaders["Authorization"] = `Basic ${encoded}`;
        }
      }
    }
  }

  // Handle API key in query params
  let finalUrl = interpolatedUrl;
  if (authentication === "api_key" && authCredentialId) {
    const credential = context.interpolation.credentials?.[authCredentialId];
    if (credential && credential.addTo === "query") {
      const key = credential.key as string;
      const value = credential.value as string;
      if (key && value) {
        const separator = finalUrl.includes("?") ? "&" : "?";
        finalUrl = `${finalUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
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

    const response = await fetch(finalUrl, fetchOptions);
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
