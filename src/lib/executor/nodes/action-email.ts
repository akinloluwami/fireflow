/**
 * Email Executor (using Resend)
 */

import type { WorkflowNode, SendEmailConfig } from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";

export async function executeEmail(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as SendEmailConfig;
  const { to, subject, body, from } = config;

  if (!to || !subject || !body) {
    return {
      success: false,
      output: null,
      error: "To, subject, and body are required",
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return {
      success: false,
      output: null,
      error: "Email service not configured (RESEND_API_KEY missing)",
    };
  }

  // Interpolate all fields
  const interpolatedTo = interpolate(to, context.interpolation);
  const interpolatedSubject = interpolate(subject, context.interpolation);
  const interpolatedBody = interpolate(body, context.interpolation);
  const interpolatedFrom = from
    ? interpolate(from, context.interpolation)
    : "FireFlow <noreply@fireflow.run>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: interpolatedFrom,
        to: interpolatedTo.split(",").map((e) => e.trim()),
        subject: interpolatedSubject,
        html: interpolatedBody,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        output: data,
        error: data.message || "Failed to send email",
      };
    }

    return {
      success: true,
      output: {
        id: data.id,
        to: interpolatedTo,
        subject: interpolatedSubject,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : "Email sending failed",
    };
  }
}
