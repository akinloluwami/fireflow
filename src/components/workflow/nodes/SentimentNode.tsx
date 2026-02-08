import { memo } from "react";
import { FlowNode } from "./FlowNode";
import type { NodeData } from "@/lib/workflow/types";

interface SentimentNodeProps {
  id: string;
  data: NodeData & { icon?: string };
  selected?: boolean;
}

function SentimentNodeComponent({ id, data, selected }: SentimentNodeProps) {
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
    />
  );
}

export const SentimentNode = memo(SentimentNodeComponent);
