/**
 * Text Summarization Executor
 */

import type {
  WorkflowNode,
  SummarizationConfig,
  ModelPickerNodeConfig,
} from "@/lib/workflow/types";
import type { ExecutionContext, NodeExecutionResult } from "../engine";
import { interpolate } from "../interpolate";
import { summarizeText } from "@/lib/integrations/summarization";

/**
 * Find the connected model picker node for an AI node
 */
function findConnectedModelPicker(
  node: WorkflowNode,
  context: ExecutionContext,
): WorkflowNode | undefined {
  const { allNodes, allEdges } = context;
  if (!allNodes || !allEdges) return undefined;

  const modelEdge = allEdges.find(
    (e) => e.target === node.id && e.targetHandle === "model",
  );
  if (!modelEdge) return undefined;

  return allNodes.find(
    (n) => n.id === modelEdge.source && n.subType === "model-picker",
  );
}

export async function executeSummarization(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const config = node.data.config as SummarizationConfig;

  const modelPickerNode = findConnectedModelPicker(node, context);
  const modelConfig = modelPickerNode?.data.config as
    | ModelPickerNodeConfig
    | undefined;

  const provider = modelConfig?.provider;
  const model = modelConfig?.model;
  const credentialId = modelConfig?.credentialId;

  if (!config.text) {
    return { success: false, output: null, error: "Text input is required" };
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

  const text = interpolate(config.text, context.interpolation);

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
    const result = await summarizeText({
      text,
      provider,
      model,
      apiKey: credential.apiKey as string,
      maxLength: config.maxLength,
      style: config.style,
      language: config.language,
    });

    return {
      success: true,
      output: {
        summary: result.summary,
        wordCount: result.wordCount,
        originalWordCount: result.originalWordCount,
        language: result.language,
        originalText: text,
      },
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : "Summarization failed",
    };
  }
}
