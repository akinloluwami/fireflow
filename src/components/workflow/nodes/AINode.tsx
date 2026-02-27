import { memo } from "react";
import { FlowNode } from "./FlowNode";
import type { NodeData } from "@/lib/workflow/types";

interface AINodeProps {
  id: string;
  data: NodeData & { icon?: string; subType?: string };
  selected?: boolean;
}

function AINodeComponent({ id, data, selected }: AINodeProps) {
  const inputHandles = [{ id: "model", label: "Model", required: true }];

  // Sentiment analysis has branching output handles
  if (data.subType === "sentiment-analysis") {
    const outputHandles = [
      { id: "positive", label: "Positive", color: "#10b981" },
      { id: "neutral", label: "Neutral", color: "#6b7280" },
      { id: "negative", label: "Negative", color: "#ef4444" },
    ];

    return (
      <FlowNode
        id={id}
        data={data}
        selected={selected}
        type="ai"
        color="#ec4899"
        hasInputHandle={true}
        hasOutputHandle={false}
        outputHandles={outputHandles}
        inputHandles={inputHandles}
        showLabelInside={true}
      />
    );
  }

  // Default AI node (summarization, etc.) - single output
  return (
    <FlowNode
      id={id}
      data={data}
      selected={selected}
      type="ai"
      color="#ec4899"
      hasInputHandle={true}
      hasOutputHandle={true}
      inputHandles={inputHandles}
      showLabelInside={true}
    />
  );
}

export const AINode = memo(AINodeComponent);
