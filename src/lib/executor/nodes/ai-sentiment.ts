/**
 * Sentiment Analysis Executor
 */

import type {
  WorkflowNode,
  SentimentAnalysisConfig,
  ModelPickerNodeConfig,
} from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";
import { analyzeSentiment } from "@/lib/integrations/sentiment";

/**
 * Find the connected model picker node for an AI node
 */
function findConnectedModelPicker(
  node: WorkflowNode,
  context: ExecutionContext,
): WorkflowNode | undefined {
  const { allNodes, allEdges } = context;
  if (!allNodes || !allEdges) return undefined;

  // Find edges where this node's "model" handle is the target
  const modelEdge = allEdges.find(
    (e) => e.target === node.id && e.targetHandle === "model",
  );

  if (!modelEdge) return undefined;

  // Find the source node (should be a model-picker)
  return allNodes.find(
    (n) => n.id === modelEdge.source && n.subType === "model-picker",
  );
}

export async function executeSentimentAnalysis(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as SentimentAnalysisConfig;

  // Find connected model picker node
  const modelPickerNode = findConnectedModelPicker(node, context);

  // Get model config from connected model picker
  const modelConfig = modelPickerNode?.data.config as
    | ModelPickerNodeConfig
    | undefined;

  const provider = modelConfig?.provider;
  const model = modelConfig?.model;
  const credentialId = modelConfig?.credentialId;

  // Validate required fields
  if (!config.text) {
    return {
      success: false,
      output: null,
      error: "Text input is required",
    };
  }

  if (!provider) {
    return {
      success: false,
      output: null,
      error:
        "AI provider is required. Connect an AI Model node to the Model input.",
    };
  }

  if (!model) {
    return {
      success: false,
      output: null,
      error: "Model is required. Connect an AI Model node to the Model input.",
    };
  }

  // Interpolate text with variables
  const text = interpolate(config.text, context.interpolation);

  // Get credentials if specified
  const credential = credentialId
    ? context.interpolation.credentials?.[credentialId]
    : null;

  if (!credential?.apiKey) {
    return {
      success: false,
      output: null,
      error: `API key credential is required for ${provider}. Configure it in the connected AI Model node.`,
    };
  }

  try {
    const result = await analyzeSentiment({
      text,
      provider,
      model,
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
