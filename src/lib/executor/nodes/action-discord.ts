/**
 * Discord Message Executor
 */

import type { WorkflowNode } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";

interface SendDiscordConfig {
  guildId: string;
  channelId: string;
  message: string;
}

export async function executeDiscord(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as unknown as SendDiscordConfig;
  const { channelId, message } = config;

  if (!channelId || !message) {
    return {
      success: false,
      output: null,
      error: "Channel and message are required",
    };
  }

  // Get Discord bot token from environment (app-wide, not per-user)
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!botToken) {
    return {
      success: false,
      output: null,
      error: "Discord bot not configured",
    };
  }

  // Interpolate variables in message
  const interpolatedMessage = interpolate(message, context.interpolation);

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: interpolatedMessage,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        output: data,
        error: data.message || "Failed to send Discord message",
      };
    }

    return {
      success: true,
      output: {
        channelId: data.channel_id,
        messageId: data.id,
        message: interpolatedMessage,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : "Discord API error",
    };
  }
}
