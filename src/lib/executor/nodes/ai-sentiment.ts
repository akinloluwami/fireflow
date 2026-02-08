/**
 * Sentiment Analysis Executor
 */

import type {
  WorkflowNode,
  SentimentAnalysisConfig,
} from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";
import { analyzeSentiment } from "@/lib/integrations/sentiment";

export async function executeSentimentAnalysis(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as SentimentAnalysisConfig;

  // Validate required fields
  if (!config.text) {
    return {
      success: false,
      output: null,
      error: "Text input is required",
    };
  }

  if (!config.provider) {
    return {
      success: false,
      output: null,
      error: "AI provider is required",
    };
  }

  if (!config.model) {
    return {
      success: false,
      output: null,
      error: "Model is required",
    };
  }

  // Interpolate text with variables
  const text = interpolate(config.text, context.interpolation);

  // Get credentials if specified
  const credential = config.credentialId
    ? context.interpolation.credentials?.[config.credentialId]
    : null;

  if (!credential?.apiKey) {
    return {
      success: false,
      output: null,
      error: `API key credential is required for ${config.provider}`,
    };
  }

  try {
    const result = await analyzeSentiment({
      text,
      provider: config.provider,
      model: config.model,
      apiKey: credential.apiKey as string,
      language: config.language,
      includeEmotions: config.includeEmotions,
    });

    // Check confidence threshold
    const threshold = config.confidenceThreshold ?? 0.5;
    const meetsThreshold = result.confidence >= threshold;

    // Determine which branch to take - map "mixed" to the highest score
    let sentimentBranch: "positive" | "neutral" | "negative";
    if (result.sentiment === "mixed") {
      sentimentBranch =
        result.scores.positive >= result.scores.negative &&
        result.scores.positive >= result.scores.neutral
          ? "positive"
          : result.scores.negative >= result.scores.neutral
            ? "negative"
            : "neutral";
    } else if (
      result.sentiment === "positive" ||
      result.sentiment === "neutral" ||
      result.sentiment === "negative"
    ) {
      sentimentBranch = result.sentiment;
    } else {
      // Fallback based on scores
      sentimentBranch =
        result.scores.positive >= result.scores.negative &&
        result.scores.positive >= result.scores.neutral
          ? "positive"
          : result.scores.negative >= result.scores.neutral
            ? "negative"
            : "neutral";
    }

    return {
      success: true,
      output: {
        sentiment: result.sentiment,
        confidence: result.confidence,
        scores: result.scores,
        emotions: result.emotions,
        analyzedText: text,
        language: result.language,
        meetsThreshold,
      },
      sentimentResult: sentimentBranch,
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error:
        error instanceof Error ? error.message : "Sentiment analysis failed",
    };
  }
}
