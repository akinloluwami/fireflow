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

  console.log("[Slack] Sending message to channel:", channel);
  console.log("[Slack] Message content:", interpolatedMessage);

  try {
    // First, try to join the channel (in case bot isn't a member yet)
    const joinResponse = await fetch(
      "https://slack.com/api/conversations.join",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${slackToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ channel }),
      },
    );
    const joinData = await joinResponse.json();
    console.log(
      "[Slack] Join channel response:",
      joinData.ok ? "success" : joinData.error,
    );

    // Now send the message
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel,
        text: interpolatedMessage,
      }),
    });

    const data = await response.json();
    console.log("[Slack] API response:", JSON.stringify(data, null, 2));

    if (!data.ok) {
      console.error("[Slack] API error:", data.error, data);
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
