/**
 * Slack Message Executor
 */

import type { WorkflowNode, SendSlackConfig } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { getIntegrationToken } from "../engine";
import { interpolate } from "../interpolate";

export async function executeSlack(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as SendSlackConfig;
  const { channel, message } = config;

  if (!channel || !message) {
    return {
      success: false,
      output: null,
      error: "Channel and message are required",
    };
  }

  // Get Slack token from user's integrations
  const slackToken = await getIntegrationToken(context.userId, "slack");

  if (!slackToken) {
    return {
      success: false,
      output: null,
      error: "Slack not connected. Please connect Slack in settings.",
    };
  }

  // Interpolate variables in message
  const interpolatedMessage = interpolate(message, context.interpolation);

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        text: interpolatedMessage,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return {
        success: false,
        output: data,
        error: data.error || "Failed to send Slack message",
      };
    }

    return {
      success: true,
      output: {
        channel: data.channel,
        ts: data.ts,
        message: interpolatedMessage,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : "Slack API error",
    };
  }
}
